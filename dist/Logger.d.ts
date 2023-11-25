/// <reference types="node" />
import { LoggerMethods } from './util/interface/LoggerMethods';
import { LogWrapper } from './util/type/LogWrapper';
import { AbstractLogger } from './util/type/AbstractLogger';
import { LogLevels } from './util/enum/LogLevels';
import { Server } from 'http';
/**
 * Logger module class.
 */
export declare class Logger implements LoggerMethods {
    /**
     * Temporary storage for timers.
     */
    private timers;
    /**
     * Temporary storage for timeouts.
     */
    private timeouts;
    /**
     * Stores the logger wrapper being used.
     */
    protected logger: LogWrapper;
    /**
     * Stores the HTTP server used to issue commands for the logger.
     */
    server: Server | void;
    /**
     * Logger module class constructor.
     *
     * @param   opts         Logger module configuration options.
     * @param   opts.tag     Tag with which the logger is being created.
     * @param   opts.client  Underlying abstract logger to override console.
     */
    constructor(opts?: {
        tag?: string;
        client?: AbstractLogger;
    });
    /**
     * Method for stopping HTTP server and cleaning up timeouts.
     */
    stop(): Promise<void>;
    /**
     * Factory method for enabling/disabling logging methods.
     *
     * @param   enabled  If the retrieved function is enabled.
     * @param   name     Log level name.
     * @returns The logging function.
     */
    private toggle;
    /**
     * Method for handling scheduling logger tasks.
     *
     * @param   id        The task identifier.
     * @param   callback  The task handler.
     * @param   duration  The time until the task is called.
     */
    private schedule;
    /**
     * Method for configuring which logging methods are enabled based on the log level.
     *
     * @param   level  The minimal level being configured.
     * @returns The configured log level name.
     */
    protected configure(level: keyof typeof LogLevels): string;
    /**
     * Logger module initializer method.
     *
     * @deprecated Use the createLogger() factory function instead.
     * @param   opts         Logger module configuration options.
     * @param   opts.tag     Tag with which the logger is being created.
     * @param   opts.client  Underlying abstract logger to override console.
     * @returns Logger instance.
     */
    static init(opts?: {
        tag?: string;
        client?: AbstractLogger;
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
     * functionality is removed.
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
 * @param   tag     Tag with which the logger is being created.
 * @param   client  Underlying abstract logger to override console.
 * @returns Logger instace
 */
export declare function createLogger(tag?: string, client?: AbstractLogger): Logger;
