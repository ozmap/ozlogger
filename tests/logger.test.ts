import { expect, test } from '@jest/globals';
import { OZLogger } from '../lib';
import LoggerConfigOptions from '../lib/interfaces/LoggerConfigOptions';

// Configuration payload for the OZLogger
const config: LoggerConfigOptions = {
	app: 'OZLogger',
	filename: 'logs/test.log',
	level: 'DEBUG'
};

describe('OZLogger Class test suite.', () => {
	test('OZLogger must have init method.', () => {
		expect(typeof OZLogger['init'] === 'function').toBe(true);
		expect(OZLogger.init(config) instanceof OZLogger).toBe(true);
	});

	test('OZLogger must have debug method.', () => {
		expect(typeof OZLogger['debug'] === 'function').toBe(true);
		expect(() => OZLogger.debug('debug message log')).not.toThrow(Error);
	});

	test('OZLogger must have http method.', () => {
		expect(typeof OZLogger['http'] === 'function').toBe(true);
		expect(() => OZLogger.http('http message log')).not.toThrow(Error);
	});

	test('OZLogger must have info method.', () => {
		expect(typeof OZLogger['info'] === 'function').toBe(true);
		expect(() => OZLogger.info('information message log')).not.toThrow(
			Error
		);
	});

	test('OZLogger must have warn method.', () => {
		expect(typeof OZLogger['warn'] === 'function').toBe(true);
		expect(() => OZLogger.warn('warning message log')).not.toThrow(Error);
	});

	test('OZLogger must have error method.', () => {
		expect(typeof OZLogger['error'] === 'function').toBe(true);
		expect(() => OZLogger.error('error message log')).not.toThrow(Error);
	});
});
