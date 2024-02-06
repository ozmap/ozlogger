import { format } from 'util';
import { LogLevels } from './enum/LogLevels';
import { Colors } from './enum/Colors';
import { LoggerColorized } from './interface/LoggerColorized';
import { Outputs } from './enum/Outputs';

/**
 * Outputs the stringified version of the input data.
 *
 * @param   data  The data to stringify.
 * @returns The stringified data.
 */
export function stringify(data: unknown): string {
	return typeof data !== 'string' ? format('%O', data) : data;
}

/**
 * Factory function to create painter for log output coloring.
 *
 * @returns Readonly object with level tags as painter methods.
 */
export function colorized(): Readonly<LoggerColorized> {
	const output = (c: keyof typeof Colors): ((text: string) => string) =>
		color()
			? (text: string) => Colors[c] + text + '\x1b[0m'
			: (text: string) => text;

	return Object.freeze({
		SILLY: output('magenta') /** @deprecated */,
		DEBUG: output('magenta'),
		AUDIT: output('blue'),
		HTTP: output('green') /** @deprecated */,
		INFO: output('green'),
		WARNING: output('yellow'),
		ERROR: output('red'),
		CRITICAL: output('red') /** @deprecated */
	});
}

/**
 * Function for checking if data is a key/value pair object.
 *
 * @param   data  The data being checked.
 * @returns Whether or not the data is an object.
 */
export function isJsonObject(data: unknown): boolean {
	return typeof data === 'object' && !Array.isArray(data) && data !== null;
}

/**
 * Function for checking if data is an array object.
 *
 * @param   data  The data being checked.
 * @returns Whether or not the data is an array.
 */
export function isJsonArray(data: unknown): boolean {
	return typeof data === 'object' && Array.isArray(data) && data !== null;
}

/**
 * Retrieve the current log level name.
 *
 * @returns The level name.
 */
export function level(): keyof typeof LogLevels {
	const input = (process.env.OZLOGGER_LEVEL?.toLowerCase() ||
		'debug') as keyof typeof LogLevels;

	return input in LogLevels ? input : 'audit';
}

/**
 * Check if the log outputs should be colorized.
 *
 * @returns Whether or not the output can be colorized.
 */
export function color(): boolean {
	return !!process.env.OZLOGGER_COLORS?.match(/true/i);
}

/**
 * Check which output should be used for logging.
 *
 * @returns Output name to be used.
 */
export function output(): (typeof Outputs)[number] {
	const input = (process.env.OZLOGGER_OUTPUT?.toLowerCase() ||
		'json') as (typeof Outputs)[number];

	return Outputs.indexOf(input) < 0 ? 'json' : input;
}

/**
 * Return the current date and time closure.
 *
 * @returns The current datetime closure.
 */
export function datetime<T>(): () => T {
	const withDatetime = !!process.env.OZLOGGER_DATETIME?.match(/true/i);

	switch (output()) {
		case 'text':
			return withDatetime
				? () => `${new Date().toISOString()} ` as T
				: () => '' as T;
		case 'json':
			return withDatetime
				? () => ({ datetime: new Date().toISOString() } as T)
				: () => ({} as T);
	}
}

/**
 * Parse the log server port and interface to bind to.
 *
 * @returns The port number and interface address.
 */
export function host(): [number, string] {
	const input = process.env.OZLOGGER_SERVER || '9898';

	let port = 9898;
	let hostname = 'localhost';

	// Format: '9898'
	if (/^\d+$/.test(input)) {
		port = parseInt(input);
		return [port, hostname];
	}

	// Format: ':9898'
	if (/^:\d+$/.test(input)) {
		port = parseInt(input.slice(1));
		return [port, hostname];
	}

	// Format: '[::1]:9898'
	if (/^\[.*\]:\d+$/.test(input)) {
		const [ipv6, p] = input.slice(1, -1).split(']:');
		hostname = ipv6;
		port = parseInt(p);
		return [port, hostname];
	}

	// Format: '127.0.0.1:9898'
	if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(input)) {
		const [ipv4, p] = input.split(':');
		hostname = ipv4;
		port = parseInt(p);
		return [port, hostname];
	}

	// Format: 'localhost' or 'localhost:9898'
	if (/^[^\s:]+(:\d+)?$/.test(input)) {
		const [domain, p] = input.split(':');
		if (domain) hostname = domain;
		if (p) port = parseInt(p);
		return [port, hostname];
	}

	throw new Error(`Unsupported HTTP server address (${input})`);
}
