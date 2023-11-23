import { now, stringify } from '../util/Helpers';
import { AbstractLogger } from '../util/type/AbstractLogger';
import { LogWrapper } from '../util/type/LogWrapper';

/**
 * Formatting method for JSON output.
 *
 * @param   logger  The underlying logging client.
 * @param   tag     Tag to mark logged output.
 * @returns The logging method.
 */
export function json(logger: AbstractLogger, tag?: string): LogWrapper {
    return async (level: string, ...args: unknown[]) => {
        const data: Record<number, string> = {};

        for (let i = 0; i < args.length; ++i) {
            data[i] = stringify(args[i]);
        }

        logger.log(JSON.stringify({ datetime: now(), level, tag, data }));
    };
}
