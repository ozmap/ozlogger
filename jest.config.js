/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testTimeout: 5000, // milliseconds
	verbose: true,
	collectCoverage: true,
	coveragePathIgnorePatterns: [
		'node_modules',
		'<rootDir>/dist',
		'<rootDir>/tests'
	],
	coverageThreshold: {
		global: {
			statements: 95,
			lines: 95
		}
	},
	setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
