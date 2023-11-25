"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.Logger = void 0;
const format_1 = require("./format");
const Events_1 = require("./util/Events");
const LogLevels_1 = require("./util/enum/LogLevels");
const server_1 = require("./http/server");
const Helpers_1 = require("./util/Helpers");
/**
 * Logger module class.
 */
class Logger {
    /**
     * Logger module class constructor.
     *
     * @param   opts         Logger module configuration options.
     * @param   opts.tag     Tag with which the logger is being created.
     * @param   opts.client  Underlying abstract logger to override console.
     */
    constructor(opts = {}) {
        var _a;
        /**
         * Temporary storage for timers.
         */
        this.timers = new Map();
        /**
         * Temporary storage for timeouts.
         */
        this.timeouts = new Map();
        this.logger = (0, format_1.getLogWrapper)((0, Helpers_1.output)(), (_a = opts.client) !== null && _a !== void 0 ? _a : console, opts.tag);
        this.configure((0, Helpers_1.level)());
        this.server = (0, server_1.setupLogServer)(...(0, Helpers_1.host)(), this);
        (0, Events_1.registerEvent)(this, 'ozlogger.http.changeLevel', (data) => {
            const newLevel = this.configure(data.level).toUpperCase();
            this.warn(`Changed log level to ${newLevel}`);
            this.schedule(data.event, () => {
                const oldLevel = this.configure((0, Helpers_1.level)()).toUpperCase();
                this.warn(`Reset log level to ${oldLevel}`);
            }, data.duration);
        });
    }
    /**
     * Method for stopping HTTP server and cleaning up timeouts.
     */
    async stop() {
        return new Promise((resolve, reject) => {
            this.timeouts.forEach((id) => clearTimeout(id));
            this.timeouts.clear();
            if (!this.server)
                return resolve();
            this.server.close((e) => (e ? reject(e) : resolve()));
        });
    }
    /**
     * Factory method for enabling/disabling logging methods.
     *
     * @param   enabled  If the retrieved function is enabled.
     * @param   name     Log level name.
     * @returns The logging function.
     */
    toggle(enabled, name) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        if (!enabled)
            return (...args) => { };
        return (...args) => {
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
    schedule(id, callback, duration) {
        if (this.timeouts.has(id))
            clearTimeout(this.timeouts.get(id));
        this.timeouts.set(id, setTimeout(() => {
            callback();
            this.timeouts.delete(id);
        }, duration));
    }
    /**
     * Method for configuring which logging methods are enabled based on the log level.
     *
     * @param   level  The minimal level being configured.
     * @returns The configured log level name.
     */
    configure(level) {
        level = level in LogLevels_1.LogLevels ? level : 'audit';
        const lvl = LogLevels_1.LogLevels[level];
        this.silly = this.toggle(LogLevels_1.LogLevels['silly'] <= lvl, 'SILLY');
        this.debug = this.toggle(LogLevels_1.LogLevels['debug'] <= lvl, 'DEBUG');
        this.audit = this.toggle(LogLevels_1.LogLevels['audit'] <= lvl, 'AUDIT');
        this.http = this.toggle(LogLevels_1.LogLevels['http'] <= lvl, 'HTTP');
        this.info = this.toggle(LogLevels_1.LogLevels['info'] <= lvl, 'INFO');
        this.warn = this.toggle(LogLevels_1.LogLevels['warn'] <= lvl, 'WARNING');
        this.error = this.toggle(LogLevels_1.LogLevels['error'] <= lvl, 'ERROR');
        this.critical = this.toggle(LogLevels_1.LogLevels['critical'] <= lvl, 'CRITICAL');
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
    static init(opts = {}) {
        return new this(opts);
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    silly(...args) { }
    /**
     * Debugging logging method.
     *
     * @param   args  Data to be logged.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    debug(...args) { }
    /**
     * Audit logging method.
     *
     * @param   args  Data to be logged.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    audit(...args) { }
    /**
     * HTTP request logging method. Same as '.info()'.
     *
     * @deprecated Use .info() logging method istead.
     * @param   args  Data to be logged.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    http(...args) { }
    /**
     * Information logging method.
     *
     * @param   args  Data to be logged.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    info(...args) { }
    /**
     * Warning logging method.
     *
     * @param   args  Data to be logged.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    warn(...args) { }
    /**
     * Error logging method.
     *
     * @param   args  Data to be logged.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error(...args) { }
    /**
     * Critical logging method. Same as '.error()'.
     *
     * @deprecated Use .error() logging method istead.
     * @param   args  Data to be logged.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    critical(...args) { }
}
exports.Logger = Logger;
/**
 * Factory function to create tagged Logger instance.
 *
 * @param   tag     Tag with which the logger is being created.
 * @param   client  Underlying abstract logger to override console.
 * @returns Logger instace
 */
function createLogger(tag, client) {
    return new Logger({ tag, client });
}
exports.createLogger = createLogger;
