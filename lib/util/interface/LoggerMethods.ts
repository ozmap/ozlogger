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
 * ingestion and has a FIXED signature audit(_msg, body): the first argument is
 * always the message string, the second is the record body (assigned whole, so
 * caller keys can never overwrite the envelope). Calling it with a different
 * number of arguments — or a non-string message — throws, since that is a
 * programming error and should surface in dev/test. The attached timeEnd()
 * preserves the timer helper available on the other methods.
 */
export type AuditMethod = ((_msg: string, body: unknown) => void) & {
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
