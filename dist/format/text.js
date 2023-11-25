"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.text = void 0;
const Helpers_1 = require("../util/Helpers");
/**
 * Formatting method for text output.
 *
 * @param   logger  The underlying logging client.
 * @param   tag     Tag to mark logged output.
 * @returns The logging method.
 */
function text(logger, tag) {
    const paint = (0, Helpers_1.colorized)();
    return async (level, ...args) => {
        let data = '';
        for (let i = 0; i < args.length; ++i) {
            data += (0, Helpers_1.stringify)(args[i]);
        }
        logger.log(paint[level](`${(0, Helpers_1.now)()} [${level}] ${tag} ${data}`));
    };
}
exports.text = text;
