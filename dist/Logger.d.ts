import 'winston-mongodb';
import LoggerConfigOptions from './interfaces/LoggerConfigOptions';
export declare class OZLogger {
    private static instance;
    private logger;
    private constructor();
    static init(arg?: LoggerConfigOptions): OZLogger;
    static debug(msg: string, ...args: string[]): Promise<void>;
    static http(msg: string, ...args: string[]): Promise<void>;
    static info(msg: string, ...args: string[]): Promise<void>;
    static warn(msg: string, ...args: string[]): Promise<void>;
    static error(msg: string, ...args: string[]): Promise<void>;
}
