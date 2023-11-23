import { getLogWrapper } from './format';
import { LoggerMethods } from './util/interface/LoggerMethods';
import { LogWrapper } from './util/type/LogWrapper';
import { AbstractLogger } from './util/type/AbstractLogger';

/**
 * Logger module class.
 */
export class Logger implements LoggerMethods {
    /**
     * Stores the logger wrapper being used.
     */
    protected logger: LogWrapper;

    /**
     * Temporary storage for timers.
     */
    private timers = new Map<string, number>();

    /**
     * Logger module class constructor.
     *
     * @param   opts         Logger module configuration options.
     * @param   opts.tag     Tag with which the logger is being created.
     * @param   opts.client  Underlying abstract logger to override console.
     */
    public constructor(opts: { tag?: string; client?: AbstractLogger } = {}) {
        this.logger = getLogWrapper('json', opts.client ?? console, opts.tag);
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

        this.logger('info', `${id}: ${time} ms`);

        return this;
    }

    /**
     * Method to tag log messages.
     *
     * @deprecated Support for this method is
     * only for avoiding upgrade issues, but
     * functionality is not working anymore.
     * @param   tags  Strings to tag the log message.
     * @returns Logger instance.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public tag(...tags: string[]): Logger {
        return this;
    }

    /**
     * Silly logging method. Same as '.debug()'.
     *
     * @deprecated Use .debug() logging method istead.
     * @param   args  Data to be logged.
     */
    public silly(...args: unknown[]): void {
        this.logger('SILLY', ...args);
    }

    /**
     * Debugging logging method.
     *
     * @param   args  Data to be logged.
     */
    public debug(...args: unknown[]): void {
        this.logger('DEBUG', ...args);
    }

    /**
     * Audit logging method.
     *
     * @param   args  Data to be logged.
     */
    public audit(...args: unknown[]): void {
        this.logger('AUDIT', ...args);
    }

    /**
     * HTTP request logging method. Same as '.info()'.
     *
     * @deprecated Use .info() logging method istead.
     * @param   args  Data to be logged.
     */
    public http(...args: unknown[]): void {
        this.logger('HTTP', ...args);
    }

    /**
     * Information logging method.
     *
     * @param   args  Data to be logged.
     */
    public info(...args: unknown[]): void {
        this.logger('INFO', ...args);
    }

    /**
     * Warning logging method.
     *
     * @param   args  Data to be logged.
     */
    public warn(...args: unknown[]): void {
        this.logger('WARNING', ...args);
    }

    /**
     * Error logging method.
     *
     * @param   args  Data to be logged.
     */
    public error(...args: unknown[]): void {
        this.logger('ERROR', ...args);
    }

    /**
     * Critical logging method. Same as '.error()'.
     *
     * @deprecated Use .error() logging method istead.
     * @param   args  Data to be logged.
     */
    public critical(...args: unknown[]): void {
        this.logger('CRITICAL', ...args);
    }
}

/**
 * Factory function to create tagged Logger instance.
 *
 * @param   tag     Tag with which the logger is being created.
 * @param   client  Underlying abstract logger to override console.
 * @returns Logger instace
 */
export function createLogger(tag?: string, client?: AbstractLogger) {
    return new Logger({ tag, client });
}
