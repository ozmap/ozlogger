import { Logger } from '../Logger';
import { LogWrapper } from '../util/type/LogWrapper';
import { AbstractLogger } from '../util/type/AbstractLogger';
import { colorized, datetime, stringify } from '../util/Helpers';
import { LevelTag } from '../util/enum/LevelTags';

/**
 * Formatting method for text output.
 *
 * @param   logger  The underlying logging client.
 * @param   tag     Tag to mark logged output.
 * @returns The logging method.
 */
export function text<TScope extends Logger>(
	this: TScope,
	logger: AbstractLogger,
	tag?: string
): LogWrapper {
	const now = datetime<string>();
	const paint = colorized();

	return (level: LevelTag, ...args: unknown[]) => {
		// A log call must never throw into the caller's business logic, so we
		// isolate serialization and the underlying (possibly app-provided)
		// client behind a try/catch.
		try {
			const data = args.map((arg) => stringify(arg)).join(' ');

			logger.log(paint[level](`${now()}[${level}] ${tag ?? ''} ${data}`));
		} catch (e) {
			console.error('[OZLogger] failed to emit log:', e);
		}
	};
}
