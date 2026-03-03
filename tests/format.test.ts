import { expect, describe, test, beforeEach, afterEach } from '@jest/globals';
import createLogger, { Logger } from '../lib';

describe('JSON Formatter', () => {
	let logger: Logger;
	let logged: string[] = [];
	const mockLogger = { log: (msg: string) => logged.push(msg) };

	beforeEach(() => {
		logged = [];
		process.env.OZLOGGER_OUTPUT = 'json';
		process.env.OZLOGGER_LEVEL = 'debug';
		logger = createLogger('JSON-TEST', {
			client: mockLogger,
			noServer: true
		});
	});

	afterEach(() => {
		delete process.env.OZLOGGER_OUTPUT;
		delete process.env.OZLOGGER_LEVEL;
	});

	test('should output valid JSON', () => {
		logger.info('test message');
		expect(logged.length).toBe(1);
		expect(() => JSON.parse(logged[0])).not.toThrow();
	});

	test('should include severityText and severityNumber', () => {
		logger.info('test');
		const output = JSON.parse(logged[0]);
		expect(output.severityText).toBe('INFO');
		expect(output.severityNumber).toBe(9);
	});

	test('should include tag when provided', () => {
		logger.info('test');
		const output = JSON.parse(logged[0]);
		expect(output.tag).toBe('JSON-TEST');
	});

	test('should include body with message', () => {
		logger.info('my message');
		const output = JSON.parse(logged[0]);
		expect(output.body['0']).toBe('my message');
	});

	test('should handle multiple arguments', () => {
		logger.info('arg1', 'arg2', 'arg3');
		const output = JSON.parse(logged[0]);
		expect(output.body['0']).toBe('arg1');
		expect(output.body['1']).toBe('arg2');
		expect(output.body['2']).toBe('arg3');
	});

	test('should handle objects', () => {
		const obj = { key: 'value', nested: { inner: true } };
		logger.info(obj);
		const output = JSON.parse(logged[0]);
		expect(output.body['0']).toEqual(obj);
	});

	test('should handle arrays', () => {
		const arr = [1, 2, 3];
		logger.info(arr);
		const output = JSON.parse(logged[0]);
		expect(output.body['0']).toEqual(arr);
	});

	test('should handle circular references', () => {
		const obj: Record<string, unknown> = { name: 'test' };
		obj.self = obj; // circular reference
		logger.info(obj);
		const output = JSON.parse(logged[0]);
		expect(output.body['0'].self).toBe('[Circular]');
	});

	test('should handle Error objects', () => {
		const error = new Error('test error');
		logger.error(error);
		const output = JSON.parse(logged[0]);
		expect(output.body['0']).toContain('Error');
	});

	test('should handle null and undefined', () => {
		logger.info(null, undefined);
		const output = JSON.parse(logged[0]);
		// Note: null becomes "null" string after normalize
		expect(output.body['0']).toBe('null');
		// undefined gets stringified
		expect(output.body['1']).toBeDefined();
	});

	test('should handle numbers', () => {
		logger.info(42, 3.14, -100);
		const output = JSON.parse(logged[0]);
		expect(output.body['0']).toBe(42);
		expect(output.body['1']).toBe(3.14);
		expect(output.body['2']).toBe(-100);
	});

	test('should handle booleans', () => {
		logger.info(true, false);
		const output = JSON.parse(logged[0]);
		expect(output.body['0']).toBe(true);
		expect(output.body['1']).toBe(false);
	});

	describe('Log levels', () => {
		test('debug level', () => {
			logger.debug('debug msg');
			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('DEBUG');
			expect(output.severityNumber).toBe(5);
		});

		test('info level', () => {
			logger.info('info msg');
			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('INFO');
			expect(output.severityNumber).toBe(9);
		});

		test('audit level', () => {
			logger.audit('audit msg');
			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('AUDIT');
			expect(output.severityNumber).toBe(12);
		});

		test('warn level', () => {
			logger.warn('warn msg');
			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('WARNING');
			expect(output.severityNumber).toBe(13);
		});

		test('error level', () => {
			logger.error('error msg');
			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('ERROR');
			expect(output.severityNumber).toBe(17);
		});
	});
});

