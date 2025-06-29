import {
	colorized,
	datetime,
	getCircularReplacer,
	normalize
} from '../util/Helpers';
import { LevelTag } from '../util/enum/LevelTags';
import { AbstractLogger } from '../util/type/AbstractLogger';
import { LogWrapper } from '../util/type/LogWrapper';

/**
 * Formatting method for JSON output.
 *
 * @param   logger  The underlying logging client.
 * @param   tag     Tag to mark logged output.
 * @returns The logging method.
 */
export function json(logger: AbstractLogger, tag?: string): LogWrapper {
	const now = datetime<{ datetime?: string }>();
	const paint = colorized();

	return async (level: LevelTag, ...args: unknown[]) => {
		const data: Record<number, unknown> = {};

		for (let i = 0; i < args.length; ++i) {
			data[i] = normalize(args[i]);
		}

		try {
			logger.log(
				paint[level](
					JSON.stringify(
						{ ...now(), level, tag, data },
						getCircularReplacer()
					)
				)
			);
		} catch (e) {
			logger.log(
				JSON.stringify({
					...now(),
					level,
					tag,
					data: '[OZLogger internal] - Unable to serialize log data'
				})
			);
		}
	};
}
