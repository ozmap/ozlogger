import { expect, describe, test } from '@jest/globals';
import { mask, filter } from '../lib/util/Objects';

const sampleObj = {
	firstname: 'Test',
	lastname: 'User',
	auth: {
		username: 'test.user',
		password: 'secret'
	},
	info: {
		company: {
			name: 'Enterprise',
			sn: 12345678,
			email: 'test.user@corp.com'
		},
		personal: {
			age: 27,
			address: '83399 Debra Point',
			email: 'test.user@email.com'
		}
	}
};

describe('mask', () => {
	test('should obfuscate values with string field list', () => {
		const result = mask(sampleObj, 'password email');

		// Non-masked fields should remain
		expect(result.firstname).toBe('Test');
		expect(result.lastname).toBe('User');
		expect(result.auth.username).toBe('test.user');

		// Masked fields should be asterisks (40 chars for SHA1 hex)
		expect(result.auth.password).toBe(
			'****************************************'
		);
		expect(result.info.company.email).toBe(
			'****************************************'
		);
		expect(result.info.personal.email).toBe(
			'****************************************'
		);
	});

	test('should obfuscate values with array field list', () => {
		const result = mask(sampleObj, ['password', 'email', 'address', 'sn']);

		expect(result.auth.password).toBe(
			'****************************************'
		);
		expect(result.info.company.email).toBe(
			'****************************************'
		);
		expect(result.info.company.sn).toBe(
			'****************************************'
		);
		expect(result.info.personal.email).toBe(
			'****************************************'
		);
		expect(result.info.personal.address).toBe(
			'****************************************'
		);
	});

	test('should use custom mask character', () => {
		const result = mask(sampleObj, ['password'], '#');
		expect(result.auth.password).toBe(
			'########################################'
		);
	});

	test('should not modify original object', () => {
		const original = { secret: 'value' };
		const result = mask(original, ['secret']);

		expect(original.secret).toBe('value');
		expect(result.secret).not.toBe('value');
	});

	test('should handle nested objects', () => {
		const obj = {
			level1: {
				level2: {
					level3: {
						secret: 'hidden'
					}
				}
			}
		};
		const result = mask(obj, ['secret']);
		expect(result.level1.level2.level3.secret).toBe(
			'****************************************'
		);
	});

	test('should handle empty fields list', () => {
		const obj = { key: 'value' };
		const result = mask(obj, []);
		expect(result).toEqual(obj);
	});

	test('should handle non-existent fields', () => {
		const obj = { key: 'value' };
		const result = mask(obj, ['nonexistent']);
		expect(result).toEqual(obj);
	});

	test('should handle arrays within objects', () => {
		const obj = {
			users: [
				{ name: 'Alice', password: 'secret1' },
				{ name: 'Bob', password: 'secret2' }
			]
		};
		const result = mask(obj, ['password']) as typeof obj;

		expect(result.users[0].name).toBe('Alice');
		expect(result.users[0].password).toBe(
			'****************************************'
		);
		expect(result.users[1].password).toBe(
			'****************************************'
		);
	});

	test('should handle primitive values in input', () => {
		// Note: mask uses spread operator which iterates over string chars
		const result = mask('string' as unknown as Record<string, unknown>, [
			'field'
		]);
		expect(result).toEqual({
			'0': 's',
			'1': 't',
			'2': 'r',
			'3': 'i',
			'4': 'n',
			'5': 'g'
		});
	});

	test('should handle null in input', () => {
		// Note: mask throws when passed null due to spread operator
		expect(() =>
			mask(null as unknown as Record<string, unknown>, ['field'])
		).toThrow();
	});

	test('should handle string with multiple spaces', () => {
		const obj = { a: 1, b: 2, c: 3 };
		const result = mask(obj, '  a   b  ');
		expect(result.a).toBe('****************************************');
		expect(result.b).toBe('****************************************');
		expect(result.c).toBe(3);
	});
});

