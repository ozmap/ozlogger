"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetLogLevel = exports.updateLogLevel = void 0;
const Ipc_1 = require("../util/Ipc");
const commander_1 = require("commander");
const Helpers_1 = require("../../lib/util/Helpers");
/**
 * Action method for sending signal to update log levels at runtime
 */
async function updateLogLevel(level, opts) {
    // Validation guard for unknown log level
    if (!(0, Helpers_1.includes)(['debug', 'http', 'info', 'warn', 'error'], level))
        throw new commander_1.InvalidArgumentError(`Unknown log level '${level}'.`);
    if (opts.timeout) {
        (0, Ipc_1.emit)({
            signal: 'UpdateLogLevel',
            data: { level, timeout: opts.timeout * 1000 }
        });
    }
    else {
        (0, Ipc_1.emit)({ signal: 'UpdateLogLevel', data: { level } });
    }
}
exports.updateLogLevel = updateLogLevel;
/**
 * Action method for sending signal to reset log levels to their defaults.
 */
async function resetLogLevel() {
    (0, Ipc_1.emit)({ signal: 'ResetLogLevel' });
}
exports.resetLogLevel = resetLogLevel;
