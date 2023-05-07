"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringify = exports.color = exports.includes = exports.host = void 0;
const util_1 = require("util");
const os_1 = require("os");
/**
 * Return a minimal host description.
 *
 * @returns The host description.
 */
function host() {
    return `${(0, os_1.hostname)()} (${(0, os_1.type)()} ${(0, os_1.release)()})`;
}
exports.host = host;
/**
 * Check if a string is in an array of strings.
 *
 * @param   arr    The string array to check.
 * @param   value  Value to check the existance.
 * @returns Wheter or not the string is in the provided array.
 */
function includes(arr, value) {
    return arr.indexOf(value) > -1;
}
exports.includes = includes;
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
