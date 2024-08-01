import { getLogWrapper } from './format';
import { LoggerMethods } from './util/interface/LoggerMethods';
import { LogWrapper } from './util/type/LogWrapper';
import { AbstractLogger } from './util/type/AbstractLogger';
import { registerEvent } from './util/Events';
import { LogLevels } from './util/enum/LogLevels';
import { setupLogServer } from './http/server';
import { Server } from 'http';
import { level, output, host } from './util/Helpers';
import { LevelTags } from './util/enum/LevelTags';

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
		this.logger = getLogWrapper(output(), opts.client ?? console, opts.tag);
		this.configure(level());

		if (!opts.noServer) this.server = setupLogServer(...host(), this);

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
	private toggle(
		enabled: boolean,
		name: (typeof LevelTags)[number]
	): (...args: unknown[]) => void {
		if (!enabled) return (...args: unknown[]): void => {};

		return (...args: unknown[]): void => {
			this.logger(name, ...args);
		};
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

		this.silly = this.toggle(LogLevels['silly'] <= lvl, 'SILLY');
		this.debug = this.toggle(LogLevels['debug'] <= lvl, 'DEBUG');
		this.audit = this.toggle(LogLevels['audit'] <= lvl, 'AUDIT');
		this.http = this.toggle(LogLevels['http'] <= lvl, 'HTTP');
		this.info = this.toggle(LogLevels['info'] <= lvl, 'INFO');
		this.warn = this.toggle(LogLevels['warn'] <= lvl, 'WARNING');
		this.error = this.toggle(LogLevels['error'] <= lvl, 'ERROR');
		this.critical = this.toggle(LogLevels['critical'] <= lvl, 'CRITICAL');

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
	 * @returns Logger instance.
	 */
	public timeEnd(id: string): Logger {
		// Validation guard for unknown ID
		if (!this.timers.has(id)) throw new Error(`Undefined identifier ${id}`);

		const time: number = Date.now() - (this.timers.get(id) as number);
		this.timers.delete(id); // Cleanup

		this.logger('INFO', `${id}: ${time} ms`);

		return this;
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
	public silly(...args: unknown[]): void {
		// Must be overriden when the logger is
		// configured with a given log level.
		// By default it is disabled.
	}

	/**
	 * Debugging logging method.
	 *
	 * @param   args  Data to be logged.
	 */
	public debug(...args: unknown[]): void {
		// Must be overriden when the logger is
		// configured with a given log level.
		// By default it is disabled.
	}

	/**
	 * Audit logging method.
	 *
	 * @param   args  Data to be logged.
	 */
	public audit(...args: unknown[]): void {
		// Must be overriden when the logger is
		// configured with a given log level.
		// By default it is disabled.
	}

	/**
	 * HTTP request logging method. Same as '.info()'.
	 *
	 * @deprecated Use .info() logging method istead.
	 * @param   args  Data to be logged.
	 */
	public http(...args: unknown[]): void {
		// Must be overriden when the logger is
		// configured with a given log level.
		// By default it is disabled.
	}

	/**
	 * Information logging method.
	 *
	 * @param   args  Data to be logged.
	 */
	public info(...args: unknown[]): void {
		// Must be overriden when the logger is
		// configured with a given log level.
		// By default it is disabled.
	}

	/**
	 * Warning logging method.
	 *
	 * @param   args  Data to be logged.
	 */
	public warn(...args: unknown[]): void {
		// Must be overriden when the logger is
		// configured with a given log level.
		// By default it is disabled.
	}

	/**
	 * Error logging method.
	 *
	 * @param   args  Data to be logged.
	 */
	public error(...args: unknown[]): void {
		// Must be overriden when the logger is
		// configured with a given log level.
		// By default it is disabled.
	}

	/**
	 * Critical logging method. Same as '.error()'.
	 *
	 * @deprecated Use .error() logging method istead.
	 * @param   args  Data to be logged.
	 */
	public critical(...args: unknown[]): void {
		// Must be overriden when the logger is
		// configured with a given log level.
		// By default it is disabled.
	}
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
