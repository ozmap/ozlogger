import {
	expect,
	describe,
	test,
	beforeEach,
	afterEach,
	jest
} from '@jest/globals';
import { broadcastEvent } from '../lib/util/Events';
import createLogger, { Logger } from '../lib';
import cluster from 'cluster';

// Store original listeners to restore after tests
const originalListeners = process.listeners('message');

// Jest sets process.send for test communication, we need to mock it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalProcessSend = (process as any).send;

describe('Events', () => {
	beforeEach(() => {
		// Remove all message listeners before each test
		process.removeAllListeners('message');
		// Mock process.send as undefined to simulate non-clustered environment
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(process as any).send = undefined;
	});

	afterEach(() => {
		// Remove all listeners added during tests
		process.removeAllListeners('message');
		// Restore original listeners
		originalListeners.forEach((l) => process.on('message', l));
		// Restore process.send
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(process as any).send = originalProcessSend;
	});

	describe('broadcastEvent', () => {
		test('should emit message event on process when not clustered', () => {
			let receivedData: { event: string; test?: string } | null = null;

			const handler = (data: { event: string; test: string }) => {
				receivedData = data;
			};

			process.on('message', handler);
			broadcastEvent('test.event', { test: 'value' });

			expect(receivedData).not.toBeNull();
			expect(receivedData!.event).toBe('test.event');
			expect(receivedData!.test).toBe('value');
		});

		test('should include event name in payload', () => {
			let receivedEvent: string | null = null;

			const handler = (data: { event: string }) => {
				receivedEvent = data.event;
			};

			process.on('message', handler);
			broadcastEvent('my.custom.event', {});

			expect(receivedEvent).toBe('my.custom.event');
		});

		test('should work with empty data object', () => {
			let receivedData: { event: string } | null = null;

			const handler = (data: { event: string }) => {
				receivedData = data;
			};

			process.on('message', handler);
			broadcastEvent('empty.event');

			expect(receivedData).not.toBeNull();
			expect(receivedData!.event).toBe('empty.event');
		});
	});
});

describe('Logger changeLevel event integration', () => {
	let logger: Logger;
	let logged: string[] = [];
	const mockLogger = { log: (msg: string) => logged.push(msg) };

	beforeEach(() => {
		// Remove all message listeners before each test
		process.removeAllListeners('message');
		logged = [];
		process.env.OZLOGGER_LEVEL = 'info';
		process.env.OZLOGGER_OUTPUT = 'json';
		logger = createLogger('LEVEL-TEST', {
			client: mockLogger,
			noServer: true
		});
	});

	afterEach(async () => {
		// Stop the logger to clean up timeouts
		await logger.stop();
		// Remove all listeners added during tests
		process.removeAllListeners('message');
		delete process.env.OZLOGGER_LEVEL;
		delete process.env.OZLOGGER_OUTPUT;
	});

	test('should change log level via event', (done) => {
		// Initially debug should be disabled (level is info)
		logger.debug('should not log');
		expect(logged.length).toBe(0);

		// Emit changeLevel event
		process.emit(
			'message' as NodeJS.Signals,
			{
				event: 'ozlogger.http.changeLevel',
				level: 'debug',
				duration: 500
			} as unknown as NodeJS.Signals
		);

		setTimeout(() => {
			logger.debug('should log now');
			expect(logged.length).toBe(1);
			done();
		}, 50);
	});

	test('should revert level after duration', (done) => {
		// Emit changeLevel event with short duration
		process.emit(
			'message' as NodeJS.Signals,
			{
				event: 'ozlogger.http.changeLevel',
				level: 'debug',
				duration: 100
			} as unknown as NodeJS.Signals
		);

		setTimeout(() => {
			logger.debug('should log');
			expect(logged.length).toBe(1);
		}, 20);

		// After duration, level should revert
		setTimeout(() => {
			logged = [];
			logger.debug('should not log');
			expect(logged.length).toBe(0);
			done();
		}, 200);
	});
});

describe('broadcastEvent cluster mode', () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const originalClusterIsWorker = (cluster as any).isWorker;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const originalClusterWorkers = (cluster as any).workers;

	afterEach(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(process as any).send = originalProcessSend;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(cluster as any).isWorker = originalClusterIsWorker;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(cluster as any).workers = originalClusterWorkers;
	});

	test('should not broadcast when running as worker', () => {
		// Simulate clustered environment as worker
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(process as any).send = jest.fn();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(cluster as any).isWorker = true;

		let received = false;
		process.on('message', () => {
			received = true;
		});

		broadcastEvent('test.event', { test: 'value' });

		// Should not emit when running as worker
		expect(received).toBe(false);
		process.removeAllListeners('message');
	});

	test('should broadcast to workers when running as primary', () => {
		// Simulate clustered environment as primary
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(process as any).send = jest.fn();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(cluster as any).isWorker = false;

		const mockWorkerSend = jest.fn();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(cluster as any).workers = {
			'1': { send: mockWorkerSend },
			'2': { send: mockWorkerSend },
			'3': null // Worker without send (disconnected)
		};

		broadcastEvent('test.event', { data: 'test' });

		// Should call send on each valid worker
		expect(mockWorkerSend).toHaveBeenCalledTimes(2);
		expect(mockWorkerSend).toHaveBeenCalledWith({
			data: 'test',
			event: 'test.event'
		});
	});

	test('should handle empty workers object', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(process as any).send = jest.fn();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(cluster as any).isWorker = false;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(cluster as any).workers = {};

		// Should not throw
		expect(() => broadcastEvent('test.event')).not.toThrow();
	});
});
