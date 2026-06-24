import { expect, describe, test, beforeEach, afterEach } from '@jest/globals';
import {
	stringify,
	normalize,
	typeOf,
	isJsonObject,
	isJsonArray,
	level,
	color,
	output,
	datetime,
	host,
	getCircularReplacer,
	getProcessInformation,
	colorized
} from '../lib/util/Helpers';

describe('stringify', () => {
	test('should return string as-is', () => {
		expect(stringify('hello')).toBe('hello');
	});

	test('should stringify objects with indentation', () => {
		const obj = { key: 'value' };
		expect(stringify(obj)).toBe('{\n  "key": "value"\n}');
	});

	test('should stringify arrays with indentation', () => {
		const arr = [1, 2, 3];
		expect(stringify(arr)).toBe('[\n  1,\n  2,\n  3\n]');
	});

	test('should format non-JSON values using util.format', () => {
		const result = stringify(Symbol('test'));
		expect(result).toContain('Symbol');
	});

	test('should handle null', () => {
		expect(stringify(null)).toBe('null');
	});

	test('should handle numbers', () => {
		expect(stringify(42)).toContain('42');
	});
});

describe('normalize', () => {
	test('should return strings as-is', () => {
		expect(normalize('hello')).toBe('hello');
	});

	test('should return numbers as-is', () => {
		expect(normalize(42)).toBe(42);
	});

	test('should return booleans as-is', () => {
		expect(normalize(true)).toBe(true);
		expect(normalize(false)).toBe(false);
	});

	test('should return objects as-is', () => {
		const obj = { key: 'value' };
		expect(normalize(obj)).toEqual(obj);
	});

	test('should return arrays as-is', () => {
		const arr = [1, 2, 3];
		expect(normalize(arr)).toEqual(arr);
	});

	test('should format non-JSON values using util.format', () => {
		const result = normalize(Symbol('test'));
		expect(typeof result).toBe('string');
		expect(result).toContain('Symbol');
	});
});

describe('typeOf', () => {
	test('should return Object for plain objects', () => {
		expect(typeOf({})).toBe('Object');
		expect(typeOf({ key: 'value' })).toBe('Object');
	});

	test('should return Array for arrays', () => {
		expect(typeOf([])).toBe('Array');
		expect(typeOf([1, 2, 3])).toBe('Array');
	});

	test('should return String for strings', () => {
		expect(typeOf('hello')).toBe('String');
	});

	test('should return Number for numbers', () => {
		expect(typeOf(42)).toBe('Number');
		expect(typeOf(3.14)).toBe('Number');
	});

	test('should return Boolean for booleans', () => {
		expect(typeOf(true)).toBe('Boolean');
		expect(typeOf(false)).toBe('Boolean');
	});

	test('should return Null for null', () => {
		expect(typeOf(null)).toBe('Null');
	});

	test('should return Undefined for undefined', () => {
		expect(typeOf(undefined)).toBe('Undefined');
	});

	test('should return Date for Date objects', () => {
		expect(typeOf(new Date())).toBe('Date');
	});

	test('should return RegExp for RegExp objects', () => {
		expect(typeOf(/test/)).toBe('RegExp');
	});

	test('should return Function for functions', () => {
		expect(typeOf(() => {})).toBe('Function');
	});

	test('should return Symbol for symbols', () => {
		expect(typeOf(Symbol('test'))).toBe('Symbol');
	});
});

describe('isJsonObject', () => {
	test('should return true for plain objects', () => {
		expect(isJsonObject({})).toBe(true);
		expect(isJsonObject({ key: 'value' })).toBe(true);
	});

	test('should return false for arrays', () => {
		expect(isJsonObject([])).toBe(false);
	});

	test('should return false for null', () => {
		expect(isJsonObject(null)).toBe(false);
	});

	test('should return false for primitives', () => {
		expect(isJsonObject('string')).toBe(false);
		expect(isJsonObject(42)).toBe(false);
		expect(isJsonObject(true)).toBe(false);
	});

	test('should return false for Date objects', () => {
		expect(isJsonObject(new Date())).toBe(false);
	});
});

describe('isJsonArray', () => {
	test('should return true for arrays', () => {
		expect(isJsonArray([])).toBe(true);
		expect(isJsonArray([1, 2, 3])).toBe(true);
	});

	test('should return false for objects', () => {
		expect(isJsonArray({})).toBe(false);
	});

	test('should return false for null', () => {
		expect(isJsonArray(null)).toBe(false);
	});

	test('should return false for primitives', () => {
		expect(isJsonArray('string')).toBe(false);
		expect(isJsonArray(42)).toBe(false);
	});
});

