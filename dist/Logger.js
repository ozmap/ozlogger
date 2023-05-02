"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OZLogger = void 0;
const winston_1 = require("winston");
require("winston-mongodb");
const format_1 = require("./format");
const Helpers_1 = require("./util/Helpers");
/**
 * OZLogger module class.
 */
class OZLogger {
    /**
     * Logger module class constructor.
     *
     * @param  config  Logger module configuration options.
     */
    constructor(config) {
        /**
         * Stores the transports for Winston.
         */
        this.transports = [];
        let setup;
        this.level = config.level.toLowerCase(); // Default
        if ((0, Helpers_1.includes)(config.targets, 'stdout')) {
            setup = {
                level: this.level
            };
            if (config.stdout && config.stdout.output === 'json') {
                setup.format = (0, format_1.Json)(config.app, (0, Helpers_1.color)());
            }
            else {
                setup.format = (0, format_1.Text)(config.app, (0, Helpers_1.color)());
            }
            this.transports.push(new winston_1.transports.Console(setup));
        }
        if ((0, Helpers_1.includes)(config.targets, 'file')) {
            setup = {
                level: this.level,
                decolorize: true
            };
            if (config.file) {
                setup.filename = config.file.filename;
                setup.format =
                    config.file.output === 'json'
                        ? (0, format_1.Json)(config.app)
                        : (0, format_1.Text)(config.app);
                if (config.file.maxsize)
                    setup.maxsize = config.file.maxsize;
            }
            else {
                setup.filename = `${config.app}.log`;
                setup.format = (0, format_1.Text)(config.app, (0, Helpers_1.color)());
            }
            this.transports.push(new winston_1.transports.File(setup));
        }
        if ((0, Helpers_1.includes)(config.targets, 'mongo') && config.mongo) {
            setup = {
                level: this.level,
                decolorize: true,
                options: config.mongo.options || {},
                collection: config.mongo.server.collection,
                storeHost: true,
                format: (0, format_1.Json)(config.app)
            };
            const servers = `${config.mongo.server.host}:${config.mongo.server.port}`;
            if (config.mongo.auth) {
                setup.db = `mongodb://${encodeURIComponent(config.mongo.auth.user)}:${encodeURIComponent(config.mongo.auth.pass)}@${servers}/${config.mongo.server.database}`;
            }
            else {
                setup.db = `mongodb://${servers}/${config.mongo.server.database}`;
            }
            this.transports.push(new winston_1.transports.MongoDB(setup));
        }
        this.logger = (0, winston_1.createLogger)({
            transports: this.transports,
            defaultMeta: { host: (0, Helpers_1.host)() }
        });
    }
    /**
     * Method for updating log levels at runtime.
     */
    updateLogLevelAtRuntime() {
        setInterval(() => {
            const level = (0, Helpers_1.env)('OZLOGGER_LEVEL') || this.level;
            for (let i = 0; i < this.transports.length; ++i) {
                if (this.transports[i].level !== level)
                    this.transports[i].level = level;
            }
        }, 2500); // milliseconds
    }
    /**
     * Abstract logging method for internal use only.
     *
     * @param  level  Log message level.
     * @param  data   Data to be processed and logged.
     */
    log(level, ...data) {
        const tags = OZLogger.tags;
        OZLogger.tags = undefined;
        let message = '';
        for (let i = 0; i < data.length; ++i) {
            message += (0, Helpers_1.stringify)(data[i]);
        }
        this.logger.log({
            level,
            tags,
            message
        });
    }
    /**
     * Logger module initializer method.
     *
     * @param   arg  Logger module configuration options.
     * @returns Logger module object instance.
     */
    static init(arg) {
        if (!this.instance && arg) {
            this.instance = new this(arg);
            if (arg.dynamic)
                this.instance.updateLogLevelAtRuntime();
        }
        return this.instance;
    }
    /**
     * Method for tracking execution time.
     *
     * @param   id  Timer identifier tag.
     * @returns Logger module object instance.
     */
    static time(id) {
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
     * @returns Logger module object instance.
     */
    static timeEnd(id) {
        // Validation guard for unknown ID
        if (!this.timers.has(id))
            throw new Error(`Undefined identifier ${id}`);
        const time = Date.now() - this.timers.get(id);
        this.timers.delete(id); // Cleanup
        this.instance.log('info', `${id}: ${time} ms`);
        return this;
    }
    /**
     * Method to tag log messages.
     *
     * @param   tags  Strings to tag the log message.
     * @returns Logger module object instance.
     */
    static tag(...tags) {
        this.tags = tags;
        return this;
    }
    /**
     * Debug logging method.
     *
     * @param  args  Data to be logged.
     */
    static async debug(...args) {
        this.instance.log('debug', ...args);
    }
    /**
     * HTTP request logging method.
     *
     * @param  args  Data to be logged.
     */
    static async http(...args) {
        this.instance.log('http', ...args);
    }
    /**
     * Information logging method.
     *
     * @param  args  Data to be logged.
     */
    static async info(...args) {
        this.instance.log('info', ...args);
    }
    /**
     * Warning logging method.
     *
     * @param  args  Data to be logged.
     */
    static async warn(...args) {
        this.instance.log('warn', ...args);
    }
    /**
     * Error logging method.
     *
     * @param  args  Data to be logged.
     */
    static async error(...args) {
        this.instance.log('error', ...args);
    }
}
exports.OZLogger = OZLogger;
/**
 * Temporary storage for timers.
 */
OZLogger.timers = new Map();
