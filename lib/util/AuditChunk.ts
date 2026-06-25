import { createHash, randomBytes } from 'crypto';
import { getCircularReplacer, isJsonObject } from './Helpers';

/**
 * Safe maximum size, in bytes, for a single audit line.
 *
 * VictoriaLogs drops any line larger than its `-insert.maxLineSizeBytes`
 * (262144 bytes / 256KiB by default) to protect memory. We break oversized
 * bodies into lines that stay below this value, leaving a margin under the
 * 256KiB hard limit so the serialized envelope plus chunk metadata still fits.
 */
export const SAFE_LINE_BYTES = 200 * 1024;

/**
 * Crockford's Base32 alphabet (ULID encoding), excluding I, L, O and U.
 */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Marker that replaces an oversized value in the chunk header skeleton.
 */
export type HeavyMarker = {
	ref: string;
	type: string;
	bytes: number;
	sha1: string;
};

/**
 * Header line of a broken audit record: the full first level of the body with
 * oversized values replaced by {@link HeavyMarker}s.
 */
export type AuditChunkHeader = {
	body: Record<string, unknown>;
	chunked: boolean;
	chunk_total: number;
};

/**
 * Segment line carrying a slice of an oversized array field as queryable JSON.
 */
export type AuditArraySegment = {
	chunk_seq: number;
	chunk_total: number;
	chunk_field: string;
	body: Record<string, unknown>;
};

/**
 * Segment line carrying a text fraction of an oversized scalar/blob field.
 */
export type AuditTextSegment = {
	chunk_seq: number;
	chunk_total: number;
	chunk_field: string;
	chunk_part: string;
};

/**
 * Any segment line produced when breaking an audit body.
 */
export type AuditChunkSegment = AuditArraySegment | AuditTextSegment;

/**
 * Result of {@link splitAuditBody}: a header line plus the ordered segments.
 */
export type SplitAuditResult = {
	header: AuditChunkHeader;
	segments: AuditChunkSegment[];
};

/**
 * Options accepted by {@link splitAuditBody}.
 */
export type SplitAuditOptions = {
	limit?: number;
	maxFields?: number;
};

/**
 * Serializes a value to the string used for sizing and chunking. Strings are
 * returned as-is; everything else is JSON-stringified with circular-safe
 * handling. Values that JSON.stringify drops (undefined, functions) become ''.
 *
 * @param   value  The value to serialize.
 * @returns The string representation used for byte measurement and chunking.
 */
function serialize(value: unknown): string {
	if (typeof value === 'string') return value;

	const result = JSON.stringify(value, getCircularReplacer());

	return result === undefined ? '' : result;
}

/**
 * Measures the UTF-8 byte length of a value's serialized form.
 *
 * @param   value  The value to measure.
 * @returns The number of UTF-8 bytes of the serialized value.
 */
export function byteLen(value: unknown): number {
	return Buffer.byteLength(serialize(value), 'utf8');
}

/**
 * Measures the UTF-8 byte length of a value as it appears inside JSON (strings
 * include their surrounding quotes). Used to size array elements accurately
 * when packing them into chunks.
 *
 * @param   value  The value to measure as a JSON token.
 * @returns The number of UTF-8 bytes of the value's JSON representation.
 */
function jsonByteLen(value: unknown): number {
	const result = JSON.stringify(value, getCircularReplacer());

	return Buffer.byteLength(result === undefined ? 'null' : result, 'utf8');
}

/**
 * Generates an audit identifier as a 26-character ULID (Crockford Base32):
 * 48 bits of millisecond timestamp followed by 80 bits of randomness. Uses
 * node's crypto only, so it adds no runtime dependency.
 *
 * @returns A new ULID string used to correlate audit lines.
 */
export function auditId(): string {
	let time = Date.now();
	const chars: string[] = new Array(26);

	// 48-bit timestamp -> 10 Base32 chars (most significant first).
	for (let i = 9; i >= 0; i--) {
		chars[i] = CROCKFORD[time % 32];
		time = Math.floor(time / 32);
	}

	// 80 bits of randomness -> 16 Base32 chars.
	const random = randomBytes(10);
	let bits = 0;
	let acc = 0;
	let pos = 10;

	for (let i = 0; i < random.length; i++) {
		acc = (acc << 8) | random[i];
		bits += 8;

		while (bits >= 5) {
			bits -= 5;
			chars[pos++] = CROCKFORD[(acc >>> bits) & 31];
		}

		acc &= (1 << bits) - 1;
	}

	return chars.join('');
}

