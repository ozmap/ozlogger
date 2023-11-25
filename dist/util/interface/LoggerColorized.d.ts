import { LevelTags } from '../enum/LevelTags';
export interface LoggerColorized extends Record<(typeof LevelTags)[number], (text: string) => string> {
}
