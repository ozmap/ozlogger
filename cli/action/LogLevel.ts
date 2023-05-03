import { emit } from '../util/Ipc';
import { InvalidArgumentError } from 'commander';
import { includes } from '../../lib/util/Helpers';

/**
 * Action method for sending signal to update log levels at runtime
 */
export async function updateLogLevel(level: string): Promise<void> {
	// Validation guard for unknown log level
	if (!includes(['debug', 'http', 'info', 'warn', 'error'], level))
		throw new InvalidArgumentError(`Unknown log level '${level}'.`);

	emit({ signal: 'UpdateLogLevel', data: { level } });
}

/**
 * Action method for sending signal to reset log levels to their defaults.
 */
export async function resetLogLevel(): Promise<void> {
	emit({ signal: 'ResetLogLevel' });
}
