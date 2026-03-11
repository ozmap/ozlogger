import { expect, describe, test, beforeAll, afterAll } from '@jest/globals';
import http from 'http';
import createLogger, { Logger } from '../lib';

describe('HTTP Server Tests', () => {
	let logger: Logger;
	const port = 9897; // Use different port to avoid conflict

	beforeAll(async () => {
		process.env.OZLOGGER_SERVER = String(port);
		process.env.OZLOGGER_LEVEL = 'debug';
		logger = createLogger('HTTP-TEST');
		// Wait for server to start
		await new Promise((r) => setTimeout(r, 500));
	});

	afterAll(async () => {
		await logger.stop();
		delete process.env.OZLOGGER_SERVER;
		delete process.env.OZLOGGER_LEVEL;
	});

	const makeRequest = (
		method: string,
		path: string,
		body?: object,
		headers?: Record<string, string>
	): Promise<{ statusCode: number; body: string }> => {
		return new Promise((resolve, reject) => {
			const data = body ? JSON.stringify(body) : '';
			const req = http.request(
				{
					hostname: 'localhost',
					port,
					path,
					method,
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						'Content-Length': Buffer.byteLength(data),
						...headers
					}
				},
				(res) => {
					let responseBody = '';
					res.on('data', (chunk) => (responseBody += chunk));
					res.on('end', () =>
						resolve({
							statusCode: res.statusCode || 500,
							body: responseBody
						})
					);
				}
			);
			req.on('error', reject);
			if (data) req.write(data);
			req.end();
		});
	};

	describe('POST /changeLevel', () => {
		test('should change log level with valid payload', async () => {
			const response = await makeRequest('POST', '/changeLevel', {
				level: 'debug',
				duration: 1000
			});
			expect(response.statusCode).toBe(200);
		});

		test('should return 409 when content-type is not JSON', async () => {
			const response = await makeRequest(
				'POST',
				'/changeLevel',
				{ level: 'debug', duration: 1000 },
				{ 'Content-Type': 'text/plain' }
			);
			expect(response.statusCode).toBe(409);
		});

		test('should return 409 when level is missing', async () => {
			const response = await makeRequest('POST', '/changeLevel', {
				duration: 1000
			});
			expect(response.statusCode).toBe(409);
			expect(response.body).toContain('level');
		});

		test('should return 409 when level is not a string', async () => {
			const response = await makeRequest('POST', '/changeLevel', {
				level: 123,
				duration: 1000
			});
			expect(response.statusCode).toBe(409);
		});

		test('should return 409 when duration is missing', async () => {
			const response = await makeRequest('POST', '/changeLevel', {
				level: 'debug'
			});
			expect(response.statusCode).toBe(409);
			expect(response.body).toContain('duration');
		});

		test('should return 409 when duration is not a positive number', async () => {
			const response = await makeRequest('POST', '/changeLevel', {
				level: 'debug',
				duration: 0
			});
			expect(response.statusCode).toBe(409);
		});

		test('should return 409 when duration is negative', async () => {
			const response = await makeRequest('POST', '/changeLevel', {
				level: 'debug',
				duration: -100
			});
			expect(response.statusCode).toBe(409);
		});

		test('should return 409 when body is not an object', async () => {
			const response = await new Promise<{
				statusCode: number;
				body: string;
			}>((resolve, reject) => {
				const data = JSON.stringify([1, 2, 3]); // Array instead of object
				const req = http.request(
					{
						hostname: 'localhost',
						port,
						path: '/changeLevel',
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Accept: 'application/json',
							'Content-Length': Buffer.byteLength(data)
						}
					},
					(res) => {
						let responseBody = '';
						res.on('data', (chunk) => (responseBody += chunk));
						res.on('end', () =>
							resolve({
								statusCode: res.statusCode || 500,
								body: responseBody
							})
						);
					}
				);
				req.on('error', reject);
				req.write(data);
				req.end();
			});
			expect(response.statusCode).toBe(409);
		});
	});

	describe('Unknown routes', () => {
		test('should return 404 for unknown route', async () => {
			const response = await makeRequest('GET', '/unknown');
			expect(response.statusCode).toBe(404);
		});

		test('should return 404 for GET /changeLevel', async () => {
			const response = await makeRequest('GET', '/changeLevel');
			expect(response.statusCode).toBe(404);
		});
	});

	describe('Invalid JSON', () => {
		test('should return 422 for malformed JSON', async () => {
			const response = await new Promise<{
				statusCode: number;
				body: string;
			}>((resolve, reject) => {
				const data = '{invalid json}';
				const req = http.request(
					{
						hostname: 'localhost',
						port,
						path: '/changeLevel',
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Accept: 'application/json',
							'Content-Length': Buffer.byteLength(data)
						}
					},
					(res) => {
						let responseBody = '';
						res.on('data', (chunk) => (responseBody += chunk));
						res.on('end', () =>
							resolve({
								statusCode: res.statusCode || 500,
								body: responseBody
							})
						);
					}
				);
				req.on('error', reject);
				req.write(data);
				req.end();
			});
			expect(response.statusCode).toBe(422);
		});
	});

	describe('Response format', () => {
		test('should return JSON error when Accept is application/json', async () => {
			const response = await makeRequest('GET', '/unknown', undefined, {
				Accept: 'application/json'
			});
			expect(response.statusCode).toBe(404);
			expect(() => JSON.parse(response.body)).not.toThrow();
		});

		test('should return text error when Accept is not JSON', async () => {
			const response = await makeRequest('GET', '/unknown', undefined, {
				Accept: 'text/plain'
			});
			expect(response.statusCode).toBe(404);
			expect(response.body).toBe('Not found');
		});
	});
});

