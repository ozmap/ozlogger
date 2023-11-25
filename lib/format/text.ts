import { colorized, now, stringify } from '../util/Helpers';
import { LevelTags } from '../util/enum/LevelTags';
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
	const paint = colorized();

	return async (level: (typeof LevelTags)[number], ...args: unknown[]) => {
		let data = '';

		for (let i = 0; i < args.length; ++i) {
			data += stringify(args[i]);
		}

		logger.log(paint[level](`${now()} [${level}] ${tag} ${data}`));
	};
}
