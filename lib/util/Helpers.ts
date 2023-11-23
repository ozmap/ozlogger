import { format } from 'util';
import { LogLevels } from './enum/LogLevels';

/**
 * Return the current date and time.
 *
 * @returns The current datetime.
 */
export function now(): string {
    return new Date().toISOString();
}

/**
 * Retrieve the current log level priority number.
 *
 * @returns The level priority number.
 */
export function level(): number {
    const input: string = process.env.OZLOGGER_LEVEL?.toLowerCase() || 'audit';

    return LogLevels[input as keyof typeof LogLevels] || LogLevels['audit'];
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