/**
 * Builds the marker that replaces an oversized value in the header skeleton.
 * The marker stays small and queryable while recording how to verify the
 * reconstructed value (`bytes` and `sha1` of the original serialized value).
 *
 * @param   field  The first-level field name the value belongs to.
 * @param   value  The oversized value being replaced.
 * @returns The marker object describing the removed value.
 */
export function heavyMarker(field: string, value: unknown): HeavyMarker {
	const serialized = serialize(value);

	return {
		ref: `body.${field}`,
		type: Array.isArray(value) ? 'array' : typeof value,
		bytes: Buffer.byteLength(serialized, 'utf8'),
		sha1: createHash('sha1').update(serialized).digest('hex')
	};
}

/**
 * Splits an array into sub-arrays whose serialized size stays under `limit`.
 * The division is by bytes, never by item count; an element larger than the
 * limit on its own is emitted alone (an array element cannot be split).
 *
 * @param   arr    The array to split.
 * @param   limit  The maximum serialized size, in bytes, per sub-array.
 * @returns The ordered list of sub-arrays.
 */
export function chunkArrayByBytes(arr: unknown[], limit: number): unknown[][] {
	const parts: unknown[][] = [];
	let current: unknown[] = [];
	let size = 2; // accounts for the enclosing '[' and ']'

	for (const item of arr) {
		const itemBytes = jsonByteLen(item) + 1; // + ',' separator

		if (current.length > 0 && size + itemBytes > limit) {
			parts.push(current);
			current = [];
			size = 2;
		}

		current.push(item);
		size += itemBytes;
	}

	if (current.length > 0) parts.push(current);

	return parts;
}

/**
 * Splits a string into fractions whose UTF-8 byte size stays under `limit`,
 * never cutting in the middle of a multi-byte character.
 *
 * @param   str    The string to split.
 * @param   limit  The maximum size, in bytes, per fraction.
 * @returns The ordered list of string fractions.
 */
export function chunkStringByBytes(str: string, limit: number): string[] {
	const parts: string[] = [];
	const buf = Buffer.from(str, 'utf8');
	let offset = 0;

	while (offset < buf.length) {
		let end = Math.min(offset + limit, buf.length);

		// Back off so we never split a multi-byte UTF-8 sequence: 0b10xxxxxx
		// bytes are continuation bytes.
		if (end < buf.length) {
			while (end > offset && (buf[end] & 0xc0) === 0x80) end--;
		}

		// If the limit is smaller than the character at `offset`, the back-off
		// collapses to `offset`. Emit one whole character anyway so progress is
		// guaranteed and the loop can never spin forever on a tiny limit.
		if (end === offset) {
			end = offset + 1;
			while (end < buf.length && (buf[end] & 0xc0) === 0x80) end++;
		}

		parts.push(buf.toString('utf8', offset, end));
		offset = end;
	}

	return parts;
}

/**
 * Separates the first level of a body into a header skeleton and the heavy
 * values that must be chunked. A value is heavy when it alone exceeds `limit`;
 * additionally, the largest inline values are moved out until the skeleton
 * itself fits, covering the case of many medium values summing past the limit.
 *
 * @param   body   The audit body (a plain object).
 * @param   limit  The maximum serialized size, in bytes, per line.
 * @returns The skeleton (markers in place of heavy values) and the heavy entries.
 */
export function splitFirstLevel(
	body: Record<string, unknown>,
	limit: number
): { skeleton: Record<string, unknown>; heavy: Array<[string, unknown]> } {
	const skeleton: Record<string, unknown> = {};
	const heavyKeys = new Set<string>();

	for (const [key, value] of Object.entries(body)) {
		if (byteLen(value) > limit) {
			heavyKeys.add(key);
			skeleton[key] = heavyMarker(key, value);
		} else {
			skeleton[key] = value;
		}
	}

	// Move the largest remaining inline fields out until the skeleton fits.
	while (byteLen(skeleton) > limit) {
		const candidates = Object.keys(body).filter((k) => !heavyKeys.has(k));

		if (candidates.length === 0) break;

		let largest = candidates[0];
		let largestBytes = byteLen(body[largest]);

		for (const key of candidates) {
			const bytes = byteLen(body[key]);

			if (bytes > largestBytes) {
				largest = key;
				largestBytes = bytes;
			}
		}

		heavyKeys.add(largest);
		skeleton[largest] = heavyMarker(largest, body[largest]);
	}

	const heavy: Array<[string, unknown]> = [...heavyKeys].map((key) => [
		key,
		body[key]
	]);

	return { skeleton, heavy };
}

