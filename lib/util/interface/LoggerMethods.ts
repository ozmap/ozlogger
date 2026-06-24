import { Logger } from '../../Logger';
import { LogLevels } from '../enum/LogLevels';
import { LogContext } from './LogContext';

export type LogMethod = ((...args: unknown[]) => void) & {
	timeEnd(id: string): Logger;
};

/**
 * Audit logging method.
 *
 * Unlike the other log methods, audit() is the entrypoint for VictoriaLogs
 * ingestion and accepts exactly ONE argument — of any type (object, string,
 * number, etc.). Calling it with a different number of arguments throws, since
 * that is a programming error and should surface in dev/test. The attached
 * timeEnd() preserves the timer helper available on the other methods.
 */
export type AuditMethod = ((data: unknown) => void) & {
	timeEnd(id: string): Logger;
};

export interface LoggerMethods extends Record<
	keyof Omit<typeof LogLevels, 'quiet' | 'audit'>,
	LogMethod
> {
	audit: AuditMethod;
	time(id: string): Logger;
	timeEnd(id: string): Logger;
	withContext(ctx: LogContext): Logger;
	getContext(): LogContext;
	tag(...tags: string[]): Logger /** @deprecated */;
}