describe('Text Formatter', () => {
	let logger: Logger;
	let logged: string[] = [];
	const mockLogger = { log: (msg: string) => logged.push(msg) };

	beforeEach(() => {
		logged = [];
		process.env.OZLOGGER_OUTPUT = 'text';
		process.env.OZLOGGER_LEVEL = 'debug';
		logger = createLogger('TEXT-TEST', {
			client: mockLogger,
			noServer: true
		});
	});

	afterEach(() => {
		delete process.env.OZLOGGER_OUTPUT;
		delete process.env.OZLOGGER_LEVEL;
	});

	test('should output text format', () => {
		logger.info('test message');
		expect(logged.length).toBe(1);
		expect(logged[0]).toContain('[INFO]');
		expect(logged[0]).toContain('TEXT-TEST');
		expect(logged[0]).toContain('test message');
	});

	test('should include level tag', () => {
		logger.debug('msg');
		expect(logged[0]).toContain('[DEBUG]');
	});

	test('should stringify objects', () => {
		logger.info({ key: 'value' });
		expect(logged[0]).toContain('key');
		expect(logged[0]).toContain('value');
	});

	test('should join multiple arguments with space', () => {
		logger.info('one', 'two', 'three');
		expect(logged[0]).toContain('one two three');
	});
});

describe('Text Formatter with datetime', () => {
	let logger: Logger;
	let logged: string[] = [];
	const mockLogger = { log: (msg: string) => logged.push(msg) };

	beforeEach(() => {
		logged = [];
		process.env.OZLOGGER_OUTPUT = 'text';
		process.env.OZLOGGER_LEVEL = 'debug';
		process.env.OZLOGGER_DATETIME = 'true';
		logger = createLogger('DT-TEST', {
			client: mockLogger,
			noServer: true
		});
	});

	afterEach(() => {
		delete process.env.OZLOGGER_OUTPUT;
		delete process.env.OZLOGGER_LEVEL;
		delete process.env.OZLOGGER_DATETIME;
	});

	test('should include timestamp in text output', () => {
		logger.info('test');
		// ISO timestamp format check
		expect(logged[0]).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
	});
});

describe('JSON Formatter with datetime', () => {
	let logger: Logger;
	let logged: string[] = [];
	const mockLogger = { log: (msg: string) => logged.push(msg) };

	beforeEach(() => {
		logged = [];
		process.env.OZLOGGER_OUTPUT = 'json';
		process.env.OZLOGGER_LEVEL = 'debug';
		process.env.OZLOGGER_DATETIME = 'true';
		logger = createLogger('DT-TEST', {
			client: mockLogger,
			noServer: true
		});
	});

	afterEach(() => {
		delete process.env.OZLOGGER_OUTPUT;
		delete process.env.OZLOGGER_LEVEL;
		delete process.env.OZLOGGER_DATETIME;
	});

	test('should include timestamp in JSON output', () => {
		logger.info('test');
		const output = JSON.parse(logged[0]);
		expect(output.timestamp).toBeDefined();
		expect(output.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
	});
});

describe('Colorized output', () => {
	let logger: Logger;
	let logged: string[] = [];
	const mockLogger = { log: (msg: string) => logged.push(msg) };

	beforeEach(() => {
		logged = [];
		process.env.OZLOGGER_OUTPUT = 'text';
		process.env.OZLOGGER_LEVEL = 'debug';
		process.env.OZLOGGER_COLORS = 'true';
		logger = createLogger('COLOR-TEST', {
			client: mockLogger,
			noServer: true
		});
	});

	afterEach(() => {
		delete process.env.OZLOGGER_OUTPUT;
		delete process.env.OZLOGGER_LEVEL;
		delete process.env.OZLOGGER_COLORS;
	});

	test('should include ANSI color codes when enabled', () => {
		logger.info('test');
		// Check for ANSI escape sequences
		// eslint-disable-next-line no-control-regex
		expect(logged[0]).toMatch(/\x1b\[\d+m/);
	});

	test('should include reset code at end', () => {
		logger.info('test');
		expect(logged[0]).toContain('\x1b[0m');
	});
});

describe('Format fallback behavior', () => {
	test('should fallback to json for invalid output format', () => {
		const logged: string[] = [];
		const mockLogger = { log: (msg: string) => logged.push(msg) };

		process.env.OZLOGGER_OUTPUT = 'invalid';
		process.env.OZLOGGER_LEVEL = 'debug';

		const logger = createLogger('TEST', {
			client: mockLogger,
			noServer: true
		});
		logger.info('test');

		// Should use json format as fallback
		expect(logged.length).toBe(1);
		expect(() => JSON.parse(logged[0])).not.toThrow();

		delete process.env.OZLOGGER_OUTPUT;
		delete process.env.OZLOGGER_LEVEL;
	});
});
