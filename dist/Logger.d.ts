import 'winston-mongodb';
import LoggerConfigOptions from './interfaces/LoggerConfigOptions';
export declare class OZLogger {
    private static instance;
    private logger;
    private constructor();
    protected static init(arg?: LoggerConfigOptions): OZLogger;
    static debug(msg: string, ...args: string[]): void;
    static http(msg: string, ...args: string[]): void;
    static info(msg: string, ...args: string[]): void;
    static warning(msg: string, ...args: string[]): void;
    static error(msg: string, ...args: string[]): void;
}
