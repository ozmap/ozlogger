import { LevelTag } from '../enum/LevelTags';

export type LogWrapper = (level: LevelTag, ...args: unknown[]) => Promise<void>;
