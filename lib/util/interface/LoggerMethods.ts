import { Logger } from '../../Logger';
import { LogLevels } from '../enum/LogLevels';

export interface LoggerMethods
	extends Record<
		keyof Omit<typeof LogLevels, 'quiet'>,
		(...data: unknown[]) => void
	> {
	time(id: string): Logger;
	timeEnd(id: string): Logger;
	tag(...tags: string[]): Logger /** @deprecated */;
}
