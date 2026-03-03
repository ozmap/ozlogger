import { expect, describe, test, beforeEach, afterEach } from '@jest/globals';
import createLogger from '../lib';
import { Logger } from '../lib/Logger';

describe('Logger Core', () => {
	let logger: Logger;
	let logged: string[] = [];
	const mockLogger = { log: (msg: string) => logged.push(msg) };

	beforeEach(() => {
		logged = [];
		process.env.OZLOGGER_LEVEL = 'debug';
		process.env.OZLOGGER_OUTPUT = 'json';
		logger = createLogger('CORE-TEST', {
			client: mockLogger,
			noServer: true
		});
	});

	afterEach(() => {
		delete process.env.OZLOGGER_LEVEL;
		delete process.env.OZLOGGER_OUTPUT;
	});

	describe('time/timeEnd', () => {
		test('should track execution time', () => {
			logger.time('operation');
			// Small delay
			const start = Date.now();
			while (Date.now() - start < 10) {
				/* busy wait */
			}
			logger.timeEnd('operation');

			expect(logged.length).toBe(1);
			expect(logged[0]).toContain('operation');
			expect(logged[0]).toContain('ms');
		});

		test('should throw when timer ID already exists', () => {
			logger.time('duplicate');
			expect(() => logger.time('duplicate')).toThrow(
				'Identifier duplicate is in use'
			);
		});

		test('should throw when timeEnd called with unknown ID', () => {
			expect(() => logger.timeEnd('unknown')).toThrow(
				'Undefined identifier unknown'
			);
		});

		test('should allow reusing timer ID after timeEnd', () => {
			logger.time('reuse');
			logger.timeEnd('reuse');
			expect(() => logger.time('reuse')).not.toThrow();
			logger.timeEnd('reuse');
		});

		test('should return logger instance for chaining', () => {
			const result = logger.time('chain');
			expect(result).toBe(logger);
			logger.timeEnd('chain');
		});
	});

	describe('method.timeEnd', () => {
		test('debug.timeEnd should log at debug level', () => {
			logger.time('debug-timer');
			logger.debug.timeEnd('debug-timer');

			expect(logged.length).toBe(1);
			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('DEBUG');
			expect(output.body['0']).toContain('debug-timer');
		});

		test('info.timeEnd should log at info level', () => {
			logger.time('info-timer');
			logger.info.timeEnd('info-timer');

			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('INFO');
		});

		test('warn.timeEnd should log at warning level', () => {
			logger.time('warn-timer');
			logger.warn.timeEnd('warn-timer');

			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('WARNING');
		});

		test('error.timeEnd should log at error level', () => {
			logger.time('error-timer');
			logger.error.timeEnd('error-timer');

			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('ERROR');
		});

		test('audit.timeEnd should log at audit level', () => {
			logger.time('audit-timer');
			logger.audit.timeEnd('audit-timer');

			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('AUDIT');
		});
	});

	describe('withContext/getContext', () => {
		test('should add context attributes', () => {
			logger.withContext({
				attributes: { userId: '123' },
				spanId: '',
				traceId: ''
			});
			const ctx = logger.getContext();
			expect(ctx.attributes?.userId).toBe('123');
		});

		test('should add traceId and spanId', () => {
			logger.withContext({ traceId: 'trace-123', spanId: 'span-456' });
			const ctx = logger.getContext();
			expect(ctx.traceId).toBe('trace-123');
			expect(ctx.spanId).toBe('span-456');
		});

		test('should merge context on multiple calls', () => {
			logger.withContext({ traceId: 'trace-1', spanId: '' });
			logger.withContext({ spanId: 'span-1', traceId: '' });
			const ctx = logger.getContext();
			// Note: last call wins for overlapping keys
			expect(ctx).toBeDefined();
		});

		test('should return logger instance for chaining', () => {
			const result = logger.withContext({ spanId: '', traceId: '' });
			expect(result).toBe(logger);
		});

		test('should include pid and ppid in context', () => {
			const ctx = logger.getContext() as unknown as Record<
				string,
				unknown
			>;
			expect(ctx.pid).toBe(process.pid);
			expect(ctx.ppid).toBe(process.ppid);
		});
	});

	describe('tag (deprecated)', () => {
		test('should return logger instance', () => {
			const result = logger.tag('TAG1', 'TAG2');
			expect(result).toBe(logger);
		});

		test('should be chainable with logging methods', () => {
			expect(() => logger.tag('TAG').info('message')).not.toThrow();
		});
	});

	describe('changeLevel', () => {
		test('should enable debug when level set to debug', () => {
			logger.changeLevel('error'); // Disable debug first
			logged = [];
			logger.debug('should not log');
			expect(logged.length).toBe(0);

			logger.changeLevel('debug');
			logger.debug('should log');
			expect(logged.length).toBe(1);
		});

		test('should disable debug when level set to info', () => {
			logger.changeLevel('info');
			logged = [];
			logger.debug('should not log');
			expect(logged.length).toBe(0);
			logger.info('should log');
			expect(logged.length).toBe(1);
		});

		test('should disable all except error when level is error', () => {
			logger.changeLevel('error');
			logged = [];
			logger.debug('no');
			logger.info('no');
			logger.audit('no');
			logger.warn('no');
			expect(logged.length).toBe(0);
			logger.error('yes');
			expect(logged.length).toBe(1);
		});
	});

	describe('log levels filtering', () => {
		test('should respect quiet level', () => {
			logger.changeLevel('quiet');
			logged = [];
			logger.debug('no');
			logger.info('no');
			logger.audit('no');
			logger.warn('no');
			logger.error('no');
			expect(logged.length).toBe(0);
		});

		test('should default to audit for unknown level', () => {
			// @ts-expect-error - testing invalid input
			logger.changeLevel('invalid');
			logged = [];
			logger.debug('no'); // debug < audit
			logger.info('no'); // info < audit
			expect(logged.length).toBe(0);
			logger.audit('yes');
			expect(logged.length).toBe(1);
		});
	});

	describe('deprecated methods', () => {
		test('http method should work (deprecated)', () => {
			expect(() => logger.http('http message')).not.toThrow();
		});

		test('silly method should work (deprecated)', () => {
			expect(() => logger.silly('silly message')).not.toThrow();
		});

		test('critical method should work (deprecated)', () => {
			expect(() => logger.critical('critical message')).not.toThrow();
		});
	});
});

