import { Logger } from '../Logger';
import { LogWrapper } from '../util/type/LogWrapper';
import { AbstractLogger } from '../util/type/AbstractLogger';
import {
	colorized,
	datetime,
	getCircularReplacer,
	normalize,
	stringify
} from '../util/Helpers';
import { LevelTag } from '../util/enum/LevelTags';
import { LogContext } from '../util/interface/LogContext';

/**
 * Converts an attribute value to its string representation for text output.
 *
 * @param   value  The attribute value to format.
 * @returns The formatted string representation.
 */
function formatTextAttributeValue(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'undefined') return 'undefined';

	const normalized = normalize(value);

	if (typeof normalized === 'string') return normalized;

	try {
		return JSON.stringify(normalized, getCircularReplacer());
	} catch {
		return '[Unserializable]';
	}
}

/**
 * Merges global and instance attributes into a key=value text string.
 *
 * @param   attributes  Instance-level attributes to merge with global ones.
 * @returns Formatted string of key=value pairs, or empty string if none.
 */
function formatTextAttributes(attributes?: LogContext['attributes']): string {
	const mergedAttributes = {
		...(Logger.globalAttributes ?? {}),
		...(attributes ?? {})
	};
	const entries = Object.entries(mergedAttributes);

	if (entries.length === 0) return '';

	return entries
		.map(([key, value]) => `${key}=${formatTextAttributeValue(value)}`)
		.join(' ');
}

/**
 * Formatting method for text output.
 *
 * @param   logger      The underlying logging client.
 * @param   tag         Tag to mark logged output.
 * @param   attributes  Instance attributes included in the text output.
 * @returns The logging method.
 */
export function text<TScope extends Logger>(
	this: TScope,
	logger: AbstractLogger,
	tag?: string,
	attributes?: LogContext['attributes']
): LogWrapper {
	const now = datetime<string>();
	const paint = colorized();

	return (level: LevelTag, ...args: unknown[]) => {
		const data = args.map((arg) => stringify(arg)).join(' ');
		const labels = formatTextAttributes(attributes);
		const message = [`${now()}[${level}]`, tag ?? '', labels, data]
			.filter(Boolean)
			.join(' ');

		logger.log(paint[level](message));
	};
}
