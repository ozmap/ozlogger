/**
 * Read and environment variable at runtime.
 *
 * @param  name  Environment variable name.
 * @return The value stored in the environment variable.
 */
export declare function env(name: string): string;
/**
 * Check if a string is in an array of strings.
 *
 * @param   arr    The string array to check.
 * @param   value  Value to check the existance.
 * @returns Wheter or not the string is in the provided array.
 */
export declare function includes(arr: string[], value: string): boolean;
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