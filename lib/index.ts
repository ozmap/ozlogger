import { createLogger, Logger } from './Logger';
import { mask, filter } from './util/Objects';
import {
	SAFE_LINE_BYTES,
	auditId,
	byteLen,
	heavyMarker,
	splitFirstLevel,
	chunkArrayByBytes,
	chunkStringByBytes,
	countChunks,
	splitAuditBody
} from './util/AuditChunk';
import {
	getServerPort,
	getServerInstance,
	resetServerState
} from './http/server';

// Re-export for ESM
export { createLogger, Logger };
export { mask, filter };
export {
	SAFE_LINE_BYTES,
	auditId,
	byteLen,
	heavyMarker,
	splitFirstLevel,
	chunkArrayByBytes,
	chunkStringByBytes,
	countChunks,
	splitAuditBody
};
export { getServerPort, getServerInstance, resetServerState };

// Default export for ESM
export default createLogger;

// CommonJS compatibility - attach named exports to the function
const moduleExport = Object.assign(createLogger, {
	createLogger,
	Logger,
	mask,
	filter,
	SAFE_LINE_BYTES,
	auditId,
	byteLen,
	heavyMarker,
	splitFirstLevel,
	chunkArrayByBytes,
	chunkStringByBytes,
	countChunks,
	splitAuditBody,
	getServerPort,
	getServerInstance,
	resetServerState,
	default: createLogger
});

module.exports = moduleExport;
