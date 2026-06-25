import { expect, describe, test, beforeEach, afterEach } from '@jest/globals';
import { trace } from '@opentelemetry/api';
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
		delete process.env.OZLOGGER_DATETIME;
	});

	describe('signature audit(_msg, body)', () => {
		test('writes _msg, audit_id and the body assigned whole (no body.0)', () => {
			logger.audit('alice login', { user: 'alice', action: 'login' });

			expect(logged.length).toBe(1);
			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('AUDIT');
			expect(output.severityNumber).toBe(12);
			expect(output._msg).toBe('alice login');
			expect(typeof output.audit_id).toBe('string');
			expect(output.audit_id.length).toBeGreaterThan(0);
			// Body is assigned whole — the `body.0` proxy is gone.
			expect(output.body).toEqual({ user: 'alice', action: 'login' });
			expect(output.body['0']).toBeUndefined();
		});

		test('a scalar body is the value itself', () => {
			logger.audit('the answer', 42);

			const output = JSON.parse(logged[0]);
			expect(output.body).toBe(42);
			expect(output._msg).toBe('the answer');
		});

		test('_time is always present (ISO) regardless of OZLOGGER_DATETIME', () => {
			logger.audit('no datetime flag', { a: 1 });
			const output = JSON.parse(logged[0]);
			expect(typeof output._time).toBe('string');
			expect(new Date(output._time).toISOString()).toBe(output._time);
		});

		test('serializes objects with circular references', () => {
			const data: Record<string, unknown> = { id: 1 };
			data.self = data;

			expect(() => logger.audit('circular', data)).not.toThrow();
			expect(logged.length).toBe(1);
			expect(JSON.parse(logged[0]).severityText).toBe('AUDIT');
		});
	});

	describe('envelope isolation (§6.3 / §6.4)', () => {
		test('caller keys cannot overwrite reserved envelope fields', () => {
			logger.audit('teste', {
				a: 1,
				LEVEL: 'override',
				level: 'override',
				tag: 'override',
				audit_id: 'override'
			});

			const output = JSON.parse(logged[0]);
			expect(output.level).toBe('AUDIT');
			expect(output.tag).toBe('AUDIT-TEST');
			expect(output.audit_id).not.toBe('override');
			// The caller keys stay nested under body.
			expect(output.body.LEVEL).toBe('override');
			expect(output.body.level).toBe('override');
			expect(output.body.tag).toBe('override');
			expect(output.body.audit_id).toBe('override');
		});

		test('does not include pid/ppid/traceId/spanId even within an active span', () => {
			const tracer = trace.getTracer('audit-test');
			tracer.startActiveSpan('op', (span) => {
				logger.audit('within span', { ok: true });
				span.end();
			});

			const output = JSON.parse(logged[0]);
			expect(output.pid).toBeUndefined();
			expect(output.ppid).toBeUndefined();
			expect(output.traceId).toBeUndefined();
			expect(output.spanId).toBeUndefined();
			expect(output.host).toBeUndefined();
			expect(output.tenant).toBeUndefined();
		});

		test('does not auto-mask PII (email/cpf stay visible)', () => {
			logger.audit('signup', {
				email: 'alice@example.com',
				cpf: '123.456.789-00'
			});

			const output = JSON.parse(logged[0]);
			expect(output.body.email).toBe('alice@example.com');
			expect(output.body.cpf).toBe('123.456.789-00');
		});
	});

	describe('usage errors throw (programming mistakes)', () => {
		test('throws when called with no arguments', () => {
			// @ts-expect-error - testing invalid input
			expect(() => logger.audit()).toThrow(/exactly two arguments/);
			expect(logged.length).toBe(0);
		});

		test('throws when called with a single argument', () => {
			// @ts-expect-error - testing invalid input
			expect(() => logger.audit({ a: 1 })).toThrow(
				/exactly two arguments/
			);
			expect(logged.length).toBe(0);
		});

		test('throws when called with more than two arguments', () => {
			// @ts-expect-error - testing invalid input
			expect(() => logger.audit('m', { a: 1 }, { b: 2 })).toThrow(
				/exactly two arguments/
			);
			expect(logged.length).toBe(0);
		});

		test('throws when the message is not a string', () => {
			// @ts-expect-error - testing invalid input
			expect(() => logger.audit({ not: 'a string' }, {})).toThrow(
				/first argument \(_msg\) to be a string/
			);
			expect(logged.length).toBe(0);
		});

		test('throws (arg count) even when the audit level is disabled', () => {
			logger.changeLevel('error');
			logged = [];

			// @ts-expect-error - testing invalid input
			expect(() => logger.audit('a', 'b', 'c')).toThrow(
				/exactly two arguments/
			);
			// A valid call is simply not emitted while disabled.
			expect(() => logger.audit('ok', { ok: true })).not.toThrow();
			expect(logged.length).toBe(0);
		});
	});

	describe('runtime data problems are dropped with an error (never crash)', () => {
		test('drops an oversized body and logs an error with the audit_id', () => {
			const huge = { blob: 'x'.repeat(300 * 1024) };

			expect(() => logger.audit('oversize', huge)).not.toThrow();

			// The audit record is dropped; only the error log is emitted.
			expect(logged.length).toBe(1);
			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('ERROR');
			expect(output.body['0']).toContain('exceeds the safe limit');
			expect(output.body['0']).toContain('audit_id=');
		});

		test('drops an unserializable body and logs an error', () => {
			// BigInt cannot be serialized by JSON.stringify, so it fails at runtime.
			const bad = { value: BigInt(9007199254740991) };

			expect(() => logger.audit('bad', bad)).not.toThrow();

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
			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('AUDIT');
			expect(output._msg).toContain('audit-op:');
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
