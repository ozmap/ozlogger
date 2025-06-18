import { LevelTag } from '../enum/LevelTags';

export interface LoggerColorized
	extends Record<LevelTag, (text: string) => string> {}
