import { expect, describe, test, beforeEach, afterEach } from '@jest/globals';
import createLogger from '../lib';
import { Logger } from '../lib/Logger';

describe('Logger Timer Duplicate', () => {
	let logger: Logger;
	let logged: string[] = [];
	const mockLogger = { log: (msg: string) => logged.push(msg) };

	beforeEach(() => {
		logged = [];
		process.env.OZLOGGER_LEVEL = 'debug';
		process.env.OZLOGGER_OUTPUT = 'json';
		logger = createLogger('TIMER-DUP', {
			client: mockLogger,
			noServer: true
		});
	});

	afterEach(async () => {
		delete process.env.OZLOGGER_LEVEL;
		delete process.env.OZLOGGER_OUTPUT;
		if (logger) await logger.stop();
	});

	test('should NOT throw when timer ID already exists', () => {
		// First call
		logger.time('duplicate');

		// Second call with same ID should not throw
		expect(() => logger.time('duplicate')).not.toThrow();
	});

	test('should warn when overwriting existing timer', () => {
		logger.time('duplicate-warn');

		// Clear logs from first call (if any)
		logged = [];

		// Second call
		logger.time('duplicate-warn');

		expect(logged.length).toBe(1);
		const output = JSON.parse(logged[0]);
		expect(output.severityText).toBe('WARNING');
		expect(output.body['0']).toContain('duplicate-warn');
		expect(output.body['0']).toContain('already in use');
		expect(output.body['0']).toContain('Overwriting');
	});

	test('should reset timer start time on overwrite', async () => {
		logger.time('overwrite-test');

		// Wait 50ms
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Overwrite
		logger.time('overwrite-test');

		// End timer immediately
		logger.timeEnd('overwrite-test');

		// logged[0] -> primeiro time() (não deve ter warning)
		// logged[1] -> segundo time() (warning)
		// logged[2] -> timeEnd() (info)

		// Mas espere, logged foi limpo no beforeEach? Sim.
		// No teste atual, não limpei logged.

		// Chamadas:
		// 1. time('overwrite-test') -> OK (0 logs)
		// 2. time('overwrite-test') -> Warning (1 log)
		// 3. timeEnd('overwrite-test') -> Info (1 log)

		expect(logged.length).toBe(2); // 1 warning + 1 info

		const warningLog = JSON.parse(logged[0]);
		expect(warningLog.severityText).toBe('WARNING');

		const infoLog = JSON.parse(logged[1]);
		expect(infoLog.severityText).toBe('INFO');

		const durationStr = infoLog.body['0'];
		// "overwrite-test: X ms"
		const duration = parseInt(durationStr.split(': ')[1]);

		// Duration should be close to 0 (since check was reset), not > 50
		expect(duration).toBeLessThan(20);
	});
});
