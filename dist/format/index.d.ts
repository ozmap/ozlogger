import { AbstractLogger } from '../util/type/AbstractLogger';
import { LogWrapper } from '../util/type/LogWrapper';
/**
 * Method for retrieving the abstract logging method.
 *
 * @param   output  The output format (text, json, ...).
 * @param   logger  The underlying logging client.
 * @param   tag     Tag to mark logged output.
 * @returns The logging method.
 */
export declare function getLogWrapper(output: string, logger: AbstractLogger, tag?: string): LogWrapper;
