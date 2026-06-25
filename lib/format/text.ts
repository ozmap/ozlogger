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
			// Audit carries a structured envelope (audit_id, _msg, body, ...).
			// In text mode we render the message followed by the serialized
			// body so the line stays readable and never crashes.
			if (level === 'AUDIT') {
				const fields =
					typeof args[0] === 'object' && args[0] !== null
						? (args[0] as Record<string, unknown>)
						: { _msg: args[0] };
				const msg =
					fields._msg !== undefined ? stringify(fields._msg) : '';
				const body =
					fields.body !== undefined ? stringify(fields.body) : '';

				logger.log(
					paint[level](
						`${now()}[${level}] ${tag ?? ''} ${msg} ${body}`.trimEnd()
					)
				);
				return;
			}

			const data = args.map((arg) => stringify(arg)).join(' ');

			logger.log(paint[level](`${now()}[${level}] ${tag ?? ''} ${data}`));
		} catch (e) {
			console.error('[OZLogger] failed to emit log:', e);
		}
	};
}
