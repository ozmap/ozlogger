import {
	createLogger,
	format,
	transports,
	Logger as WinstonLogger
} from 'winston';
import 'winston-mongodb';
import { format as formatString } from 'node:util';

import LoggerConfigOptions from './interfaces/LoggerConfigOptions';
import MongoTransportOptions from './interfaces/MongoTransportOptions';

/**
 * OZLogger module class.
 *
 * @class
 */
export class OZLogger {
	/**
	 * Stores the Logger object instance.
	 *
	 * @static
	 * @member { OZLogger }
	 */
	private static instance: OZLogger;

	/**
	 * Temporary storage for log tags.
	 *
	 * @static
	 * @member { string[] }
	 */
	private static tags?: string[];

	/**
	 * Stores the Winston Logger instance.
	 *
	 * @member { WinstonLogger }
	 */
	private logger: WinstonLogger;

	/**
	 * Logger module class constructor.
	 *
	 * @class
	 * @param   { LoggerConfigOptions }  config  Logger module configuration options.
	 * @returns { this }  Logger module class object.
	 */
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
					let { tags } = meta;

					if (tags && tags.length) tags = tags.join(' ');

					// Custom logging format string
					return tags
						? `(${timestamp}) ${level.toUpperCase()}: ${label} [${tags}] ${message}`
						: `(${timestamp}) ${level.toUpperCase()}: ${label} ${message}`;
				})
			),
			transports: [
				// Default log transport
				new transports.File(
					Object.assign(
						{
							filename: config.filename
						},
						config.maxsize ? { maxsize: config.maxsize } : {}
					)
				)
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
					level: server.level,
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
					format: format.combine(
						format.colorize({
							all: true,
							colors: {
								debug: 'blue',
								info: 'green',
								http: 'cyan',
								warn: 'yellow',
								error: 'red'
							}
						})
					)
				})
			);
		}
	}

	/**
	 * Abstract logging method for internal use only.
	 *
	 * @param   { string }      level  Log message level.
	 * @param   { ...unknown }  data   Data to be processed and logged.
	 * @returns { void }
	 */
	private log(level: string, ...data: unknown[]): void {
		let tags: string[] | null = null;

		if (OZLogger.tags) {
			tags = OZLogger.tags;
			delete OZLogger.tags;
		}

		const message = data
			.map((el) => (typeof el !== 'string' ? formatString('%O', el) : el))
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
	public static init(arg?: LoggerConfigOptions): OZLogger {
		if (!this.instance && arg) this.instance = new this(arg);

		return this.instance;
	}

	/**
	 * Method to tag log messages.
	 *
	 * @static
	 * @param   { ...string }  tags  Strings to tag the log message.
	 * @returns { OZLogger }  Logger module object instance.
	 */
	public static tag(...tags: string[]): typeof OZLogger {
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
	public static async debug(...args: unknown[]): Promise<void> {
		this.instance.log('debug', ...args);
	}

	/**
	 * HTTP request logging method.
	 *
	 * @static
	 * @param   { ...unknown }  args  Data to be logged.
	 * @returns { void }
	 */
	public static async http(...args: unknown[]): Promise<void> {
		this.instance.log('http', ...args);
	}

	/**
	 * Information logging method.
	 *
	 * @static
	 * @param   { ...unknown }  args  Data to be logged.
	 * @returns { void }
	 */
	public static async info(...args: unknown[]): Promise<void> {
		this.instance.log('info', ...args);
	}

	/**
	 * Warning logging method.
	 *
	 * @static
	 * @param   { ...unknown }  args  Data to be logged.
	 * @returns { void }
	 */
	public static async warn(...args: unknown[]): Promise<void> {
		this.instance.log('warn', ...args);
	}

	/**
	 * Error logging method.
	 *
	 * @static
	 * @param   { ...unknown }  args  Data to be logged.
	 * @returns { void }
	 */
	public static async error(...args: unknown[]): Promise<void> {
		this.instance.log('error', ...args);
	}
}
