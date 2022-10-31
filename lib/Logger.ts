import { createLogger, format, transports, Logger } from 'winston';
import 'winston-mongodb';

import LoggerConfigOptions from './interfaces/LoggerConfigOptions';
import MongoTransportOptions from './interfaces/MongoTransportOptions';

export class OZLogger {
	private static instance: OZLogger;

	private logger: Logger;

	private constructor(config: LoggerConfigOptions) {
		this.logger = createLogger({
			level: config.level,
			format: format.combine(
				format.label({
					label: config.app?.toUpperCase(),
					message: false
				}),
				format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
				format.errors({ stack: true }),
				format.printf(({ timestamp, level, label, message, meta }) => {
					// Custom logging format string
					return meta.tags?.length
						? `(${timestamp}) ${level.toUpperCase()}: ${label} [${meta.tags.join(
								' '
						  )}] ${message}`
						: `(${timestamp}) ${level.toUpperCase()}: ${label} ${message}`;
				})
			),
			transports: [
				new transports.File({
					filename: config.filename
				})
			],
			defaultMeta: { service: config.app }
		});

		if (
			process.env.NODE_ENV?.match(/^(prod|production)$/) &&
			config.mongo
		) {
			const { auth, server, options } = config.mongo;
			const dbCredentials = `${encodeURIComponent(
				auth.user
			)}:${encodeURIComponent(auth.pass)}`;
			const dbServers = `${server.host}:${server.port}`;

			// For production environments
			// send logs to MongoDB instance
			this.logger.add(
				new transports.MongoDB({
					level: 'info',
					db: `mongodb://${dbCredentials}@${dbServers}/${server.database}`,
					options: options,
					collection: server.collection,
					storeHost: true,
					decolorize: true,
					format: format.combine(
						format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
						format.metadata(),
						format.json()
					)
				} as MongoTransportOptions)
			);
		} else {
			// For non-production environments
			// also send output to the console
			this.logger.add(
				new transports.Console({
					format: format.combine(format.colorize({ all: true }))
				})
			);
		}
	}

	public static init(arg?: LoggerConfigOptions): OZLogger {
		if (!OZLogger.instance && arg) OZLogger.instance = new OZLogger(arg);

		return OZLogger.instance;
	}

	public static debug(msg: string, ...args: string[]): void {
		OZLogger.init().logger.log({
			level: 'debug',
			message: msg,
			meta: { tags: args }
		});
	}

	public static http(msg: string, ...args: string[]): void {
		OZLogger.init().logger.log({
			level: 'http',
			message: msg,
			meta: { tags: args }
		});
	}

	public static info(msg: string, ...args: string[]): void {
		OZLogger.init().logger.log({
			level: 'info',
			message: msg,
			meta: { tags: args }
		});
	}

	public static warning(msg: string, ...args: string[]): void {
		OZLogger.init().logger.log({
			level: 'warn',
			message: msg,
			meta: { tags: args }
		});
	}

	public static error(msg: string, ...args: string[]): void {
		OZLogger.init().logger.log({
			level: 'error',
			message: msg,
			meta: { tags: args }
		});
	}
}
