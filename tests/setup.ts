/**
 * Jest test setup file.
 *
 * This file runs before all tests and configures the environment
 * to prevent HTTP server port conflicts when running tests in parallel.
 *
 * To use this setup in your tests, ensure jest.config.js includes:
 * setupFilesAfterEnv: ['./tests/setup.ts']
 */

// Disable HTTP server by default in tests to prevent EADDRINUSE errors
// Individual tests that need the HTTP server can override this
process.env.OZLOGGER_HTTP = 'false';

// Set default log level to quiet during tests to reduce noise
// Tests that need log output can override this
process.env.OZLOGGER_LEVEL = process.env.OZLOGGER_LEVEL || 'quiet';

// Set output to text for easier debugging when needed
process.env.OZLOGGER_OUTPUT = process.env.OZLOGGER_OUTPUT || 'text';
