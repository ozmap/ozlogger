import {
	createLogger,
	transports,
	transport as Transport,
	Logger as WinstonLogger
} from 'winston';
import 'winston-mongodb';
import ipc from 'node-ipc';
import { Ipc } from '../cli/util/enum/Ipc';
import { Message, Socket } from '../cli/util/interface/Message';
import { Text, Json } from './format';
import { host, includes, color, stringify } from './util/Helpers';
import LoggerConfigOptions from './util/interface/LoggerConfigOptions';

/**
 * OZLogger module class.
 */
export class OZLogger {
	/**
	 * Stores the Logger object instance.
	 */
	private static instance: OZLogger;

	/**
	 * Temporary storage for timers.
	 */
	private static timers = new Map<string, number>();

	/**
	 * Temporary storage for log tags.
	 */
	private static tags?: string[];

	/**
	 * Stores the Winston Logger instance.
	 */
	protected logger: WinstonLogger;

	/**
	 * Stores the transports for Winston.
	 */
	protected transports: Transport[] = [];

	/**
	 * Default log level for all transports.
	 */
	protected level: string;

	/**
	 * Stores the timer for set-level command timeout option.
	 */
	private timer: NodeJS.Timeout | void;

	/**
	 * Logger module class constructor.
	 *
	 * @param  config  Logger module configuration options.
	 */
	private constructor(config: LoggerConfigOptions) {
		let setup: { [key: string]: unknown };

		this.level = config.level.toLowerCase(); // Default

		if (includes(config.targets, 'stdout')) {
			setup = {
				level: this.level
			};

			if (config.stdout && config.stdout.output === 'json') {
				setup.format = Json(config.app, color());
			} else {
				setup.format = Text(config.app, color());
			}

			this.transports.push(new transports.Console(setup));
		}

		if (includes(config.targets, 'file')) {
			setup = {
				level: this.level,
				decolorize: true
			};

			if (config.file) {
				setup.filename = config.file.filename;
				setup.format =
					config.file.output === 'json'
						? Json(config.app)
						: Text(config.app);

				if (config.file.maxsize) setup.maxsize = config.file.maxsize;
			} else {
				setup.filename = `${config.app}.log`;
				setup.format = Text(config.app, color());
			}

			this.transports.push(new transports.File(setup));
		}

		if (includes(config.targets, 'mongo') && config.mongo) {
			setup = {
				level: this.level,
				decolorize: true,
				options: config.mongo.options || {},
				collection: config.mongo.server.collection,
				storeHost: true,
				format: Json(config.app)
			};

			const servers = `${config.mongo.server.host}:${config.mongo.server.port}`;

			if (config.mongo.auth) {
				setup.db = `mongodb://${encodeURIComponent(
					config.mongo.auth.user
				)}:${encodeURIComponent(config.mongo.auth.pass)}@${servers}/${
					config.mongo.server.database
				}`;
			} else {
				setup.db = `mongodb://${servers}/${config.mongo.server.database}`;
			}

			this.transports.push(new transports.MongoDB(setup as any));
		}

		this.logger = createLogger({
			transports: this.transports,
			defaultMeta: { host: host() }
		});
	}

	/**
	 * Method for setting up IPC server to
	 * interact with OZLogger at runtime.
	 */
	private IPC(): void {
		Object.assign(ipc.config, {
			id: Ipc.SERVER,
			retry: 1500,
			silent: true
		});

		const reset = () => {
			for (let i = 0; i < this.transports.length; ++i) {
				if (this.transports[i].level !== this.level)
					this.transports[i].level = this.level;
			}
		};

		ipc.serve(() => {
			ipc.server.on(
				'message',
				(message: string, socket: Socket): void => {
					const { signal, data } = JSON.parse(message) as Message;

					switch (signal) {
						case 'UpdateLogLevel':
							for (let i = 0; i < this.transports.length; ++i) {
								if (this.transports[i].level !== data?.level)
									this.transports[i].level =
										data?.level as string;
							}

							if (data?.timeout) {
								if (this.timer) clearTimeout(this.timer);

								this.timer = setTimeout(
									reset,
									data?.timeout as number
								);
							}

							break;

						case 'ResetLogLevel':
							if (this.timer) {
								clearTimeout(this.timer);
								this.timer = undefined;
							}

							reset();

							break;
					}

					ipc.server.emit(socket, 'disconnect');
				}
			);
		});

		ipc.server.start();
	}

	/**
	 * Abstract logging method for internal use only.
	 *
	 * @param  level  Log message level.
	 * @param  data   Data to be processed and logged.
	 */
	private log(level: string, ...data: unknown[]): void {
		const tags = OZLogger.tags;
		OZLogger.tags = undefined;

		let message = '';

		for (let i = 0; i < data.length; ++i) {
			message += stringify(data[i]);
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
	public static init(arg: LoggerConfigOptions): OZLogger {
		if (!this.instance && arg) {
			this.instance = new this(arg);

			if (arg.dynamic) this.instance.IPC();
		}

		return this.instance;
	}

	/**
	 * Method for tracking execution time.
	 *
	 * @param   id  Timer identifier tag.
	 * @returns Logger module object instance.
	 */
	public static time(id: string): typeof OZLogger {
		// Validation guard for already used identifier
		if (this.timers.has(id)) throw new Error(`Identifier ${id} is in use`);

		this.timers.set(id, Date.now());

		return this;
	}

	/**
	 * Method for retrieving tracked execution time.
	 *
	 * @param   id  Timer identifier tag.
	 * @returns Logger module object instance.
	 */
	public static timeEnd(id: string): typeof OZLogger {
		// Validation guard for unknown ID
		if (!this.timers.has(id)) throw new Error(`Undefined identifier ${id}`);

		const time: number = Date.now() - (this.timers.get(id) as number);
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
	public static tag(...tags: string[]): typeof OZLogger {
		this.tags = tags;

		return this;
	}

	/**
	 * Debug logging method.
	 *
	 * @param  args  Data to be logged.
	 */
	public static async debug(...args: unknown[]): Promise<void> {
		this.instance.log('debug', ...args);
	}

	/**
	 * HTTP request logging method.
	 *
	 * @param  args  Data to be logged.
	 */
	public static async http(...args: unknown[]): Promise<void> {
		this.instance.log('http', ...args);
	}

	/**
	 * Information logging method.
	 *
	 * @param  args  Data to be logged.
	 */
	public static async info(...args: unknown[]): Promise<void> {
		this.instance.log('info', ...args);
	}

	/**
	 * Warning logging method.
	 *
	 * @param  args  Data to be logged.
	 */
	public static async warn(...args: unknown[]): Promise<void> {
		this.instance.log('warn', ...args);
	}

	/**
	 * Error logging method.
	 *
	 * @param  args  Data to be logged.
	 */
	public static async error(...args: unknown[]): Promise<void> {
		this.instance.log('error', ...args);
	}
}
