import 'winston-mongodb';
import LoggerConfigOptions from './interfaces/LoggerConfigOptions';
/**
 * OZLogger module class.
 *
 * @class
 */
export declare class OZLogger {
    /**
     * Stores the Logger object instance.
     *
     * @static
     * @member { OZLogger }
     */
    private static instance;
    /**
     * Temporary storage for log tags.
     *
     * @static
     * @member { string[] }
     */
    private static tags?;
    /**
     * Stores the Winston Logger instance.
     *
     * @member { WinstonLogger }
     */
    private logger;
    /**
     * Logger module class constructor.
     *
     * @class
     * @param   { LoggerConfigOptions }  config  Logger module configuration options.
     * @returns { this }  Logger module class object.
     */
    private constructor();
    /**
     * Abstract logging method for internal use only.
     *
     * @param   { string }      level  Log message level.
     * @param   { ...unknown }  data   Data to be processed and logged.
     * @returns { void }
     */
    private log;
    /**
     * Logger module initializer method.
     *
     * @static
     * @param   { LoggerConfigOptions }  arg  Logger module configuration options.
     * @returns { OZLogger }  Logger module object instance.
     */
    static init(arg?: LoggerConfigOptions): OZLogger;
    /**
     * Method to tag log messages.
     *
     * @static
     * @param   { ...string }  tags  Strings to tag the log message.
     * @returns { OZLogger }  Logger module object instance.
     */
    static tag(...tags: string[]): typeof OZLogger;
    /**
     * Debug logging method.
     *
     * @static
     * @param   { ...unknown }  args  Data to be logged.
     * @returns { void }
     */
    static debug(...args: unknown[]): Promise<void>;
    /**
     * HTTP request logging method.
     *
     * @static
     * @param   { ...unknown }  args  Data to be logged.
     * @returns { void }
     */
    static http(...args: unknown[]): Promise<void>;
    /**
     * Information logging method.
     *
     * @static
     * @param   { ...unknown }  args  Data to be logged.
     * @returns { void }
     */
    static info(...args: unknown[]): Promise<void>;
    /**
     * Warning logging method.
     *
     * @static
     * @param   { ...unknown }  args  Data to be logged.
     * @returns { void }
     */
    static warn(...args: unknown[]): Promise<void>;
    /**
     * Error logging method.
     *
     * @static
     * @param   { ...unknown }  args  Data to be logged.
     * @returns { void }
     */
    static error(...args: unknown[]): Promise<void>;
}
