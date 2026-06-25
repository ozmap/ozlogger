import { LogWrapper } from './util/type/LogWrapper';
import { AbstractLogger } from './util/type/AbstractLogger';
import {
	LogMethod,
	AuditMethod,
	LoggerMethods
} from './util/interface/LoggerMethods';
import { LogContext } from './util/interface/LogContext';
import { LogLevels } from './util/enum/LogLevels';
import { LevelTag } from './util/enum/LevelTags';
import { Server } from 'http';
import { getLogWrapper } from './format';
import { registerEvent } from './util/Events';
import { setupLogServer } from './http/server';
import {
	level,
	output,
	host,
	getProcessInformation,
	getCircularReplacer,
	isJsonObject
} from './util/Helpers';
import { auditId, splitAuditBody, SAFE_LINE_BYTES } from './util/AuditChunk';
import { context, trace } from '@opentelemetry/api';

/**
 * Default timer TTL in milliseconds (10 minutes).
 */
const DEFAULT_TIMER_TTL = 600000;

/**
 * Default timer cleanup interval in milliseconds (1 minute).
 */
const DEFAULT_TIMER_GC_INTERVAL = 60000;

/**
 * Logger module class.
 */
export class Logger implements LoggerMethods {
	/**
	 * Temporary storage for timers.
	 */
	private timers = new Map<string, number>();

	/**
	 * Temporary storage for timeouts.
	 */
	private timeouts = new Map<string, NodeJS.Timeout>();

	/**
	 * Timer garbage collector interval reference.
	 */
	private timerGc: NodeJS.Timeout | null = null;

	/**
	 * TTL for timers in milliseconds.
	 */
	private timerTTL: number;

	/**
	 * Stores the logger wrapper being used.
	 */
	protected logger: LogWrapper;

	/**
	 * Stores the HTTP server used to issue commands for the logger.
	 */
	public server: Server | void;

	/**
	 * Stores the logger's contextual information.
	 */
	private context: LogContext;

	/**
	 * Stores the event unregister function reference for cleanup.
	 */
	private unregisterChangeLevelHandler: (() => void) | null = null;

	/**
	 * Logger module class constructor.
	 *
	 * @param   opts             Logger module configuration options.
	 * @param   opts.tag         Tag with which the logger is being created.
	 * @param   opts.client      Underlying abstract logger to override console.
	 * @param   opts.noServer    Disable the embedded http server for runtime actions.
	 * @param   opts.allowExit   Allow process to exit naturally (uses server.unref()).
	 * @param   opts.timerTTL    TTL for timers in ms (default: 10min). Set to 0 to disable cleanup.
	 */
	public constructor(
		opts: {
			tag?: string;
			client?: AbstractLogger;
			noServer?: boolean;
			allowExit?: boolean;
			timerTTL?: number;
		} = {}
	) {
		this.logger = getLogWrapper.call(
			this,
			output(),
			opts.client ?? console,
			opts.tag
		);
		this.configure(level());

		if (!opts.noServer) {
			const [port, address] = host();
			this.server = setupLogServer.call(
				this,
				port,
				address,
				opts.allowExit
			);
		}

		this.unregisterChangeLevelHandler = registerEvent(
			this,
			'ozlogger.http.changeLevel',
			(data: {
				event: string;
				level: keyof typeof LogLevels;
				duration: number;
			}) => {
				// Changing log level
				this.configure(data.level);
				this.schedule(
					data.event,
					() => {
						// Reseting log level
						this.configure(level());
					},
					data.duration
				);
			}
		);

		// Setup timer garbage collection
		this.timerTTL = opts.timerTTL ?? DEFAULT_TIMER_TTL;
		if (this.timerTTL > 0) {
			this.timerGc = setInterval(
				() => this.cleanupExpiredTimers(),
				DEFAULT_TIMER_GC_INTERVAL
			);
			this.timerGc.unref(); // Don't block process exit
		}
	}

