import { AbstractLogger } from '../util/type/AbstractLogger';
import { LogWrapper } from '../util/type/LogWrapper';
import { text } from './text';
import { json } from './json';
import { Outputs } from '../util/enum/Outputs';

/**
 * Method for retrieving the abstract logging method.
 *
 * @param   output  The output format (text, json, ...).
 * @param   logger  The underlying logging client.
 * @param   tag     Tag to mark logged output.
 * @returns The logging method.
 */
export function getLogWrapper(
	output: (typeof Outputs)[number],
	logger: AbstractLogger,
	tag?: string
): LogWrapper {
	switch (output) {
		case 'text':
			return text(logger, tag);

		case 'json':
			return json(logger, tag);

		default:
			throw new Error(`Log output '${output}' is not supported.`);
	}
}
