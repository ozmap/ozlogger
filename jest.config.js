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
    ]
};
