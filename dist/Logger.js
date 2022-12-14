"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OZLogger = void 0;
const winston_1 = require("winston");
require("winston-mongodb");
const node_util_1 = require("node:util");
/**
 * OZLogger module class.
 *
 * @class
 */
class OZLogger {
    /**
     * Logger module class constructor.
     *
     * @class
     * @param   { LoggerConfigOptions }  config  Logger module configuration options.
     * @returns { this }  Logger module class object.
     */
    constructor(config) {
        var _a, _b;
        this.logger = (0, winston_1.createLogger)({
            level: config.level,
            format: winston_1.format.combine(winston_1.format.label({
                label: (_a = config.app) === null || _a === void 0 ? void 0 : _a.toUpperCase(),
                message: false
            }), winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.format.errors({ stack: true }), winston_1.format.printf(({ timestamp, level, label, message, meta }) => {
                let { tags } = meta;
                if (tags && tags.length)
                    tags = tags.join(' ');
                // Custom logging format string
                return tags
                    ? `(${timestamp}) ${level.toUpperCase()}: ${label} [${tags}] ${message}`
                    : `(${timestamp}) ${level.toUpperCase()}: ${label} ${message}`;
            })),
            transports: [
                // Default log transport
                new winston_1.transports.File(Object.assign({
                    filename: config.filename
                }, config.maxsize ? { maxsize: config.maxsize } : {}))
            ],
            defaultMeta: { service: config.app }
        });
        if (((_b = process.env.NODE_ENV) === null || _b === void 0 ? void 0 : _b.match(/^(prod|production)$/)) &&
            config.mongo) {
            const { auth, server, options } = config.mongo;
            const dbCredentials = `${encodeURIComponent(auth.user)}:${encodeURIComponent(auth.pass)}`;
            const dbServers = `${server.host}:${server.port}`;
            // For production environments
            // send logs to MongoDB instance
            this.logger.add(new winston_1.transports.MongoDB({
                level: server.level,
                db: `mongodb://${dbCredentials}@${dbServers}/${server.database}`,
                options: options,
                collection: server.collection,
                storeHost: true,
                decolorize: true,
                format: winston_1.format.combine(winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.format.metadata(), winston_1.format.json())
            }));
        }
        else {
            // For non-production environments
            // also send output to the console
            this.logger.add(new winston_1.transports.Console({
                format: winston_1.format.combine(winston_1.format.colorize({
                    all: true,
                    colors: {
                        debug: 'blue',
                        info: 'green',
                        http: 'cyan',
                        warn: 'yellow',
                        error: 'red'
                    }
                }))
            }));
        }
    }
    /**
     * Abstract logging method for internal use only.
     *
     * @param   { string }      level  Log message level.
     * @param   { ...unknown }  data   Data to be processed and logged.
     * @returns { void }
     */
    log(level, ...data) {
        let tags = null;
        if (OZLogger.tags) {
            tags = OZLogger.tags;
            delete OZLogger.tags;
        }
        const message = data
            .map((el) => (typeof el !== 'string' ? (0, node_util_1.format)('%O', el) : el))
            .join(' ');
        this.logger.log({
            level,
            message,
            meta: { tags }
        });
    }
    /**
     * Logger module initializer method.
     *
     * @static
     * @param   { LoggerConfigOptions }  arg  Logger module configuration options.
     * @returns { OZLogger }  Logger module object instance.
     */
    static init(arg) {
        if (!this.instance && arg)
            this.instance = new this(arg);
        return this.instance;
    }
    /**
     * Method to tag log messages.
     *
     * @static
     * @param   { ...string }  tags  Strings to tag the log message.
     * @returns { OZLogger }  Logger module object instance.
     */
    static tag(...tags) {
        OZLogger.tags = tags;
        return OZLogger;
    }
    /**
     * Debug logging method.
     *
     * @static
     * @param   { ...unknown }  args  Data to be logged.
     * @returns { void }
     */
    static async debug(...args) {
        this.instance.log('debug', ...args);
    }
    /**
     * HTTP request logging method.
     *
     * @static
     * @param   { ...unknown }  args  Data to be logged.
     * @returns { void }
     */
    static async http(...args) {
        this.instance.log('http', ...args);
    }
    /**
     * Information logging method.
     *
     * @static
     * @param   { ...unknown }  args  Data to be logged.
     * @returns { void }
     */
    static async info(...args) {
        this.instance.log('info', ...args);
    }
    /**
     * Warning logging method.
     *
     * @static
     * @param   { ...unknown }  args  Data to be logged.
     * @returns { void }
     */
    static async warn(...args) {
        this.instance.log('warn', ...args);
    }
    /**
     * Error logging method.
     *
     * @static
     * @param   { ...unknown }  args  Data to be logged.
     * @returns { void }
     */
    static async error(...args) {
        this.instance.log('error', ...args);
    }
}
exports.OZLogger = OZLogger;
