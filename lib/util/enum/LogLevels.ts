/**
 * Logging levels with their associated severity
 * numbers according to OpenTelemetry data model.
 */
export const LogLevels = {
	quiet: Infinity,
	critical: 21 /** @deprecated */,
	error: 17,
	warn: 13,
	audit: 12,
	info: 9,
	http: 8 /** @deprecated */,
	debug: 5,
	silly: 1 /** @deprecated */
} as const;
