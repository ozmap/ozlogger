import { Logger } from '../../Logger';
import { LogLevels } from '../enum/LogLevels';

export type LogMethod = ((...args: unknown[]) => void) & {
	timeEnd(id: string): Logger;
};

export interface LoggerMethods
	extends Record<keyof typeof LogLevels, LogMethod> {
	time(id: string): Logger;
	timeEnd(id: string): Logger;
	tag(...tags: string[]): Logger /** @deprecated */;
}
