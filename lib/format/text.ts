import { now, stringify } from '../util/Helpers';
import { AbstractLogger } from '../util/type/AbstractLogger';
import { LogWrapper } from '../util/type/LogWrapper';

/**
 * Formatting method for text output.
 *
 * @param   logger  The underlying logging client.
 * @param   tag     Tag to mark logged output.
 * @returns The logging method.
 */
export function text(logger: AbstractLogger, tag?: string): LogWrapper {
    return async (level: string, ...args: unknown[]) => {
        let data = '';

        for (let i = 0; i < args.length; ++i) {
            data += stringify(args[i]);
        }

        logger.log(`${now()} [${level}] ${tag} ${data}`);
    };
}
