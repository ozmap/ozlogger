"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filter = exports.mask = void 0;
const crypto_1 = require("crypto");
/**
 * Utility function for obfuscating values in objects.
 *
 * @param   original  Original JSON object.
 * @param   fields    Key names to be obfuscated.
 * @param   char      The character used when masking values.
 * @returns The obfuscated object.
 */
function mask(original, fields, char = '*') {
    if (typeof fields === 'string')
        fields = fields.trim().split(/\s+/);
    // Lookup table used to reduce the time complexity for
    // check calls to see which keys are marked for masking
    const lookup = fields.reduce((acc, val) => {
        return { ...acc, [val]: true };
    }, {});
    const walk = (data) => {
        // If the passed in element is not an object
        // we've reached the end of the recursive call
        if (!data || typeof data !== 'object')
            return data;
        const partition = {};
        const { ...obj } = data;
        for (const key in obj) {
            // Use the lookup table to check if
            // the key is marked for masking.
            if (lookup[key]) {
                // Values are first hashed to
                // obfuscate string length
                obj[key] = (0, crypto_1.createHash)('sha1')
                    .update(JSON.stringify(obj[key]))
                    .digest('hex')
                    .replace(/./g, char);
            }
            partition[key] = walk(obj[key]);
        }
        return partition;
    };
    const { ...copy } = original;
    return walk(copy);
}
exports.mask = mask;
/**
 * Utility function for removing keys from object.
 *
 * @param   original  Original JSON object.
 * @param   fields    Key names to be removed.
 * @returns The filtered object.
 */
function filter(original, fields) {
    if (typeof fields === 'string')
        fields = fields.trim().split(/\s+/);
    // Lookup table used to reduce the time complexity for
    // check calls to see which keys are marked for removal
    const lookup = fields.reduce((acc, val) => {
        return { ...acc, [val]: true };
    }, {});
    const walk = (data) => {
        // If the passed in element is not an object
        // we've reached the end of the recursive call
        if (!data || typeof data !== 'object')
            return data;
        const partition = {};
        const { ...obj } = data;
        for (const key in obj) {
            // Use the lookup table to check if
            // the key is marked for removal.
            if (!lookup[key])
                partition[key] = walk(obj[key]);
        }
        return partition;
    };
    const { ...copy } = original;
    return walk(copy);
}
exports.filter = filter;
