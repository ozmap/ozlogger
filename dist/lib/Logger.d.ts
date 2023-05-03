import { transport as Transport, Logger as WinstonLogger } from 'winston';
import 'winston-mongodb';
import LoggerConfigOptions from './util/interface/LoggerConfigOptions';
/**
 * OZLogger module class.
 */
export declare class OZLogger {
    /**
     * Stores the Logger object instance.
     */
    private static instance;
    /**
     * Temporary storage for timers.
     */
    private static timers;
    /**
     * Temporary storage for log tags.
     */
    private static tags?;
    /**
     * Stores the Winston Logger instance.
     */
    protected logger: WinstonLogger;
    /**
     * Stores the transports for Winston.
     */
    protected transports: Transport[];
    /**
     * Default log level for all transports.
     */
    protected level: string;
    /**
     * Logger module class constructor.
     *
     * @param  config  Logger module configuration options.
     */
    private constructor();
    /**
     * Method for setting up IPC server to
     * interact with OZLogger at runtime.
     */
    private IPC;
    /**
     * Abstract logging method for internal use only.
     *
     * @param  level  Log message level.
     * @param  data   Data to be processed and logged.
     */
    private log;
    /**
     * Logger module initializer method.
     *
     * @param   arg  Logger module configuration options.
     * @returns Logger module object instance.
     */
    static init(arg: LoggerConfigOptions): OZLogger;
    /**
     * Method for tracking execution time.
     *
     * @param   id  Timer identifier tag.
     * @returns Logger module object instance.
     */
    static time(id: string): typeof OZLogger;
    /**
     * Method for retrieving tracked execution time.
     *
     * @param   id  Timer identifier tag.
     * @returns Logger module object instance.
     */
    static timeEnd(id: string): typeof OZLogger;
    /**
     * Method to tag log messages.
     *
     * @param   tags  Strings to tag the log message.
     * @returns Logger module object instance.
     */
    static tag(...tags: string[]): typeof OZLogger;
    /**
     * Debug logging method.
     *
     * @param  args  Data to be logged.
     */
    static debug(...args: unknown[]): Promise<void>;
    /**
     * HTTP request logging method.
     *
     * @param  args  Data to be logged.
     */
    static http(...args: unknown[]): Promise<void>;
    /**
     * Information logging method.
     *
     * @param  args  Data to be logged.
     */
    static info(...args: unknown[]): Promise<void>;
    /**
     * Warning logging method.
     *
     * @param  args  Data to be logged.
     */
    static warn(...args: unknown[]): Promise<void>;
    /**
     * Error logging method.
     *
     * @param  args  Data to be logged.
     */
    static error(...args: unknown[]): Promise<void>;
}
