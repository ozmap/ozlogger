import { LogWrapper } from './util/type/LogWrapper';
import { AbstractLogger } from './util/type/AbstractLogger';
import { LogMethod, LoggerMethods } from './util/interface/LoggerMethods';
import { LogContext } from './util/interface/LogContext';
import { LogLevels } from './util/enum/LogLevels';
import { LevelTag } from './util/enum/LevelTags';
import { Server } from 'http';
import { getLogWrapper } from './format';
import { registerEvent } from './util/Events';
import { setupLogServer } from './http/server';
import { level, output, host } from './util/Helpers';
import { context, trace } from '@opentelemetry/api';

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
	 * Logger module class constructor.
	 *
	 * @param   opts           Logger module configuration options.
	 * @param   opts.tag       Tag with which the logger is being created.
	 * @param   opts.client    Underlying abstract logger to override console.
	 * @param   opts.noServer  Disable the embedded http server for runtime actions.
	 */
	public constructor(
		opts: { tag?: string; client?: AbstractLogger; noServer?: boolean } = {}
	) {
		this.logger = getLogWrapper.call(
			this,
			output(),
			opts.client ?? console,
			opts.tag
		);
		this.configure(level());

		if (!opts.noServer) this.server = setupLogServer.apply(this, host());

		registerEvent(
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
	}

	/**
	 * Method for stopping HTTP server and cleaning up timeouts.
	 */
	public async stop(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.timeouts.forEach((id) => clearTimeout(id));
			this.timeouts.clear();

			if (!this.server) return resolve();

			this.server.close((e) => {
				delete process.env.OZLOGGER_HTTP;

				return e ? reject(e) : resolve();
			});
		});
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
			? (_: string) => this
			: (id: string) => {
					this.logger(name, `${id}: ${this.getTime(id)} ms`);
					return this;
				};

		return Object.assign(fn, { timeEnd });
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
		this.audit = this.toggle(LogLevels['audit'] >= lvl, 'AUDIT');
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
		if (this.timers.has(id)) throw new Error(`Identifier ${id} is in use`);

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
		const ctx = { ...this.context };
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
	 * @param   args  Data to be logged.
	 */
	public audit: LogMethod;

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
 * @param   tag            Tag with which the logger is being created.
 * @param   opts.client    Underlying abstract logger to override console.
 * @param   opts.noServer  Disable the embedded http server for runtime actions.
 * @returns Logger instace
 */
export function createLogger(
	tag?: string,
	opts: { client?: AbstractLogger; noServer?: boolean } = {}
) {
	return new Logger({ tag, ...opts });
}
