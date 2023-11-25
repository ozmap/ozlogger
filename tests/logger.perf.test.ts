import { expect, test } from '@jest/globals';
import createLogger, { OZLogger } from '../lib';

const logger: OZLogger = createLogger('perf', {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	log: (msg: string) => {}
});

describe('OZLogger performance test suite.', () => {
	// Wait for the HTTP server to be up
	beforeAll(async () => new Promise((r) => setTimeout(r, 1500)));

	afterAll(() => logger.stop());

	test('Must process 200K+ string only messages in 1s', () => {
		let counter = 0;
		const start = Date.now();

		while (Date.now() - start < 1000) {
			logger.info('1', '2', '3', '4', '5');
			++counter;
		}

		logger.info(`${counter} msg/s`);
		expect(counter).toBeGreaterThan(200000);
	});
});
