import { Logform, format } from 'winston';

/**
 * JSON formatter function for Winston logger format option.
 */
export function Json(label: string, colors = false): Logform.Format {
	const opts: Logform.Format[] = [
		format.label({
			label: label.toUpperCase(),
			message: false
		}),
		format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		format.metadata(),
		format.json()
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
