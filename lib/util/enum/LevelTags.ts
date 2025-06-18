export const LevelTags = [
	'QUIET',
	'SILLY' /** @deprecated */,
	'DEBUG',
	'AUDIT',
	'HTTP' /** @deprecated */,
	'INFO',
	'WARNING',
	'ERROR',
	'CRITICAL' /** @deprecated */
] as const;

export type LevelTag = Exclude<(typeof LevelTags)[number], 'QUIET'>;
