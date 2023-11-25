import { LogLevels } from './enum/LogLevels';
import { LoggerColorized } from './interface/LoggerColorized';
import { Outputs } from './enum/Outputs';
/**
 * Return the current date and time.
 *
 * @returns The current datetime.
 */
export declare function now(): string;
/**
 * Outputs the stringified version of the input data.
 *
 * @param   data  The data to stringify.
 * @returns The stringified data.
 */
export declare function stringify(data: unknown): string;
/**
 * Factory function to create painter for log output coloring.
 *
 * @returns Readonly object with level tags as painter methods.
 */
export declare function colorized(): Readonly<LoggerColorized>;
/**
 * Function for checking if data is a key/value pair object.
 *
 * @param   data  The data being checked.
 * @returns Whether or not the data is an object.
 */
export declare function isJsonObject(data: unknown): boolean;
/**
 * Function for checking if data is an array object.
 *
 * @param   data  The data being checked.
 * @returns Whether or not the data is an array.
 */
export declare function isJsonArray(data: unknown): boolean;
/**
 * Retrieve the current log level name.
 *
 * @returns The level name.
 */
export declare function level(): keyof typeof LogLevels;
/**
 * Check if the log outputs should be colorized.
 *
 * @returns Whether or not the output can be colorized.
 */
export declare function color(): boolean;
/**
 * Check which output should be used for logging.
 *
 * @returns Output name to be used.
 */
export declare function output(): (typeof Outputs)[number];
/**
 * Parse the log server port and interface to bind to.
 *
 * @returns The port number and interface address.
 */
export declare function host(): [number, string];