describe('filter', () => {
	test('should remove fields with string field list', () => {
		const result = filter<typeof sampleObj>(sampleObj, 'password email');

		// Non-filtered fields should remain
		expect(result.firstname).toBe('Test');
		expect(result.lastname).toBe('User');
		expect(result.auth.username).toBe('test.user');

		// Filtered fields should be removed
		expect(
			(result.auth as Record<string, unknown>).password
		).toBeUndefined();
		expect(
			(result.info.company as Record<string, unknown>).email
		).toBeUndefined();
		expect(
			(result.info.personal as Record<string, unknown>).email
		).toBeUndefined();
	});

	test('should remove fields with array field list', () => {
		const result = filter<typeof sampleObj>(sampleObj, [
			'password',
			'email',
			'address',
			'sn'
		]);

		expect(
			(result.auth as Record<string, unknown>).password
		).toBeUndefined();
		expect(
			(result.info.company as Record<string, unknown>).email
		).toBeUndefined();
		expect(
			(result.info.company as Record<string, unknown>).sn
		).toBeUndefined();
		expect(
			(result.info.personal as Record<string, unknown>).email
		).toBeUndefined();
		expect(
			(result.info.personal as Record<string, unknown>).address
		).toBeUndefined();

		// Other fields should remain
		expect(result.firstname).toBe('Test');
		expect(result.info.company.name).toBe('Enterprise');
		expect(result.info.personal.age).toBe(27);
	});

	test('should not modify original object', () => {
		const original = { secret: 'value', keep: 'this' };
		const result = filter(original, ['secret']);

		expect(original.secret).toBe('value');
		expect(result.secret).toBeUndefined();
		expect(result.keep).toBe('this');
	});

	test('should handle nested objects', () => {
		const obj = {
			level1: {
				level2: {
					level3: {
						secret: 'hidden',
						keep: 'visible'
					}
				}
			}
		};
		const result = filter(obj, ['secret']) as typeof obj;
		expect(result.level1.level2.level3.secret).toBeUndefined();
		expect(result.level1.level2.level3.keep).toBe('visible');
	});

	test('should handle empty fields list', () => {
		const obj = { key: 'value' };
		const result = filter(obj, []);
		expect(result).toEqual(obj);
	});

	test('should handle non-existent fields', () => {
		const obj = { key: 'value' };
		const result = filter(obj, ['nonexistent']);
		expect(result).toEqual(obj);
	});

	test('should handle arrays within objects', () => {
		const obj = {
			users: [
				{ name: 'Alice', password: 'secret1' },
				{ name: 'Bob', password: 'secret2' }
			]
		};
		const result = filter(obj, ['password']) as typeof obj;

		expect(result.users[0].name).toBe('Alice');
		expect(result.users[0].password).toBeUndefined();
		expect(result.users[1].password).toBeUndefined();
	});

	test('should handle primitive values in input', () => {
		// Note: filter uses spread operator which iterates over string chars
		const result = filter('string' as unknown as object, ['field']);
		expect(result).toEqual({
			'0': 's',
			'1': 't',
			'2': 'r',
			'3': 'i',
			'4': 'n',
			'5': 'g'
		});
	});

	test('should handle null in input', () => {
		// Note: filter throws when passed null due to spread operator
		expect(() => filter(null as unknown as object, ['field'])).toThrow();
	});

	test('should handle string with multiple spaces', () => {
		const obj = { a: 1, b: 2, c: 3 };
		const result = filter(obj, '  a   b  ') as typeof obj;
		expect(result.a).toBeUndefined();
		expect(result.b).toBeUndefined();
		expect(result.c).toBe(3);
	});
});

// Test export from main module
describe('Module exports', () => {
	test('mask and filter should be exported from Objects', async () => {
		const { mask: maskFn, filter: filterFn } =
			await import('../lib/util/Objects');
		expect(typeof maskFn).toBe('function');
		expect(typeof filterFn).toBe('function');
	});
});
