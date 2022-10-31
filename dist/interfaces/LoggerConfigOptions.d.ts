export default interface LoggerConfigOptions {
    app: string;
    filename: string;
    level: string;
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
        };
        options: {
            useUnifiedTopology: boolean;
            [key: string]: string | number | boolean;
        };
    };
}
