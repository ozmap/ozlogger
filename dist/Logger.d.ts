import { LoggerMethods } from './util/interface/LoggerMethods';
import { LogWrapper } from './util/type/LogWrapper';
/**
 * Logger module class.
 */
export declare class Logger implements LoggerMethods {
    /**
     * Stores the logger wrapper being used.
     */
    protected logger: LogWrapper;
    /**
     * Temporary storage for timers.
     */
    private timers;
    /**
     * Logger module class constructor.
     *
     * @param   tag  Tag with which the logger is being created.
     */
    constructor(tag?: string);
    /**
     * Logger module initializer method.
     *
     * @deprecated Use the createLogger() factory function instead.
     * @param   opts      Logger module configuration options.
     * @param   opts.tag  Tag with which the logger is being created.
     * @returns Logger instance.
     */
    static init(opts: {
        tag?: string;
    }): Logger;
    /**
     * Method for tracking execution time.
     *
     * @param   id  Timer identifier tag.
     * @returns Logger instance.
     */
    time(id: string): Logger;
    /**
     * Method for retrieving tracked execution time.
     *
     * @param   id  Timer identifier tag.
     * @returns Logger instance.
     */
    timeEnd(id: string): Logger;
    /**
     * Method to tag log messages.
     *
     * @deprecated Support for this method is
     * only for avoiding upgrade issues, but
     * functionality is not working anymore.
     * @param   tags  Strings to tag the log message.
     * @returns Logger instance.
     */
    tag(...tags: string[]): Logger;
    /**
     * Silly logging method. Same as '.debug()'.
     *
     * @deprecated Use .debug() logging method istead.
     * @param   args  Data to be logged.
     */
    silly(...args: unknown[]): void;
    /**
     * Debugging logging method.
     *
     * @param   args  Data to be logged.
     */
    debug(...args: unknown[]): void;
    /**
     * Audit logging method.
     *
     * @param   args  Data to be logged.
     */
    audit(...args: unknown[]): void;
    /**
     * HTTP request logging method. Same as '.info()'.
     *
     * @deprecated Use .info() logging method istead.
     * @param   args  Data to be logged.
     */
    http(...args: unknown[]): void;
    /**
     * Information logging method.
     *
     * @param   args  Data to be logged.
     */
    info(...args: unknown[]): void;
    /**
     * Warning logging method.
     *
     * @param   args  Data to be logged.
     */
    warn(...args: unknown[]): void;
    /**
     * Error logging method.
     *
     * @param   args  Data to be logged.
     */
    error(...args: unknown[]): void;
    /**
     * Critical logging method. Same as '.error()'.
     *
     * @deprecated Use .error() logging method istead.
     * @param   args  Data to be logged.
     */
    critical(...args: unknown[]): void;
}
/**
 * Factory function to create tagged Logger instance.
 *
 * @param   tag  Tag with which the logger is being created.
 * @returns Logger instace
 */
export declare function createLogger(tag?: string): Logger;
