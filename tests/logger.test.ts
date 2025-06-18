import { expect, test } from '@jest/globals';
import createLogger, { Logger } from '../lib';

const logger: Logger = createLogger();

describe('OZLogger factory test suite.', () => {
	// Wait for the HTTP server to be up
	beforeAll(async () => new Promise((r) => setTimeout(r, 1500)));

	afterAll(() => logger.stop());

	test('logger must have time method.', () => {
		expect(typeof logger['time'] === 'function').toBe(true);
		expect(() => logger.time('test')).not.toThrow(Error);
	});

	test('logger must have timeEnd method.', () => {
		expect(typeof logger['timeEnd'] === 'function').toBe(true);
		expect(() => logger.timeEnd('test')).not.toThrow(Error);
	});

	test('logger must have debug method.', () => {
		expect(typeof logger['debug'] === 'function').toBe(true);
		expect(() => logger.debug('debug message log')).not.toThrow(Error);
		logger.time('test');
		expect(() => logger.debug.timeEnd('test')).not.toThrow(Error);
	});

	test('logger must have audit method.', () => {
		expect(typeof logger['audit'] === 'function').toBe(true);
		expect(() => logger.audit('audit message log')).not.toThrow(Error);
		logger.time('test');
		expect(() => logger.audit.timeEnd('test')).not.toThrow(Error);
	});

	test('logger must have info method.', () => {
		expect(typeof logger['info'] === 'function').toBe(true);
		expect(() => logger.info('information message log')).not.toThrow(Error);
		logger.time('test');
		expect(() => logger.info.timeEnd('test')).not.toThrow(Error);
	});

	test('logger must have warn method.', () => {
		expect(typeof logger['warn'] === 'function').toBe(true);
		expect(() => logger.warn('warning message log')).not.toThrow(Error);
		logger.time('test');
		expect(() => logger.warn.timeEnd('test')).not.toThrow(Error);
	});

	test('logger must have error method.', () => {
		expect(typeof logger['error'] === 'function').toBe(true);
		expect(() => logger.error('error message log')).not.toThrow(Error);
		logger.time('test');
		expect(() => logger.error.timeEnd('test')).not.toThrow(Error);
	});
});
