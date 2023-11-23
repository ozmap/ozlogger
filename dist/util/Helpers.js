"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringify = exports.color = exports.level = exports.now = void 0;
const util_1 = require("util");
const LogLevels_1 = require("./enum/LogLevels");
/**
 * Return the current date and time.
 *
 * @returns The current datetime.
 */
function now() {
    return new Date().toISOString();
}
exports.now = now;
/**
 * Retrieve the current log level priority number.
 *
 * @returns The level priority number.
 */
function level() {
    var _a;
    const input = ((_a = process.env.OZLOGGER_LEVEL) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'audit';
    return LogLevels_1.LogLevels[input] || LogLevels_1.LogLevels['audit'];
}
exports.level = level;
/**
 * Check if the log outputs should be colorized.
 *
 * @returns Wheter or not the output can be colorized.
 */
function color() {
    var _a;
    return !!((_a = process.env.OZLOGGER_COLORS) === null || _a === void 0 ? void 0 : _a.match(/true/i));
}
exports.color = color;
/**
 * Outputs the stringified version of the input data.
 *
 * @param   data  The data to stringify.
 * @returns The stringified data.
 */
function stringify(data) {
    return typeof data !== 'string' ? (0, util_1.format)('%O', data) : data;
}
exports.stringify = stringify;
