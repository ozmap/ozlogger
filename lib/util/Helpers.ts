import { execSync } from 'child_process';
import { format } from 'util';
import { hostname, type, release } from 'os';

/**
 * Read and environment variable at runtime.
 *
 * @param   name  Environment variable name.
 * @returns The value stored in the environment variable.
 */
export function env(name: string): string {
	return execSync(`echo $${name}`, {
		encoding: 'utf-8',
		timeout: 100 // milliseconds
	}).replace(/(\r\n|\n|\r)/gm, '');
}

/**
 * Return a minimal host description.
 *
 * @returns The host description.
 */
export function host(): string {
	return `${hostname()} (${type()} ${release()})`;
}

/**
 * Check if a string is in an array of strings.
 *
 * @param   arr    The string array to check.
 * @param   value  Value to check the existance.
 * @returns Wheter or not the string is in the provided array.
 */
export function includes(arr: string[], value: string): boolean {
	return arr.indexOf(value) > -1;
}

/**
 * Check if the log outputs should be colorized.
 *
 * @returns Wheter or not the output can be colorized.
 */
export function color(): boolean {
	return !!process.env.OZLOGGER_COLORS?.match(/true/i);
}

/**
 * Outputs the stringified version of the input data.
 *
 * @param   data  The data to stringify.
 * @returns The stringified data.
 */
export function stringify(data: unknown): string {
	return typeof data !== 'string' ? format('%O', data) : data;
}
