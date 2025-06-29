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
	if (typeof data === 'string') return data;

	if (isJsonObject(data) || isJsonArray(data)) {
		return JSON.stringify(data, null, 2);
	}

	return format('%O', data);
}

/**
 * Creates a replacer function for JSON.stringify to handle circular references.
 * This version tracks parent objects (ancestors) to detect cycles.
 * When a circular reference is detected, it returns the string "[Circular]" for that property.
 *
 * @returns A replacer function that handles circular objects by returning "[Circular]".
 */
export function getCircularReplacer(): (
	this: unknown,
	key: string,
	value: unknown
) => unknown {
	const ancestors: Array<unknown> = [];

	/**
	 * The replacer function to be used with JSON.stringify.
	 * It checks for circular references by comparing the current value against its ancestors.
	 *
	 * @param   key    The key of the property being stringified.
	 * @param   value  The value of the property being stringified.
	 * @returns The original value if it's not part of a circular reference,
	 *          or the string "[Circular]" if a circular reference is detected.
	 */
	return function (this: unknown, key: string, value: unknown): unknown {
		if (typeof value !== 'object' || value === null) {
			return value;
		}

		while (
			ancestors.length > 0 &&
			ancestors[ancestors.length - 1] !== this
		) {
			ancestors.pop();
		}

		if (ancestors.includes(value)) {
			return '[Circular]';
		}

		ancestors.push(value);

		return value;
	};
}

/**
 * Outputs the normalized version of the input data.
 *
 * @param   data  The data to normalize.
 * @returns The normalized data.
 */
export function normalize(data: unknown) {
	const t = typeof data;

	if (
		t === 'string' ||
		t === 'number' ||
		t === 'boolean' ||
		isJsonObject(data) ||
		isJsonArray(data)
	) {
		return data;
	}

	return format('%O', data);
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
 * Function for checking the data type without relying on
 * the generic typeof functionality.
 *
 * @param   data  The data being checked for its type.
 * @returns The internal tag that represents the data type.
 */
export function typeOf(data: unknown) {
	let internalTag = `Unknown`;

	try {
		internalTag = Object.prototype.toString.call(data)?.slice(8, -1);
	} catch (e) {
		internalTag = `Unknown`;
	}

	return internalTag;
}

/**
 * Function for checking if data is a key/value pair object.
 *
 * @param   data  The data being checked.
 * @returns Whether or not the data is an object.
 */
export function isJsonObject(data: unknown): boolean {
	return typeOf(data) === 'Object';
}

/**
 * Function for checking if data is an array object.
 *
 * @param   data  The data being checked.
 * @returns Whether or not the data is an array.
 */
export function isJsonArray(data: unknown): boolean {
	return typeOf(data) === 'Array';
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
				? () => ({ datetime: new Date().toISOString() }) as T
				: () => ({}) as T;
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
