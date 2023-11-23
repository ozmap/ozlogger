/**
 * Return the current date and time.
 *
 * @returns The current datetime.
 */
export declare function now(): string;
/**
 * Retrieve the current log level priority number.
 *
 * @returns The level priority number.
 */
export declare function level(): number;
/**
 * Check if the log outputs should be colorized.
 *
 * @returns Wheter or not the output can be colorized.
 */
export declare function color(): boolean;
/**
 * Outputs the stringified version of the input data.
 *
 * @param   data  The data to stringify.
 * @returns The stringified data.
 */
export declare function stringify(data: unknown): string;
