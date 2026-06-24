import { createLogger, Logger } from './Logger';
import { mask, filter } from './util/Objects';
import {
	getServerPort,
	getServerInstance,
	resetServerState
} from './http/server';

// Re-export for ESM
export { createLogger, Logger };
export { mask, filter };
export { getServerPort, getServerInstance, resetServerState };

// Default export for ESM
export default createLogger;

// CommonJS compatibility - attach named exports to the function
const moduleExport = Object.assign(createLogger, {
	createLogger,
	Logger,
	mask,
	filter,
	getServerPort,
	getServerInstance,
	resetServerState,
	default: createLogger
});

module.exports = moduleExport;
