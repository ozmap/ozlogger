import { Logger } from '../Logger';
import { LogWrapper } from '../util/type/LogWrapper';
import { AbstractLogger } from '../util/type/AbstractLogger';
import { LogLevels } from '../util/enum/LogLevels';
import { LevelTag } from '../util/enum/LevelTags';
import {
	colorized,
	datetime,
	getCircularReplacer,
	normalize
} from '../util/Helpers';
import { LogContext } from '../util/interface/LogContext';

/**
 * Creates a structured JSON log object.
 *
 * @param   level      The log level identifier.
 * @param   timestamp  Function that returns an object with datetime specific properties.
 * @param   tag        Optional tag to mark logged output.
 * @param   attributes Optional labels to show in every instance log.
 * @returns The structured log object with `toString` and `push` methods.
 */
function toStructuredJsonLog<TScope extends Logger>(
	this: TScope,
	level: LevelTag,
	timestamp: () => { timestamp?: string },
	tag?: string,
	attributes?: LogContext['attributes']
) {
	const data: Record<number, unknown> = {};
	const logLevelKey =
		level === 'WARNING'
			? ('warn' as const)
			: (level.toLowerCase() as keyof typeof LogLevels);

	let i = 0;

	return {
		toString: () => {
			const structuredData = {
				...timestamp(),
				...this.getContext(),
				...(Logger.globalAttributes ?? {}),
				...(attributes ?? {}),
				tag,
				data /** @deprecated Use 'body' instead. */,
				level /** @deprecated Use 'severityText' instead. */,
				severityText: level,
				severityNumber: LogLevels[logLevelKey],
				body: data
			};

			try {
				return JSON.stringify(structuredData, getCircularReplacer());
			} catch (e) {
				const fallback = {
					...timestamp(),
					tag,
					severityText: level,
					severityNumber: LogLevels[logLevelKey],
					body: '[OZLogger internal] - Unable to serialize log data'
				};
				return JSON.stringify(fallback);
			}
		},
		push(value: unknown) {
			// Setting on data object works as a proxy to the
			// structured data's "body" property.
			data[i++] = value;
		}
	};
}

/**
 * Formatting method for JSON output.
 *
 * @param   logger      The underlying logging client.
 * @param   tag         Tag to mark logged output.
 * @param   attributes  Instance optional labels to show in every log from instance.
 * @returns The logging method.
 */
export function json<TScope extends Logger>(
	this: TScope,
	logger: AbstractLogger,
	tag?: string,
	attributes?: LogContext['attributes']
): LogWrapper {
	const now = datetime<{ timestamp?: string }>();
	const paint = colorized();

	return (level: LevelTag, ...args: unknown[]) => {
		const payload = toStructuredJsonLog.call(
			this,
			level,
			now,
			tag,
			attributes
		);

		for (const arg of args) {
			payload.push(normalize(arg));
		}

		logger.log(paint[level](payload.toString()));
	};
}