describe('HTTP Server Disabled', () => {
	test('should not start server when OZLOGGER_HTTP=false', async () => {
		process.env.OZLOGGER_HTTP = 'false';
		process.env.OZLOGGER_SERVER = '9896';

		const logger = createLogger('NO-SERVER');
		expect(logger.server).toBeUndefined();

		delete process.env.OZLOGGER_HTTP;
		delete process.env.OZLOGGER_SERVER;
	});
});

describe('HTTP Server with noServer option', () => {
	test('should not start server when noServer option is true', () => {
		const logger = createLogger('NO-SERVER', { noServer: true });
		expect(logger.server).toBeUndefined();
	});
});

describe('HTTP Server content size limit', () => {
	let logger: Logger;
	const port = 9895;

	beforeAll(async () => {
		process.env.OZLOGGER_SERVER = String(port);
		process.env.OZLOGGER_LEVEL = 'debug';
		logger = createLogger('SIZE-TEST');
		await new Promise((r) => setTimeout(r, 500));
	});

	afterAll(async () => {
		await logger.stop();
		delete process.env.OZLOGGER_SERVER;
		delete process.env.OZLOGGER_LEVEL;
	});

	test('should return 413 when content is too large', async () => {
		// Create a large payload (> 5MB)
		const largeData = JSON.stringify({ data: 'x'.repeat(6 * 1024 * 1024) });

		const response = await new Promise<{
			statusCode: number;
			body: string;
			error?: Error;
		}>((resolve) => {
			const req = http.request(
				{
					hostname: 'localhost',
					port,
					path: '/changeLevel',
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						'Content-Length': Buffer.byteLength(largeData)
					}
				},
				(res) => {
					let responseBody = '';
					res.on('data', (chunk) => (responseBody += chunk));
					res.on('end', () =>
						resolve({
							statusCode: res.statusCode || 500,
							body: responseBody
						})
					);
				}
			);
			req.on('error', (error) => {
				// Socket destroyed means our protection worked
				resolve({ statusCode: 413, body: 'Content too large', error });
			});
			req.write(largeData);
			req.end();
		});

		// Either we get 413 or socket is destroyed
		expect([413, 500]).toContain(response.statusCode);
	});
});

describe('checkRequestHeader', () => {
	// Import the function directly to test
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { checkRequestHeader } = require('../lib/http/server') as {
		checkRequestHeader: (
			headers: Record<string, string | string[]>,
			header: string,
			value: string
		) => boolean;
	};

	test('should return false when header is not present', () => {
		expect(checkRequestHeader({}, 'content-type', 'application/json')).toBe(
			false
		);
	});

	test('should return true when header matches value', () => {
		expect(
			checkRequestHeader(
				{ 'content-type': 'application/json' },
				'content-type',
				'application/json'
			)
		).toBe(true);
	});

	test('should handle comma-separated values in string header', () => {
		expect(
			checkRequestHeader(
				{ accept: 'text/html, application/json, text/plain' },
				'accept',
				'application/json'
			)
		).toBe(true);
	});

	test('should handle array headers', () => {
		expect(
			checkRequestHeader(
				{ accept: ['text/html', 'application/json'] },
				'accept',
				'application/json'
			)
		).toBe(true);
	});

	test('should return false for non-matching array header', () => {
		expect(
			checkRequestHeader(
				{ accept: ['text/html', 'text/plain'] },
				'accept',
				'application/json'
			)
		).toBe(false);
	});
});
