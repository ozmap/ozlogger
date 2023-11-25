"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.host = exports.output = exports.color = exports.level = exports.isJsonArray = exports.isJsonObject = exports.colorized = exports.stringify = exports.now = void 0;
const util_1 = require("util");
const LogLevels_1 = require("./enum/LogLevels");
const Colors_1 = require("./enum/Colors");
const Outputs_1 = require("./enum/Outputs");
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
 * Outputs the stringified version of the input data.
 *
 * @param   data  The data to stringify.
 * @returns The stringified data.
 */
function stringify(data) {
    return typeof data !== 'string' ? (0, util_1.format)('%O', data) : data;
}
exports.stringify = stringify;
/**
 * Factory function to create painter for log output coloring.
 *
 * @returns Readonly object with level tags as painter methods.
 */
function colorized() {
    const output = (c) => color()
        ? (text) => Colors_1.Colors[c] + text + '\x1b[0m'
        : (text) => text;
    return Object.freeze({
        SILLY: output('magenta') /** @deprecated */,
        DEBUG: output('magenta'),
        AUDIT: output('blue'),
        HTTP: output('green') /** @deprecated */,
        INFO: output('green'),
        WARNING: output('yellow'),
        ERROR: output('red'),
        CRITICAL: output('red') /** @deprecated */
    });
}
exports.colorized = colorized;
/**
 * Function for checking if data is a key/value pair object.
 *
 * @param   data  The data being checked.
 * @returns Whether or not the data is an object.
 */
function isJsonObject(data) {
    return typeof data === 'object' && !Array.isArray(data) && data !== null;
}
exports.isJsonObject = isJsonObject;
/**
 * Function for checking if data is an array object.
 *
 * @param   data  The data being checked.
 * @returns Whether or not the data is an array.
 */
function isJsonArray(data) {
    return typeof data === 'object' && Array.isArray(data) && data !== null;
}
exports.isJsonArray = isJsonArray;
/**
 * Retrieve the current log level name.
 *
 * @returns The level name.
 */
function level() {
    var _a;
    const input = (((_a = process.env.OZLOGGER_LEVEL) === null || _a === void 0 ? void 0 : _a.toLowerCase()) ||
        'debug');
    return input in LogLevels_1.LogLevels ? input : 'audit';
}
exports.level = level;
/**
 * Check if the log outputs should be colorized.
 *
 * @returns Whether or not the output can be colorized.
 */
function color() {
    var _a;
    return !!((_a = process.env.OZLOGGER_COLORS) === null || _a === void 0 ? void 0 : _a.match(/true/i));
}
exports.color = color;
/**
 * Check which output should be used for logging.
 *
 * @returns Output name to be used.
 */
function output() {
    var _a;
    const input = (((_a = process.env.OZLOGGER_OUTPUT) === null || _a === void 0 ? void 0 : _a.toLowerCase()) ||
        'json');
    return Outputs_1.Outputs.indexOf(input) < 0 ? 'json' : input;
}
exports.output = output;
/**
 * Parse the log server port and interface to bind to.
 *
 * @returns The port number and interface address.
 */
function host() {
    // @todo Leandro: Implement support for the following input formats:
    // '9898'
    // ':9898'
    // 'localhost'
    // 'localhost:9898'
    // '[::1]:9898'
    // '127.0.0.1:9898'
    const input = process.env.OZLOGGER_SERVER || '9898';
    return [parseInt(input), 'localhost'];
}
exports.host = host;
