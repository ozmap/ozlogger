import { LevelTags } from '../enum/LevelTags';

export type LogWrapper = (
	level: (typeof LevelTags)[number],
	...args: unknown[]
) => Promise<void>;
