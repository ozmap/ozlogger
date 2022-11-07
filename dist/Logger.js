"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OZLogger = void 0;
const winston_1 = require("winston");
require("winston-mongodb");
class OZLogger {
    constructor(config) {
        var _a, _b;
        this.logger = (0, winston_1.createLogger)({
            level: config.level,
            format: winston_1.format.combine(winston_1.format.label({
                label: (_a = config.app) === null || _a === void 0 ? void 0 : _a.toUpperCase(),
                message: false
            }), winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.format.errors({ stack: true }), winston_1.format.printf(({ timestamp, level, label, message, meta }) => {
                var _a;
                // Custom logging format string
                return ((_a = meta.tags) === null || _a === void 0 ? void 0 : _a.length)
                    ? `(${timestamp}) ${level.toUpperCase()}: ${label} [${meta.tags.join(' ')}] ${message}`
                    : `(${timestamp}) ${level.toUpperCase()}: ${label} ${message}`;
            })),
            transports: [
                new winston_1.transports.File(config.maxsize
                    ? {
                        filename: config.filename,
                        maxsize: config.maxsize
                    }
                    : {
                        filename: config.filename
                    })
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
                format: winston_1.format.combine(winston_1.format.colorize({ all: true }))
            }));
        }
    }
    static init(arg) {
        if (!OZLogger.instance && arg)
            OZLogger.instance = new OZLogger(arg);
        return OZLogger.instance;
    }
    static async debug(msg, ...args) {
        OZLogger.init().logger.log({
            level: 'debug',
            message: msg,
            meta: { tags: args }
        });
    }
    static async http(msg, ...args) {
        OZLogger.init().logger.log({
            level: 'http',
            message: msg,
            meta: { tags: args }
        });
    }
    static async info(msg, ...args) {
        OZLogger.init().logger.log({
            level: 'info',
            message: msg,
            meta: { tags: args }
        });
    }
    static async warn(msg, ...args) {
        OZLogger.init().logger.log({
            level: 'warn',
            message: msg,
            meta: { tags: args }
        });
    }
    static async error(msg, ...args) {
        OZLogger.init().logger.log({
            level: 'error',
            message: msg,
            meta: { tags: args }
        });
    }
}
exports.OZLogger = OZLogger;
