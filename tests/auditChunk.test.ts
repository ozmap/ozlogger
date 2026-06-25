import { expect, describe, test, jest } from '@jest/globals';
// Import the util DIRECTLY (not through ../lib) to prove it is usable without
// the Logger and produces no side effects.
import {
	SAFE_LINE_BYTES,
	auditId,
	byteLen,
	heavyMarker,
	splitFirstLevel,
	chunkArrayByBytes,
	chunkStringByBytes,
	countChunks,
	splitAuditBody
} from '../lib/util/AuditChunk';
import { createHash } from 'crypto';

describe('AuditChunk (reusable pure split util)', () => {
	describe('purity / reusability', () => {
		test('produces no stdout/stderr output when run', () => {
			const out = jest
				.spyOn(process.stdout, 'write')
				.mockImplementation(() => true);
			const err = jest
				.spyOn(process.stderr, 'write')
				.mockImplementation(() => true);

			splitAuditBody({ blob: 'x'.repeat(SAFE_LINE_BYTES + 10) });
			chunkArrayByBytes([1, 2, 3], 1024);
			chunkStringByBytes('abc', 1024);
			auditId();
			byteLen({ a: 1 });

			expect(out).not.toHaveBeenCalled();
			expect(err).not.toHaveBeenCalled();

			out.mockRestore();
			err.mockRestore();
		});

		test('SAFE_LINE_BYTES is 200KB', () => {
			expect(SAFE_LINE_BYTES).toBe(200 * 1024);
		});
	});

	describe('auditId', () => {
		test('returns a 26-char Crockford Base32 ULID', () => {
			const id = auditId();
			expect(id).toHaveLength(26);
			expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
		});

		test('returns distinct ids on consecutive calls', () => {
			const ids = new Set(Array.from({ length: 100 }, () => auditId()));
			expect(ids.size).toBe(100);
		});
	});

	describe('byteLen', () => {
		test('measures UTF-8 bytes of the serialized value', () => {
			expect(byteLen('abc')).toBe(3);
			expect(byteLen('café')).toBe(5); // é is 2 bytes
			expect(byteLen({ a: 1 })).toBe(Buffer.byteLength('{"a":1}'));
		});
	});

	describe('heavyMarker', () => {
		test('builds { ref, type, bytes, sha1 } for a string', () => {
			const value = 'x'.repeat(1000);
			const marker = heavyMarker('result_csv', value);

			expect(marker).toEqual({
				ref: 'body.result_csv',
				type: 'string',
				bytes: 1000,
				sha1: createHash('sha1').update(value).digest('hex')
			});
		});

		test('reports type "array" for arrays', () => {
			const marker = heavyMarker('ids', [1, 2, 3]);
			expect(marker.type).toBe('array');
			expect(marker.ref).toBe('body.ids');
		});
	});

	describe('chunkArrayByBytes', () => {
		test('splits by bytes and the parts concatenate back to the original', () => {
			const arr = Array.from({ length: 5000 }, (_, i) => `id-${i}`);
			const parts = chunkArrayByBytes(arr, 1024);

			expect(parts.length).toBeGreaterThan(1);
			for (const part of parts) {
				expect(byteLen(part)).toBeLessThanOrEqual(1024);
			}
			expect(parts.flat()).toEqual(arr);
		});

		test('keeps an oversized single element alone', () => {
			const big = 'x'.repeat(2048);
			const parts = chunkArrayByBytes(['a', big, 'b'], 1024);
			expect(parts.flat()).toEqual(['a', big, 'b']);
			expect(parts.some((p) => p.length === 1 && p[0] === big)).toBe(
				true
			);
		});
	});

	describe('chunkStringByBytes', () => {
		test('splits by bytes and concatenates back to the original', () => {
			const str = 'x'.repeat(5000);
			const parts = chunkStringByBytes(str, 1024);

			expect(parts.length).toBe(5);
			for (const part of parts) {
				expect(Buffer.byteLength(part, 'utf8')).toBeLessThanOrEqual(
					1024
				);
			}
			expect(parts.join('')).toBe(str);
		});

		test('never splits a multi-byte UTF-8 character', () => {
			const str = '😀'.repeat(500); // each emoji is 4 bytes
			const parts = chunkStringByBytes(str, 10);

			for (const part of parts) {
				expect(Buffer.byteLength(part, 'utf8')).toBeLessThanOrEqual(10);
			}
			expect(parts.join('')).toBe(str);
		});
	});

	describe('splitFirstLevel', () => {
		test('keeps small values inline and marks oversized values', () => {
			const big = 'x'.repeat(SAFE_LINE_BYTES + 10);
			const { skeleton, heavy } = splitFirstLevel(
				{ action: 'report', user: 'alice', result_csv: big },
				SAFE_LINE_BYTES
			);

			expect(skeleton.action).toBe('report');
			expect(skeleton.user).toBe('alice');
			expect(skeleton.result_csv).toEqual({
				ref: 'body.result_csv',
				type: 'string',
				bytes: SAFE_LINE_BYTES + 10,
				sha1: createHash('sha1').update(big).digest('hex')
			});
			expect(heavy.map(([k]) => k)).toEqual(['result_csv']);
		});

		test('moves out the largest field when many medium values overflow', () => {
			// No single field exceeds the limit, but together they do. The
			// values are large enough that replacing one with a marker (~85
			// bytes) brings the skeleton back under the limit.
			const body = {
				a: 'a'.repeat(500),
				b: 'b'.repeat(1500),
				c: 'c'.repeat(500)
			};
			const { skeleton, heavy } = splitFirstLevel(body, 2000);

			expect(byteLen(skeleton)).toBeLessThanOrEqual(2000);
			// 'b' is the largest and is the first to be moved out.
			expect(heavy.map(([k]) => k)).toContain('b');
		});

		test('stops when only markers remain (cannot shrink further)', () => {
			const body = {
				a: 'a'.repeat(40),
				b: 'b'.repeat(40)
			};
			// Tiny limit forces every field to become a marker.
			const { skeleton, heavy } = splitFirstLevel(body, 5);
			expect(heavy.length).toBe(2);
			expect((skeleton.a as { ref: string }).ref).toBe('body.a');
		});
	});

	describe('countChunks', () => {
		test('counts the segments the heavy entries will produce', () => {
			const arr = Array.from({ length: 5000 }, (_, i) => `id-${i}`);
			const heavy: Array<[string, unknown]> = [['ids', arr]];
			const expected = chunkArrayByBytes(arr, 1024).length;
			expect(countChunks(heavy, 1024)).toBe(expected);
		});
	});

	describe('splitAuditBody', () => {
		test('throws on a non-object body', () => {
			expect(() => splitAuditBody('a string')).toThrow(
				/plain object body/
			);
			expect(() => splitAuditBody([1, 2, 3])).toThrow(
				/plain object body/
			);
		});

		test('breaks an oversized array field into JSON segments', () => {
			const ids = Array.from({ length: 20000 }, (_, i) => `id-${i}`);
			const { header, segments } = splitAuditBody(
				{ action: 'bulk', affected_ids: ids },
				{ limit: 16 * 1024 }
			);

			expect(header.chunked).toBe(true);
			expect(header.body.action).toBe('bulk');
			expect((header.body.affected_ids as { ref: string }).ref).toBe(
				'body.affected_ids'
			);

			expect(segments.length).toBe(header.chunk_total);
			segments.forEach((seg, i) => {
				expect(seg.chunk_seq).toBe(i);
				expect(seg.chunk_total).toBe(header.chunk_total);
				expect(seg.chunk_field).toBe('body.affected_ids');
				expect('body' in seg).toBe(true);
				expect('chunk_part' in seg).toBe(false);
			});

			// Reconstruction: concatenate the array slices in order.
			const rebuilt = segments.flatMap(
				(seg) =>
					(seg as { body: Record<string, unknown> }).body
						.affected_ids as unknown[]
			);
			expect(rebuilt).toEqual(ids);
		});

		test('breaks an oversized scalar/blob field into text segments', () => {
			const blob = 'x'.repeat(SAFE_LINE_BYTES + 5000);
			const { header, segments } = splitAuditBody({
				action: 'export',
				result_csv: blob
			});

			expect(header.body.action).toBe('export');
			expect((header.body.result_csv as { type: string }).type).toBe(
				'string'
			);

			segments.forEach((seg) => {
				expect(seg.chunk_field).toBe('body.result_csv');
				expect('chunk_part' in seg).toBe(true);
				expect('body' in seg).toBe(false);
			});

			// Reconstruction: concatenate the text fractions in order.
			const rebuilt = segments
				.map((seg) => (seg as { chunk_part: string }).chunk_part)
				.join('');
			expect(rebuilt).toBe(blob);
		});

		test('spreads first-level keys across lines on field-count overflow', () => {
			const body: Record<string, number> = {};
			for (let i = 0; i < 10; i++) body[`k${i}`] = i;

			const { header, segments } = splitAuditBody(body, {
				limit: 1024 * 1024,
				maxFields: 4
			});

			expect(Object.keys(header.body).length).toBe(4);
			const fieldSegments = segments.filter(
				(s) => s.chunk_field === '(fields)'
			);
			expect(fieldSegments.length).toBe(2); // 4 + 4 + 2 = 10 keys
			const seenKeys = new Set<string>(Object.keys(header.body));
			for (const seg of fieldSegments) {
				for (const key of Object.keys(
					(seg as { body: Record<string, unknown> }).body
				)) {
					seenKeys.add(key);
				}
			}
			expect(seenKeys.size).toBe(10);
		});
	});
});
