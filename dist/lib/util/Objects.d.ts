/**
 * Utility function for obfuscating values in objects.
 *
 * @param   { object }             original  Original JSON object.
 * @param   { string | string[] }  fields    Key names to be obfuscated.
 * @param   { string }             char      The character used when masking values.
 * @returns { object }  The obfuscated object.
 */
export declare function mask<T = {
    [key: string]: unknown;
}>(original: T, fields: string | string[], char?: string): T;
/**
 * Utility function for removing keys from object.
 *
 * @param   { object }             original  Original JSON object.
 * @param   { string | string[] }  fields    Key names to be removed.
 * @returns { object }  The filtered object.
 */
export declare function filter<T = {
    [key: string]: unknown;
}>(original: object, fields: string | string[]): T;