describe('level', () => {
	afterEach(() => {
		delete process.env.OZLOGGER_LEVEL;
	});

	test('should return debug when OZLOGGER_LEVEL is debug', () => {
		process.env.OZLOGGER_LEVEL = 'debug';
		expect(level()).toBe('debug');
	});

	test('should return info when OZLOGGER_LEVEL is info', () => {
		process.env.OZLOGGER_LEVEL = 'info';
		expect(level()).toBe('info');
	});

	test('should return audit when OZLOGGER_LEVEL is audit', () => {
		process.env.OZLOGGER_LEVEL = 'audit';
		expect(level()).toBe('audit');
	});

	test('should return warn when OZLOGGER_LEVEL is warn', () => {
		process.env.OZLOGGER_LEVEL = 'warn';
		expect(level()).toBe('warn');
	});

	test('should return error when OZLOGGER_LEVEL is error', () => {
		process.env.OZLOGGER_LEVEL = 'error';
		expect(level()).toBe('error');
	});

	test('should return audit for unknown level', () => {
		process.env.OZLOGGER_LEVEL = 'unknown';
		expect(level()).toBe('audit');
	});

	test('should handle uppercase', () => {
		process.env.OZLOGGER_LEVEL = 'DEBUG';
		expect(level()).toBe('debug');
	});

	test('should return debug when not set', () => {
		delete process.env.OZLOGGER_LEVEL;
		expect(level()).toBe('debug');
	});
});

describe('color', () => {
	afterEach(() => {
		delete process.env.OZLOGGER_COLORS;
	});

	test('should return true when OZLOGGER_COLORS is true', () => {
		process.env.OZLOGGER_COLORS = 'true';
		expect(color()).toBe(true);
	});

	test('should return true when OZLOGGER_COLORS is TRUE', () => {
		process.env.OZLOGGER_COLORS = 'TRUE';
		expect(color()).toBe(true);
	});

	test('should return false when OZLOGGER_COLORS is false', () => {
		process.env.OZLOGGER_COLORS = 'false';
		expect(color()).toBe(false);
	});

	test('should return false when not set', () => {
		delete process.env.OZLOGGER_COLORS;
		expect(color()).toBe(false);
	});
});

describe('output', () => {
	afterEach(() => {
		delete process.env.OZLOGGER_OUTPUT;
	});

	test('should return json when OZLOGGER_OUTPUT is json', () => {
		process.env.OZLOGGER_OUTPUT = 'json';
		expect(output()).toBe('json');
	});

	test('should return text when OZLOGGER_OUTPUT is text', () => {
		process.env.OZLOGGER_OUTPUT = 'text';
		expect(output()).toBe('text');
	});

	test('should return json for unknown output', () => {
		process.env.OZLOGGER_OUTPUT = 'unknown';
		expect(output()).toBe('json');
	});

	test('should handle uppercase', () => {
		process.env.OZLOGGER_OUTPUT = 'TEXT';
		expect(output()).toBe('text');
	});

	test('should return json when not set', () => {
		delete process.env.OZLOGGER_OUTPUT;
		expect(output()).toBe('json');
	});
});

describe('datetime', () => {
	afterEach(() => {
		delete process.env.OZLOGGER_OUTPUT;
		delete process.env.OZLOGGER_DATETIME;
	});

	describe('json output', () => {
		beforeEach(() => {
			process.env.OZLOGGER_OUTPUT = 'json';
		});

		test('should return empty object when datetime is disabled', () => {
			process.env.OZLOGGER_DATETIME = 'false';
			const fn = datetime();
			expect(fn()).toEqual({});
		});

		test('should return object with timestamp when datetime is enabled', () => {
			process.env.OZLOGGER_DATETIME = 'true';
			const fn = datetime<{ timestamp?: string }>();
			const result = fn();
			expect(result.timestamp).toBeDefined();
			expect(result.timestamp).toMatch(
				/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
			);
		});
	});

	describe('text output', () => {
		beforeEach(() => {
			process.env.OZLOGGER_OUTPUT = 'text';
		});

		test('should return empty string when datetime is disabled', () => {
			process.env.OZLOGGER_DATETIME = 'false';
			const fn = datetime<string>();
			expect(fn()).toBe('');
		});

		test('should return timestamp string when datetime is enabled', () => {
			process.env.OZLOGGER_DATETIME = 'true';
			const fn = datetime<string>();
			const result = fn();
			expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		});
	});
});