/**
 * Breaks a single heavy field into segment lines. Arrays become queryable JSON
 * fractions (`body`); everything else becomes text fractions (`chunk_part`).
 *
 * @param   field  The first-level field name.
 * @param   value  The heavy value to break.
 * @param   limit  The maximum serialized size, in bytes, per segment.
 * @returns The ordered segment payloads (without sequencing metadata yet).
 */
function chunkField(
	field: string,
	value: unknown,
	limit: number
): Array<{
	chunk_field: string;
	body?: Record<string, unknown>;
	chunk_part?: string;
}> {
	const ref = `body.${field}`;

	if (Array.isArray(value)) {
		// Array parts are emitted wrapped as `{ "<field>": [...] }`. Reserve the
		// wrapper bytes (`{"<field>":` + `}`) so the emitted segment — not just
		// the bare array — stays within the limit.
		const wrapperBytes = byteLen(`{"${field}":}`);
		const arrayLimit = Math.max(2, limit - wrapperBytes);

		return chunkArrayByBytes(value, arrayLimit).map((part) => ({
			chunk_field: ref,
			body: { [field]: part }
		}));
	}

	return chunkStringByBytes(serialize(value), limit).map((part) => ({
		chunk_field: ref,
		chunk_part: part
	}));
}

/**
 * Counts how many segment lines the heavy entries will produce.
 *
 * @param   heavy  The heavy entries returned by {@link splitFirstLevel}.
 * @param   limit  The maximum serialized size, in bytes, per segment.
 * @returns The total number of segment lines for the heavy entries.
 */
export function countChunks(
	heavy: Array<[string, unknown]>,
	limit: number = SAFE_LINE_BYTES
): number {
	let total = 0;

	for (const [field, value] of heavy) {
		total += chunkField(field, value, limit).length;
	}

	return total;
}

/**
 * Breaks an oversized audit body into a header line plus segment lines, as
 * plain data. This function has no side effects: it never writes to stdout and
 * never formats output — the caller is responsible for adding the envelope
 * (audit_id, _time, level, ...) and emitting each line. Sharing this single
 * implementation guarantees every consumer breaks audit logs identically.
 *
 * Sequencing is global: `chunk_seq` is a 0-based index across all segments and
 * `chunk_total` is the total number of segment lines (header and segments carry
 * the same `chunk_total`).
 *
 * @param   body  The audit body to break (must be a plain object).
 * @param   opts  Splitting options (`limit` and `maxFields`).
 * @returns The header line and the ordered segment lines.
 */
export function splitAuditBody(
	body: unknown,
	opts: SplitAuditOptions = {}
): SplitAuditResult {
	const limit = opts.limit ?? SAFE_LINE_BYTES;
	const maxFields = opts.maxFields ?? 900;

	if (!isJsonObject(body)) {
		throw new TypeError('splitAuditBody requires a plain object body');
	}

	const record = body as Record<string, unknown>;
	const { skeleton, heavy } = splitFirstLevel(record, limit);

	const specs: Array<{
		chunk_field: string;
		body?: Record<string, unknown>;
		chunk_part?: string;
	}> = [];

	for (const [field, value] of heavy) {
		specs.push(...chunkField(field, value, limit));
	}

	// Field-count overflow: VictoriaLogs caps fields per entry, so a body with
	// too many first-level keys spreads the extra keys across segment lines.
	let headerBody = skeleton;
	const keys = Object.keys(skeleton);

	if (keys.length > maxFields) {
		headerBody = {};

		for (const key of keys.slice(0, maxFields)) {
			headerBody[key] = skeleton[key];
		}

		const overflow = keys.slice(maxFields);

		for (let i = 0; i < overflow.length; i += maxFields) {
			const group: Record<string, unknown> = {};

			for (const key of overflow.slice(i, i + maxFields)) {
				group[key] = skeleton[key];
			}

			specs.push({ chunk_field: '(fields)', body: group });
		}
	}

	const chunk_total = specs.length;

	const segments: AuditChunkSegment[] = specs.map((spec, index) => {
		if (spec.body !== undefined) {
			return {
				chunk_seq: index,
				chunk_total,
				chunk_field: spec.chunk_field,
				body: spec.body
			};
		}

		return {
			chunk_seq: index,
			chunk_total,
			chunk_field: spec.chunk_field,
			chunk_part: spec.chunk_part as string
		};
	});

	return {
		header: { body: headerBody, chunked: chunk_total > 0, chunk_total },
		segments
	};
}
