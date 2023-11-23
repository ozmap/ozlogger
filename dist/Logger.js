"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.Logger = void 0;
const format_1 = require("./format");
/**
 * Logger module class.
 */
class Logger {
    /**
     * Logger module class constructor.
     *
     * @param   tag  Tag with which the logger is being created.
     */
    constructor(tag) {
        /**
         * Temporary storage for timers.
         */
        this.timers = new Map();
        this.logger = (0, format_1.getLogWrapper)('json', console, tag);
    }
    /**
     * Logger module initializer method.
     *
     * @deprecated Use the createLogger() factory function instead.
     * @param   opts      Logger module configuration options.
     * @param   opts.tag  Tag with which the logger is being created.
     * @returns Logger instance.
     */
    static init(opts) {
        return new this(opts.tag);
    }
    /**
     * Method for tracking execution time.
     *
     * @param   id  Timer identifier tag.
     * @returns Logger instance.
     */
    time(id) {
        // Validation guard for already used identifier
        if (this.timers.has(id))
            throw new Error(`Identifier ${id} is in use`);
        this.timers.set(id, Date.now());
        return this;
    }
    /**
     * Method for retrieving tracked execution time.
     *
     * @param   id  Timer identifier tag.
     * @returns Logger instance.
     */
    timeEnd(id) {
        // Validation guard for unknown ID
        if (!this.timers.has(id))
            throw new Error(`Undefined identifier ${id}`);
        const time = Date.now() - this.timers.get(id);
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
    tag(...tags) {
        return this;
    }
    /**
     * Silly logging method. Same as '.debug()'.
     *
     * @deprecated Use .debug() logging method istead.
     * @param   args  Data to be logged.
     */
    silly(...args) {
        this.logger('SILLY', ...args);
    }
    /**
     * Debugging logging method.
     *
     * @param   args  Data to be logged.
     */
    debug(...args) {
        this.logger('DEBUG', ...args);
    }
    /**
     * Audit logging method.
     *
     * @param   args  Data to be logged.
     */
    audit(...args) {
        this.logger('AUDIT', ...args);
    }
    /**
     * HTTP request logging method. Same as '.info()'.
     *
     * @deprecated Use .info() logging method istead.
     * @param   args  Data to be logged.
     */
    http(...args) {
        this.logger('HTTP', ...args);
    }
    /**
     * Information logging method.
     *
     * @param   args  Data to be logged.
     */
    info(...args) {
        this.logger('INFO', ...args);
    }
    /**
     * Warning logging method.
     *
     * @param   args  Data to be logged.
     */
    warn(...args) {
        this.logger('WARNING', ...args);
    }
    /**
     * Error logging method.
     *
     * @param   args  Data to be logged.
     */
    error(...args) {
        this.logger('ERROR', ...args);
    }
    /**
     * Critical logging method. Same as '.error()'.
     *
     * @deprecated Use .error() logging method istead.
     * @param   args  Data to be logged.
     */
    critical(...args) {
        this.logger('CRITICAL', ...args);
    }
}
exports.Logger = Logger;
/**
 * Factory function to create tagged Logger instance.
 *
 * @param   tag  Tag with which the logger is being created.
 * @returns Logger instace
 */
function createLogger(tag) {
    return new Logger(tag);
}
exports.createLogger = createLogger;