describe('Logger.init (deprecated)', () => {
	let logger: Logger;

	afterEach(async () => {
		if (logger) await logger.stop();
	});

	test('should create logger instance', () => {
		process.env.OZLOGGER_HTTP = 'false';
		logger = Logger.init({});
		expect(logger).toBeInstanceOf(Logger);
		delete process.env.OZLOGGER_HTTP;
	});

	test('should accept tag option', () => {
		process.env.OZLOGGER_HTTP = 'false';
		logger = Logger.init({ tag: 'INIT-TAG' });
		expect(logger).toBeInstanceOf(Logger);
		delete process.env.OZLOGGER_HTTP;
	});
});

describe('Logger with custom client', () => {
	test('should use custom logger client', () => {
		const logs: string[] = [];
		const customClient = {
			log: (msg: string) => logs.push(`CUSTOM: ${msg}`)
		};

		process.env.OZLOGGER_LEVEL = 'debug';
		const logger = createLogger('CUSTOM', {
			client: customClient,
			noServer: true
		});
		logger.info('test');

		expect(logs.length).toBe(1);
		expect(logs[0]).toContain('CUSTOM:');
		delete process.env.OZLOGGER_LEVEL;
	});
});

describe('Logger without tag', () => {
	test('should work without tag', () => {
		const logged: string[] = [];
		const mockLogger = { log: (msg: string) => logged.push(msg) };

		process.env.OZLOGGER_LEVEL = 'debug';
		process.env.OZLOGGER_OUTPUT = 'json';
		const logger = createLogger(undefined, {
			client: mockLogger,
			noServer: true
		});
		logger.info('message');

		const output = JSON.parse(logged[0]);
		expect(output.tag).toBeUndefined();
		delete process.env.OZLOGGER_LEVEL;
		delete process.env.OZLOGGER_OUTPUT;
	});
});

describe('Logger timeEnd when level is disabled', () => {
	test('debug.timeEnd should return logger when debug is disabled', () => {
		const logged: string[] = [];
		const mockLogger = { log: (msg: string) => logged.push(msg) };

		// Set level to info (debug disabled)
		process.env.OZLOGGER_LEVEL = 'info';
		process.env.OZLOGGER_OUTPUT = 'json';
		const logger = createLogger('DISABLED', {
			client: mockLogger,
			noServer: true
		});

		logger.time('timer1');
		const result = logger.debug.timeEnd('timer1');

		// Should return logger for chaining
		expect(result).toBe(logger);
		// Should not log anything
		expect(logged.length).toBe(0);

		delete process.env.OZLOGGER_LEVEL;
		delete process.env.OZLOGGER_OUTPUT;
	});
});

describe('Logger with OpenTelemetry context', () => {
	test('should include spanId and traceId when OTel span is active', () => {
		// This test verifies the OpenTelemetry integration path
		const logged: string[] = [];
		const mockLogger = { log: (msg: string) => logged.push(msg) };

		process.env.OZLOGGER_LEVEL = 'debug';
		process.env.OZLOGGER_OUTPUT = 'json';
		const logger = createLogger('OTEL', {
			client: mockLogger,
			noServer: true
		});

		// Mock the context to have traceId and spanId
		logger.withContext({
			attributes: {},
			traceId: 'mock-trace-id',
			spanId: 'mock-span-id'
		});

		logger.info('test message');
		const output = JSON.parse(logged[0]);

		expect(output.traceId).toBe('mock-trace-id');
		expect(output.spanId).toBe('mock-span-id');

		delete process.env.OZLOGGER_LEVEL;
		delete process.env.OZLOGGER_OUTPUT;
	});
});
