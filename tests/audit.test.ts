import { expect, describe, test, beforeEach, afterEach } from '@jest/globals';
import createLogger, { Logger } from '../lib';

describe('audit (VictoriaLogs ingestion contract)', () => {
	let logger: Logger;
	let logged: string[] = [];
	const mockLogger = { log: (msg: string) => logged.push(msg) };

	beforeEach(() => {
		logged = [];
		process.env.OZLOGGER_OUTPUT = 'json';
		process.env.OZLOGGER_LEVEL = 'audit';
		logger = createLogger('AUDIT-TEST', {
			client: mockLogger,
			noServer: true
		});
	});

	afterEach(() => {
		delete process.env.OZLOGGER_OUTPUT;
		delete process.env.OZLOGGER_LEVEL;
	});

	describe('valid usage', () => {
		test('writes a single JSON object as the audit body', () => {
			logger.audit({ user: 'alice', action: 'login' });

			expect(logged.length).toBe(1);
			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('AUDIT');
			expect(output.body['0']).toEqual({
				user: 'alice',
				action: 'login'
			});
		});

		test('serializes objects with circular references', () => {
			const data: Record<string, unknown> = { id: 1 };
			data.self = data;

			expect(() => logger.audit(data)).not.toThrow();
			expect(logged.length).toBe(1);
			expect(JSON.parse(logged[0]).severityText).toBe('AUDIT');
		});

		test('accepts a single value of any type (string, number, array)', () => {
			logger.audit('a plain string');
			logger.audit(42);
			logger.audit([1, 2, 3]);

			expect(logged.length).toBe(3);
			expect(JSON.parse(logged[0]).body['0']).toBe('a plain string');
			expect(JSON.parse(logged[1]).body['0']).toBe(42);
			expect(JSON.parse(logged[2]).body['0']).toEqual([1, 2, 3]);
		});
	});

	describe('usage errors throw (programming mistakes)', () => {
		test('throws when called with no arguments', () => {
			// @ts-expect-error - testing invalid input
			expect(() => logger.audit()).toThrow(/exactly one argument/);
			expect(logged.length).toBe(0);
		});

		test('throws when called with more than one argument', () => {
			// @ts-expect-error - testing invalid input
			expect(() => logger.audit({ a: 1 }, { b: 2 })).toThrow(
				/exactly one argument/
			);
			expect(logged.length).toBe(0);
		});

		test('throws (arg count) even when the audit level is disabled', () => {
			logger.changeLevel('error');
			logged = [];

			// @ts-expect-error - testing invalid input
			expect(() => logger.audit('a', 'b')).toThrow(
				/exactly one argument/
			);
			// A valid single value is simply not emitted while disabled.
			expect(() => logger.audit({ ok: true })).not.toThrow();
			expect(logged.length).toBe(0);
		});
	});

	describe('runtime data problems are dropped with an error (never crash)', () => {
		test('drops an oversized body and logs an error', () => {
			const huge = { blob: 'x'.repeat(300 * 1024) };

			expect(() => logger.audit(huge)).not.toThrow();

			// The audit record is dropped; only the error log is emitted.
			expect(logged.length).toBe(1);
			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('ERROR');
			expect(output.body['0']).toContain('exceeds the safe limit');
		});

		test('drops an unserializable body and logs an error', () => {
			// BigInt is a valid Record value at the type level but cannot be
			// serialized by JSON.stringify, so it fails at runtime.
			const bad = { value: BigInt(9007199254740991) };

			expect(() => logger.audit(bad)).not.toThrow();

			expect(logged.length).toBe(1);
			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('ERROR');
			expect(output.body['0']).toContain('could not serialize');
		});
	});

	describe('timer helper remains available', () => {
		test('audit.timeEnd logs the elapsed time at audit level', () => {
			logger.time('audit-op');
			logger.audit.timeEnd('audit-op');

			expect(logged.length).toBe(1);
			expect(JSON.parse(logged[0]).severityText).toBe('AUDIT');
		});

		test('audit.timeEnd cleans up the timer when audit is disabled', () => {
			logger.changeLevel('error');
			logged = [];

			logger.time('audit-op');
			expect(() => logger.audit.timeEnd('audit-op')).not.toThrow();
			expect(logged.length).toBe(0);
		});
	});
});
