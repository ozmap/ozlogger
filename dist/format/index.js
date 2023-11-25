"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogWrapper = void 0;
const text_1 = require("./text");
const json_1 = require("./json");
/**
 * Method for retrieving the abstract logging method.
 *
 * @param   output  The output format (text, json, ...).
 * @param   logger  The underlying logging client.
 * @param   tag     Tag to mark logged output.
 * @returns The logging method.
 */
function getLogWrapper(output, logger, tag) {
    switch (output) {
        case 'text':
            return (0, text_1.text)(logger, tag);
        case 'json':
            return (0, json_1.json)(logger, tag);
        default:
            throw new Error(`Log output '${output}' is not supported.`);
    }
}
exports.getLogWrapper = getLogWrapper;
