import { Logger } from '../Logger';
import { AbstractLogger } from '../util/type/AbstractLogger';
import { LogWrapper } from '../util/type/LogWrapper';
import { Outputs } from '../util/enum/Outputs';
import { text } from './text';
import { json } from './json';

/**
 * Method for retrieving the abstract logging method.
 *
 * @param   output  The output format (text, json, ...).
 * @param   logger  The underlying logging client.
 * @param   tag     Tag to mark logged output.
 * @returns The logging method.
 */
export function getLogWrapper<TScope extends Logger>(
	this: TScope,
	output: (typeof Outputs)[number],
	logger: AbstractLogger,
	tag?: string
): LogWrapper {
	switch (output) {
		case 'text':
			return text.call(this, logger, tag);

		case 'json':
			return json.call(this, logger, tag);

		default:
			throw new Error(`Log output '${output}' is not supported.`);
	}
}
