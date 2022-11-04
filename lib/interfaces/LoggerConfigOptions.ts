export default interface LoggerConfigOptions {
	app: string; // Application name
	filename: string; // Logs file name
	maxsize?: number; // Logs file maximum size - MUST be in bytes
	level: string; // Minimum level to be logged
	mongo?: {
		auth: {
			user: string;
			pass: string;
		};
		server: {
			host: string;
			port: number;
			database: string;
			collection: string;
			level: string;
		};
		options: {
			useUnifiedTopology: boolean;
			[key: string]: string | number | boolean;
		};
	};
}
