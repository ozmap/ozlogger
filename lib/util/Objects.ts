import { createHash } from 'crypto';

/**
 * Utility function for obfuscating values in objects.
 *
 * @param   original  Original JSON object.
 * @param   fields    Key names to be obfuscated.
 * @param   char      The character used when masking values.
 * @returns The obfuscated object.
 */
export function mask<T = Record<string, unknown>>(
	original: T,
	fields: string | string[],
	char = '*'
): T {
	if (typeof fields === 'string') fields = fields.trim().split(/\s+/);

	// Lookup table used to reduce the time complexity for
	// check calls to see which keys are marked for masking
	const lookup: Record<string, boolean> = fields.reduce((acc, val) => {
		return { ...acc, [val]: true };
	}, {});

	const walk = (data: Record<string, unknown> | unknown): unknown => {
		// If the passed in element is not an object
		// we've reached the end of the recursive call
		if (!data || typeof data !== 'object') return data;

		const partition: Record<string, unknown> = {};

		const { ...obj } = data as Record<string, unknown>;

		for (const key in obj) {
			// Use the lookup table to check if
			// the key is marked for masking.
			if (lookup[key]) {
				// Values are first hashed to
				// obfuscate string length
				obj[key] = createHash('sha1')
					.update(JSON.stringify(obj[key]))
					.digest('hex')
					.replace(/./g, char);
			}

			partition[key] = walk(obj[key]);
		}

		return partition;
	};

	const { ...copy } = original;

	return walk(copy) as T;
}

/**
 * Utility function for removing keys from object.
 *
 * @param   original  Original JSON object.
 * @param   fields    Key names to be removed.
 * @returns The filtered object.
 */
export function filter<T = Record<string, unknown>>(
	original: object,
	fields: string | string[]
): T {
	if (typeof fields === 'string') fields = fields.trim().split(/\s+/);

	// Lookup table used to reduce the time complexity for
	// check calls to see which keys are marked for removal
	const lookup: Record<string, boolean> = fields.reduce((acc, val) => {
		return { ...acc, [val]: true };
	}, {});

	const walk = (data: Record<string, unknown> | unknown): unknown => {
		// If the passed in element is not an object
		// we've reached the end of the recursive call
		if (!data || typeof data !== 'object') return data;

		const partition: Record<string, unknown> = {};

		const { ...obj } = data as Record<string, unknown>;

		for (const key in obj) {
			// Use the lookup table to check if
			// the key is marked for removal.
			if (!lookup[key]) partition[key] = walk(obj[key]);
		}

		return partition;
	};

	const { ...copy } = original;

	return walk(copy) as T;
}
