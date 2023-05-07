export interface Mongo {
	server: {
		host: string;
		port: number;
		database: string;
		collection: string;
	};
	auth?: {
		user: string;
		pass: string;
	};
	options?: {
		useUnifiedTopology: boolean;
		[key: string]: string | number | boolean;
	};
}
