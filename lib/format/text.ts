import { colorized, datetime, stringify } from '../util/Helpers';
import { LevelTag } from '../util/enum/LevelTags';
import { AbstractLogger } from '../util/type/AbstractLogger';
import { LogWrapper } from '../util/type/LogWrapper';

/**
 * Formatting method for text output.
 *
 * @param   logger  The underlying logging client.
 * @param   tag     Tag to mark logged output.
 * @returns The logging method.
 */
export function text(logger: AbstractLogger, tag?: string): LogWrapper {
	const now = datetime<string>();
	const paint = colorized();

	return async (level: LevelTag, ...args: unknown[]) => {
		const data = args.map((arg) => stringify(arg)).join(' ');

		logger.log(paint[level](`${now()}[${level}] ${tag ?? ''} ${data}`));
	};
}
