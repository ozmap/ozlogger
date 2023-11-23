"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.json = void 0;
const Helpers_1 = require("../util/Helpers");
/**
 * Formatting method for JSON output.
 *
 * @param   logger  The underlying logging client.
 * @param   tag     Tag to mark logged output.
 * @returns The logging method.
 */
function json(logger, tag) {
    return async (level, ...args) => {
        const data = {};
        for (let i = 0; i < args.length; ++i) {
            data[i] = (0, Helpers_1.stringify)(args[i]);
        }
        logger.log(JSON.stringify({ datetime: (0, Helpers_1.now)(), level, tag, data }));
    };
}
exports.json = json;
