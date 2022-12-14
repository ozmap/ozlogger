import { expect, test } from '@jest/globals';
import { mask, filter } from '../';

const obj = {
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
	test('Expected to obfuscate values', () => {
		const result = {
			firstname: 'Test',
			lastname: 'User',
			auth: {
				username: 'test.user',
				password: '****************************************'
			},
			info: {
				company: {
					name: 'Enterprise',
					sn: '****************************************',
					email: '****************************************'
				},
				personal: {
					age: 27,
					address: '****************************************',
					email: '****************************************'
				}
			}
		};

		expect(mask(obj, 'password email address sn')).toStrictEqual(result);
		expect(mask(obj, ['password', 'email', 'address', 'sn'])).toStrictEqual(
			result
		);
	});
});

describe('filter', () => {
	test('Expected to filter out keys', () => {
		const result = {
			firstname: 'Test',
			lastname: 'User',
			auth: { username: 'test.user' },
			info: {
				company: { name: 'Enterprise' },
				personal: { age: 27 }
			}
		};

		expect(filter(obj, 'password email address sn')).toStrictEqual(result);
		expect(
			filter(obj, ['password', 'email', 'address', 'sn'])
		).toStrictEqual(result);
	});
});
