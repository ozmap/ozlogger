export const LogLevels = {
	quiet: -1,
	critical: 0 /** @deprecated */,
	error: 1,
	warn: 2,
	info: 3,
	http: 4 /** @deprecated */,
	audit: 5,
	debug: 6,
	silly: 7 /** @deprecated */
} as const;