describe('host', () => {
	afterEach(() => {
		delete process.env.OZLOGGER_SERVER;
	});

	test('should return default port and localhost when not set', () => {
		delete process.env.OZLOGGER_SERVER;
		expect(host()).toEqual([9898, 'localhost']);
	});

	test('should parse port only format: 9898', () => {
		process.env.OZLOGGER_SERVER = '9898';
		expect(host()).toEqual([9898, 'localhost']);
	});

	test('should parse colon port format: :9898', () => {
		process.env.OZLOGGER_SERVER = ':9899';
		expect(host()).toEqual([9899, 'localhost']);
	});

	test('should parse IPv4 format: 127.0.0.1:9898', () => {
		process.env.OZLOGGER_SERVER = '127.0.0.1:9900';
		expect(host()).toEqual([9900, '127.0.0.1']);
	});

	test('should parse IPv6 format: [::1]:9898', () => {
		process.env.OZLOGGER_SERVER = '[::1]:9901';
		expect(host()).toEqual([9901, '::1']);
	});

	test('should parse hostname format: localhost', () => {
		process.env.OZLOGGER_SERVER = 'myhost';
		expect(host()).toEqual([9898, 'myhost']);
	});

	test('should parse hostname:port format: localhost:9898', () => {
		process.env.OZLOGGER_SERVER = 'myhost:9902';
		expect(host()).toEqual([9902, 'myhost']);
	});

	test('should throw for unsupported format', () => {
		process.env.OZLOGGER_SERVER = 'invalid format here';
		expect(() => host()).toThrow('Unsupported HTTP server address');
	});
});

describe('getCircularReplacer', () => {
	test('should handle non-circular objects', () => {
		const obj = { a: 1, b: { c: 2 } };
		const result = JSON.stringify(obj, getCircularReplacer());
		expect(JSON.parse(result)).toEqual(obj);
	});

	test('should replace circular references with [Circular]', () => {
		const obj: Record<string, unknown> = { a: 1 };
		obj.self = obj;
		const result = JSON.stringify(obj, getCircularReplacer());
		expect(JSON.parse(result)).toEqual({ a: 1, self: '[Circular]' });
	});

	test('should handle nested circular references', () => {
		const obj: Record<string, unknown> = { a: { b: {} } };
		(obj.a as Record<string, unknown>).b = obj;
		const result = JSON.stringify(obj, getCircularReplacer());
		const parsed = JSON.parse(result);
		expect(parsed.a.b).toBe('[Circular]');
	});

	test('should handle arrays', () => {
		const arr: unknown[] = [1, 2, 3];
		const result = JSON.stringify(arr, getCircularReplacer());
		expect(JSON.parse(result)).toEqual([1, 2, 3]);
	});

	test('should handle null values', () => {
		const obj = { a: null, b: 1 };
		const result = JSON.stringify(obj, getCircularReplacer());
		expect(JSON.parse(result)).toEqual(obj);
	});
});

describe('getProcessInformation', () => {
	test('should return pid and ppid', () => {
		const info = getProcessInformation();
		expect(info.pid).toBe(process.pid);
		expect(info.ppid).toBe(process.ppid);
	});
});

describe('colorized', () => {
	afterEach(() => {
		delete process.env.OZLOGGER_COLORS;
	});

	test('should return functions for each level', () => {
		const colors = colorized();
		expect(typeof colors.DEBUG).toBe('function');
		expect(typeof colors.INFO).toBe('function');
		expect(typeof colors.AUDIT).toBe('function');
		expect(typeof colors.WARNING).toBe('function');
		expect(typeof colors.ERROR).toBe('function');
	});

	test('should return text as-is when colors disabled', () => {
		process.env.OZLOGGER_COLORS = 'false';
		const colors = colorized();
		expect(colors.INFO('test')).toBe('test');
	});

	test('should add color codes when colors enabled', () => {
		process.env.OZLOGGER_COLORS = 'true';
		const colors = colorized();
		const result = colors.INFO('test');
		expect(result).toContain('\x1b[');
		expect(result).toContain('test');
		expect(result).toContain('\x1b[0m');
	});

	test('should be frozen (immutable)', () => {
		const colors = colorized();
		expect(Object.isFrozen(colors)).toBe(true);
	});
});
