import { createHash } from 'node:crypto';

/**
 * Utility function for obfuscating values in objects.
 *
 * @param   { object }             original  Original JSON object.
 * @param   { string | string[] }  fields    Key names to be obfuscated.
 * @param   { string }             char      The character used when masking values.
 * @returns { object }  The obfuscated object.
 */
export function mask(
	original: object,
	fields: string | string[],
	char = '*'
): object {
	if (typeof fields === 'string') fields = fields.trim().split(/\s+/);

	// Lookup table used to reduce the time complexity for
	// check calls to see which keys are marked for masking
	const lookup: { [key: string]: boolean } = fields.reduce((acc, val) => {
		return { ...acc, [val]: true };
	}, {});

	const walk = (data: object | unknown): unknown => {
		// If the passed in element is not an object
		// we've reached the end of the recursive call
		if (!data || typeof data !== 'object') return data;

		const partition: { [key: string]: unknown } = {};

		const { ...obj } = data as { [key: string]: unknown };

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

	return walk(copy) as object;
}

/**
 * Utility function for removing keys from object.
 *
 * @param   { object }             original  Original JSON object.
 * @param   { string | string[] }  fields    Key names to be removed.
 * @returns { object }  The filtered object.
 */
export function filter(original: object, fields: string | string[]): object {
	if (typeof fields === 'string') fields = fields.trim().split(/\s+/);

	// Lookup table used to reduce the time complexity for
	// check calls to see which keys are marked for removal
	const lookup: { [key: string]: boolean } = fields.reduce((acc, val) => {
		return { ...acc, [val]: true };
	}, {});

	const walk = (data: object | unknown): unknown => {
		// If the passed in element is not an object
		// we've reached the end of the recursive call
		if (!data || typeof data !== 'object') return data;

		const partition: { [key: string]: unknown } = {};

		const { ...obj } = data as { [key: string]: unknown };

		for (const key in obj) {
			// Use the lookup table to check if
			// the key is marked for removal.
			if (!lookup[key]) partition[key] = walk(obj[key]);
		}

		return partition;
	};

	const { ...copy } = original;

	return walk(copy) as object;
}
