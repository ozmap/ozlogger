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

	describe('oversize contingency (RFC §8): break, never drop', () => {
		test('breaks an oversized array field into correlated lines + ERROR', () => {
			const ids = Array.from({ length: 60000 }, (_, i) => `id-${i}`);

			expect(() =>
				logger.audit('bulk.update', {
					action: 'update',
					affected_ids: ids
				})
			).not.toThrow();

			const records = logged.map((l) => JSON.parse(l));
			const error = records.find((r) => r.severityText === 'ERROR');
			const header = records.find(
				(r) => r.severityText === 'AUDIT' && r.chunked
			);
			const segments = records.filter(
				(r) => r.severityText === 'AUDIT' && r.chunk_field !== undefined
			);

			// Nothing is dropped: header + segments + exactly one ERROR.
			expect(header).toBeDefined();
			expect(error).toBeDefined();
			expect(
				records.filter((r) => r.severityText === 'ERROR').length
			).toBe(1);
			expect(segments.length).toBeGreaterThan(0);

			// The ERROR is the AUDIT_OVERSIZE signal carrying the audit_id (§11d).
			expect(error.body['0']).toContain('AUDIT_OVERSIZE');
			expect(error.body['0']).toContain(`audit_id=${header.audit_id}`);
			expect(error.body['0']).toContain('§7');

			// Header keeps the first level inline; the heavy field is a marker.
			expect(header._msg).toBe('bulk.update');
			expect(header.body.action).toBe('update');
			expect(header.body.affected_ids.ref).toBe('body.affected_ids');
			expect(header.chunk_total).toBe(segments.length);

			// Correlation + sequencing; segments carry no _msg.
			segments.forEach((seg) => {
				expect(seg.audit_id).toBe(header.audit_id);
				expect(seg.chunk_field).toBe('body.affected_ids');
				expect(seg._msg).toBeUndefined();
				expect(seg.pid).toBeUndefined();
				expect(seg.traceId).toBeUndefined();
			});

			// Reconstruction by chunk_field rebuilds the original array.
			const rebuilt = segments
				.sort((a, b) => a.chunk_seq - b.chunk_seq)
				.flatMap((seg) => seg.body.affected_ids);
			expect(rebuilt).toEqual(ids);
		});

		test('breaks an oversized scalar/blob field into text segments', () => {
			const blob = 'x'.repeat(260 * 1024);

			logger.audit('export', { result_csv: blob });

			const records = logged.map((l) => JSON.parse(l));
			const segments = records.filter(
				(r) => r.severityText === 'AUDIT' && r.chunk_part !== undefined
			);
			expect(segments.length).toBeGreaterThan(0);

			const rebuilt = segments
				.sort((a, b) => a.chunk_seq - b.chunk_seq)
				.map((seg) => seg.chunk_part)
				.join('');
			expect(rebuilt).toBe(blob);
		});
	});

	describe('auditChunked (deprecated import contingency, RFC §9)', () => {
		test('a body that fits takes the normal single-line path (no chunks, no ERROR)', () => {
			logger.auditChunked('import.small', { count: 3 });

			expect(logged.length).toBe(1);
			const output = JSON.parse(logged[0]);
			expect(output.severityText).toBe('AUDIT');
			expect(output._msg).toBe('import.small');
			expect(output.body).toEqual({ count: 3 });
			expect(output.chunked).toBeUndefined();
			expect(output.chunk_field).toBeUndefined();
		});

		test('an oversized body is broken using the same util + ERROR', () => {
			const ids = Array.from({ length: 60000 }, (_, i) => `id-${i}`);

			logger.auditChunked('import.bulk', { ids });

			const records = logged.map((l) => JSON.parse(l));
			const header = records.find((r) => r.chunked);
			expect(header).toBeDefined();
			expect(
				records.filter((r) => r.severityText === 'ERROR').length
			).toBe(1);
			const error = records.find((r) => r.severityText === 'ERROR');
			expect(error.body['0']).toContain('AUDIT_OVERSIZE');

			// Reconstruction: the broken array round-trips from its segments.
			const rebuilt = records
				.filter((r) => r.chunk_field === 'body.ids')
				.sort((a, b) => a.chunk_seq - b.chunk_seq)
				.flatMap((seg) => seg.body.ids);
			expect(rebuilt).toEqual(ids);
		});

		test('still emits the mandatory AUDIT_OVERSIZE ERROR even at quiet level', () => {
			// The ERROR must never be gated away by the active level — it is the
			// signal that a break happened (RFC §8). Chunk lines emit regardless.
			logger.changeLevel('quiet');
			logged = [];

			logger.auditChunked('import.bulk', {
				ids: Array.from({ length: 60000 }, (_, i) => `id-${i}`)
			});

			const records = logged.map((l) => JSON.parse(l));
			const errors = records.filter((r) => r.severityText === 'ERROR');
			expect(errors.length).toBe(1);
			expect(errors[0].body['0']).toContain('AUDIT_OVERSIZE');
			expect(records.some((r) => r.chunked)).toBe(true);
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
