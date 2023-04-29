import { Logform, format } from 'winston';

/**
 * Text formatter function for Winston logger format option.
 */
export function Text(label: string, colors = false): Logform.Format {
	const opts: Logform.Format[] = [
		format.label({
			label: label.toUpperCase(),
			message: false
		}),
		format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		format.errors({ stack: true }),
		format.printf(({ timestamp, level, label, message, meta }) => {
			let { tags } = meta;

			if (tags && tags.length) tags = tags.join(' ');

			// Custom logging format string
			return tags
				? `(${timestamp}) ${level.toUpperCase()}: ${label} [${tags}] ${message}`
				: `(${timestamp}) ${level.toUpperCase()}: ${label} ${message}`;
		})
	];

	if (colors)
		opts.push(
			format.colorize({
				all: true,
				colors: {
					debug: 'blue',
					info: 'green',
					http: 'cyan',
					warn: 'yellow',
					error: 'red'
				}
			})
		);

	return format.combine(...opts);
}