	/**
	 * Method for stopping HTTP server and cleaning up timeouts.
	 */
	public async stop(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.timeouts.forEach((id) => clearTimeout(id));
			this.timeouts.clear();
			this.timers.clear();

			// Clear timer garbage collector
			if (this.timerGc) {
				clearInterval(this.timerGc);
				this.timerGc = null;
			}

			// Unregister handler to avoid accumulating listeners/references
			if (this.unregisterChangeLevelHandler) {
				this.unregisterChangeLevelHandler();
				this.unregisterChangeLevelHandler = null;
			}

			if (!this.server) return resolve();

			// If server is not listening (was not started or already closed), just resolve
			if (!this.server.listening) {
				delete process.env.OZLOGGER_HTTP;
				return resolve();
			}

			// When using singleton server, we don't want to close it if it's shared
			// unless we implement reference counting. For now, we only close if we created it.
			// However since we don't track who created it easily here, we'll just check if it's listening.
			// The issue "Server is not running" happens when calling close() on an already closed server.

			try {
				this.server.close((e) => {
					delete process.env.OZLOGGER_HTTP;
					// Ignore "Server is not running" error since it might have been closed by another logger
					if (
						e &&
						(e as NodeJS.ErrnoException).code !==
							'ERR_SERVER_NOT_RUNNING'
					) {
						return reject(e);
					}
					resolve();
				});
			} catch (e) {
				// Safety catch for sync errors
				if (
					(e as NodeJS.ErrnoException).code !==
					'ERR_SERVER_NOT_RUNNING'
				) {
					reject(e);
				} else {
					resolve();
				}
			}
		});
	}

	/**
	 * Alias for stopping and cleaning up resources.
	 */
	public async shutdown(): Promise<void> {
		return this.stop();
	}

	/**
	 * Factory method for enabling/disabling logging methods.
	 *
	 * @param   enabled  If the retrieved function is enabled.
	 * @param   name     Log level name.
	 * @returns The logging function.
	 */
	private toggle(enabled: boolean, name: LevelTag): LogMethod {
		const fn = !enabled
			? (..._: unknown[]): void => {}
			: (...args: unknown[]): void => {
					this.logger(name, ...args);
				};
		const timeEnd = !enabled
			? (id: string) => {
					// We must cleanup the timer even if we don't log
					if (this.timers.has(id)) this.timers.delete(id);
					return this;
				}
			: (id: string) => {
					this.logger(name, `${id}: ${this.getTime(id)} ms`);
					return this;
				};

		return Object.assign(fn, { timeEnd });
	}

	/**
	 * Factory method for the audit logging method.
	 *
	 * Audit is the VictoriaLogs ingestion entrypoint, so it is intentionally
	 * stricter than the other log methods: it has a fixed signature
	 * audit(_msg, body). The first argument is the message string; the second
	 * is the record body, written to a reserved envelope as `body` (assigned
	 * whole, so caller keys can never overwrite metadata). Passing a different
	 * number of arguments — or a non-string message — is a programming error
	 * and throws, regardless of the active level, so it is caught in dev/test.
	 * Every record carries a generated `audit_id`. An oversized or
	 * unserializable body is a runtime data problem: it is reported via
	 * this.error() and dropped, never crashing the host nor flooding
	 * VictoriaLogs.
	 *
	 * @param   enabled  If the audit level is enabled for the current level.
	 * @returns The audit logging function.
	 */
	private buildAudit(enabled: boolean): AuditMethod {
		const fn = (...args: unknown[]): void => {
			// Audit has a fixed arity of two (_msg, body). A different arity or
			// a non-string message is a programming error and throws,
			// regardless of level, so it surfaces even when audit is disabled.
			if (args.length !== 2) {
				throw new Error(
					`audit() expects exactly two arguments (_msg, body), but received ${args.length}`
				);
			}

			const [msg, body] = args;

			if (typeof msg !== 'string') {
				throw new TypeError(
					`audit() expects the first argument (_msg) to be a string, but received ${typeof msg}`
				);
			}

			if (!enabled) return;

			const id = auditId();

			let serialized: string | undefined;
			try {
				serialized = JSON.stringify(body, getCircularReplacer());
			} catch (e) {
				this.error(
					`[OZLogger] audit() could not serialize the provided body; record dropped (audit_id=${id})`,
					e
				);
				return;
			}

			// JSON.stringify yields undefined for values such as undefined or
			// functions; treat those as empty for the size check.
			const size = Buffer.byteLength(serialized ?? '', 'utf8');
			if (size > SAFE_LINE_BYTES) {
				// Contingency, not a feature: rather than silently dropping the
				// record, break it into safe-sized lines and raise a loud ERROR
				// so the oversize is fixed at the source (audit the intent).
				this.emitOversizeAudit(msg, body, id);
				return;
			}

			this.logger('AUDIT', { audit_id: id, _msg: msg, body });
		};

		const timeEnd = !enabled
			? (id: string) => {
					// We must cleanup the timer even if we don't log
					if (this.timers.has(id)) this.timers.delete(id);
					return this;
				}
			: (id: string) => {
					this.logger('AUDIT', {
						audit_id: auditId(),
						_msg: `${id}: ${this.getTime(id)} ms`
					});
					return this;
				};

		return Object.assign(fn, { timeEnd });
	}

	/**
	 * Breaks an oversized audit record into safe-sized lines and emits the
	 * mandatory ERROR.
	 *
	 * This is a contingency, not a feature (RFC §8): it exists only so a large
	 * record is never silently lost. The break is delegated to the shared
	 * {@link splitAuditBody} util — so every place that breaks audit logs does
	 * it identically — and produces a header line (the full first level, with
	 * oversized values replaced by markers) plus segment lines, all correlated
	 * by the same `audit_id`. A high-visibility ERROR carrying the `audit_id`
	 * is always raised so the oversize is corrected at the source.
	 *
	 * @param   msg   The audit message.
	 * @param   body  The oversized body.
	 * @param   id    The audit_id correlating every emitted line.
	 */
	private emitOversizeAudit(msg: string, body: unknown, id: string): void {
		// splitAuditBody works on the first level of an object; a non-object
		// body is wrapped so it can still be broken without losing data.
		const input = isJsonObject(body)
			? (body as Record<string, unknown>)
			: { value: body };

		const { header, segments } = splitAuditBody(input, {
			limit: SAFE_LINE_BYTES
		});

		// The AUDIT_OVERSIZE ERROR is mandatory on every break (RFC §8): emit it
		// through the underlying wrapper directly, NOT via this.error(), so it is
		// never suppressed by the active log level (e.g. at 'critical'/'quiet').
		// Without this, a break could ship chunk lines while silently dropping
		// the high-visibility alert that signals the oversize must be fixed.
		this.logger(
			'ERROR',
			`[OZLogger] AUDIT_OVERSIZE audit_id=${id}: the audit record exceeded ` +
				`the ${SAFE_LINE_BYTES} bytes safe line limit and was broken into ` +
				`${header.chunk_total} part(s). This is a contingency, not a feature; ` +
				`reduce the volume at the source (audit the intent, RFC §7).`
		);

		this.logger('AUDIT', { audit_id: id, _msg: msg, ...header });

		for (const segment of segments) {
			this.logger('AUDIT', { audit_id: id, ...segment });
		}
	}

	/**
	 * Temporary contingency entrypoint for the import tool.
	 *
	 * @deprecated Not a feature. Created so the import tool — which still emits
	 * large records (resolved identifier lists) — does not lose data silently
	 * while it is not yet auditing the intent (RFC §7, §9). It breaks an
	 * oversized body into audit lines of up to ~200KB using the same shared
	 * {@link splitAuditBody} util as `audit()`, always raising an
	 * AUDIT_OVERSIZE ERROR. A body that already fits takes the normal
	 * single-line path. Remove this once the import tool audits the intent.
	 *
	 * @param   _msg  The audit message (always a string).
	 * @param   body  The record body.
	 */
	public auditChunked(_msg: string, body: Record<string, unknown>): void {
		const id = auditId();

		let serialized: string | undefined;
		try {
			serialized = JSON.stringify(body, getCircularReplacer());
		} catch (e) {
			this.error(
				`[OZLogger] auditChunked() could not serialize the provided body; record dropped (audit_id=${id})`,
				e
			);
			return;
		}

		const size = Buffer.byteLength(serialized ?? '', 'utf8');
		if (size <= SAFE_LINE_BYTES) {
			// It fits: normal single-line path, no break, no ERROR.
			this.logger('AUDIT', { audit_id: id, _msg, body });
			return;
		}

		this.emitOversizeAudit(_msg, body, id);
	}

	/**
	 * Method for handling scheduling logger tasks.
	 *
	 * @param   id        The task identifier.
	 * @param   callback  The task handler.
	 * @param   duration  The time until the task is called.
	 */
	private schedule(
		id: string,
		callback: () => void,
		duration?: number
	): void {
		if (this.timeouts.has(id)) clearTimeout(this.timeouts.get(id));

		this.timeouts.set(
			id,
			setTimeout(() => {
				callback();
				this.timeouts.delete(id);
			}, duration)
		);
	}

	/**
	 * Method for configuring which logging methods are enabled based on the log level.
	 *
	 * @param   level  The minimal level being configured.
	 * @returns The configured log level name.
	 */
	protected configure(level: keyof typeof LogLevels): string {
		level = level in LogLevels ? level : 'audit';

		const lvl = LogLevels[level];

		this.critical = this.toggle(LogLevels['critical'] >= lvl, 'CRITICAL');
		this.error = this.toggle(LogLevels['error'] >= lvl, 'ERROR');
		this.warn = this.toggle(LogLevels['warn'] >= lvl, 'WARNING');
		this.audit = this.buildAudit(LogLevels['audit'] >= lvl);
		this.info = this.toggle(LogLevels['info'] >= lvl, 'INFO');
		this.http = this.toggle(LogLevels['http'] >= lvl, 'HTTP');
		this.debug = this.toggle(LogLevels['debug'] >= lvl, 'DEBUG');
		this.silly = this.toggle(LogLevels['silly'] >= lvl, 'SILLY');

		return level;
	}

	/**
	 * Logger module initializer method.
	 *
	 * @deprecated Use the createLogger() factory function instead.
	 * @param   opts         Logger module configuration options.
	 * @param   opts.tag     Tag with which the logger is being created.
	 * @param   opts.client  Underlying abstract logger to override console.
	 * @returns Logger instance.
	 */
	public static init(
		opts: { tag?: string; client?: AbstractLogger } = {}
	): Logger {
		return new this(opts);
	}

	/**
	 * Method for tracking execution time.
	 *
	 * @param   id  Timer identifier tag.
	 * @returns Logger instance.
	 */
	public time(id: string): Logger {
		// Validation guard for already used identifier
		if (this.timers.has(id)) {
			this.warn(`Identifier ${id} is already in use. Overwriting...`);
		}

		this.timers.set(id, Date.now());

		return this;
	}

	/**
	 * Method for retrieving tracked execution time.
	 *
	 * @param   id  Timer identifier tag.
	 * @returns Time in milliseconds.
	 */
	protected getTime(id: string): number {
		// Validation guard for unknown ID
		if (!this.timers.has(id)) throw new Error(`Undefined identifier ${id}`);

		const time = Date.now() - this.timers.get(id)!;
		this.timers.delete(id); // Cleanup

		return time;
	}

	/**
	 * Method for cleaning up expired timers to prevent memory leaks.
	 * Timers that exceed the TTL are removed and a warning is logged.
	 */
	private cleanupExpiredTimers(): void {
		const now = Date.now();
		const expired: string[] = [];

		for (const [id, startTime] of this.timers) {
			if (now - startTime > this.timerTTL) {
				expired.push(id);
			}
		}

		for (const id of expired) {
			this.timers.delete(id);
			this.warn(
				`Timer '${id}' expired after ${this.timerTTL}ms without timeEnd() call - cleaned up to prevent memory leak`
			);
		}
	}

	/**
	 * Method for retrieving tracked execution time.
	 *
	 * @param   id  Timer identifier tag.
	 * @returns Logger instance.
	 */
	public timeEnd(id: string): Logger {
		this.info(`${id}: ${this.getTime(id)} ms`);

		return this;
	}

	/**
	 * Method for adding logger's contextual information.
	 *
	 * @param   ctx  Contextual information to be added.
	 * @returns Logger instance.
	 */
	public withContext(ctx: LogContext): Logger {
		this.context = { ...this.context, ...ctx };
		return this;
	}

	/**
	 * Method for retrieving the logger's current contextual information.
	 *
	 * @returns The current log context.
	 */
	public getContext(): LogContext {
		const ctx = {
			...this.context,
			...getProcessInformation()
		};
		const span = trace.getSpan(context.active())?.spanContext();

		if (!ctx.traceId && span?.traceId) {
			ctx.traceId = span.traceId;
		}

		if (!ctx.spanId && span?.spanId) {
			ctx.spanId = span.spanId;
		}

		return ctx;
	}

	/**
	 * Method to tag log messages.
	 *
	 * @deprecated Support for this method is
	 * only for avoiding upgrade issues, but
	 * functionality is removed.
	 * @param   tags  Strings to tag the log message.
	 * @returns Logger instance.
	 */
	public tag(...tags: string[]): Logger {
		return this;
	}

	/**
	 * Method for changing log levels.
	 *
	 * @param   level  Level to use when logging messages.
	 */
	public changeLevel(level: keyof typeof LogLevels) {
		this.configure(level);
	}

	/**
	 * Silly logging method. Same as '.debug()'.
	 *
	 * @deprecated Use .debug() logging method istead.
	 * @param   args  Data to be logged.
	 */
	public silly: LogMethod;

	/**
	 * Debugging logging method.
	 *
	 * @param   args  Data to be logged.
	 */
	public debug: LogMethod;

	/**
	 * Audit logging method.
	 *
	 * Entrypoint for VictoriaLogs ingestion. Fixed signature audit(_msg, body):
	 * the first argument is the message string, the second is the record body
	 * (written whole under a reserved envelope, never as `body.0`). Every record
	 * carries a generated `audit_id`. Passing a different number of arguments —
	 * or a non-string message — throws. An oversized body (over
	 * {@link SAFE_LINE_BYTES}) is not dropped: it is broken into safe-sized lines
	 * with a loud AUDIT_OVERSIZE ERROR (contingency, see {@link auditChunked}).
	 *
	 * @param   _msg  The audit message (always a string).
	 * @param   body  The record body (assigned whole).
	 */
	public audit: AuditMethod;

	/**
	 * HTTP request logging method. Same as '.info()'.
	 *
	 * @deprecated Use .info() logging method istead.
	 * @param   args  Data to be logged.
	 */
	public http: LogMethod;

	/**
	 * Information logging method.
	 *
	 * @param   args  Data to be logged.
	 */
	public info: LogMethod;

	/**
	 * Warning logging method.
	 *
	 * @param   args  Data to be logged.
	 */
	public warn: LogMethod;

	/**
	 * Error logging method.
	 *
	 * @param   args  Data to be logged.
	 */
	public error: LogMethod;

	/**
	 * Critical logging method. Same as '.error()'.
	 *
	 * @deprecated Use .error() logging method istead.
	 * @param   args  Data to be logged.
	 */
	public critical: LogMethod;
}

/**
 * Factory function to create tagged Logger instance.
 *
 * @param   tag              Tag with which the logger is being created.
 * @param   opts.client      Underlying abstract logger to override console.
 * @param   opts.noServer    Disable the embedded http server for runtime actions.
 * @param   opts.allowExit   Allow process to exit naturally (uses server.unref()).
 * @param   opts.timerTTL    TTL for timers in ms (default: 10min). Set to 0 to disable cleanup.
 * @returns Logger instace
 */
export function createLogger(
	tag?: string,
	opts: {
		client?: AbstractLogger;
		noServer?: boolean;
		allowExit?: boolean;
		timerTTL?: number;
	} = {}
) {
	return new Logger({ tag, ...opts });
}
