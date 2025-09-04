import { Logger } from '../../Logger';
import { LogLevels } from '../enum/LogLevels';
import { LogContext } from './LogContext';

export type LogMethod = ((...args: unknown[]) => void) & {
	timeEnd(id: string): Logger;
};

export interface LoggerMethods
	extends Record<keyof Omit<typeof LogLevels, 'quiet'>, LogMethod> {
	time(id: string): Logger;
	timeEnd(id: string): Logger;
	withContext(ctx: LogContext): Logger;
	getContext(): LogContext;
	tag(...tags: string[]): Logger /** @deprecated */;
}
