/**
 * Utility function for obfuscating values in objects.
 *
 * @param   original  Original JSON object.
 * @param   fields    Key names to be obfuscated.
 * @param   char      The character used when masking values.
 * @returns The obfuscated object.
 */
export declare function mask<T = Record<string, unknown>>(original: T, fields: string | string[], char?: string): T;
/**
 * Utility function for removing keys from object.
 *
 * @param   original  Original JSON object.
 * @param   fields    Key names to be removed.
 * @returns The filtered object.
 */
export declare function filter<T = Record<string, unknown>>(original: object, fields: string | string[]): T;
