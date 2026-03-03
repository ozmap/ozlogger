import { EventData, EventHandler } from './type/Event';
import { Logger } from '../Logger';
import cluster from 'cluster';

type RegisteredHandler = {
	context: Logger;
	handler: EventHandler;
};

let processMessageListener: ((data: EventData) => void) | null = null;
const registeredHandlers = new Map<string, Set<RegisteredHandler>>();

/**
 * Attaches a single process-level message listener (multiplexed) if not already attached.
 */
function attachProcessMessageListener(): void {
	if (processMessageListener) return;

	processMessageListener = (data: EventData) => {
		if (!data || typeof data !== 'object') return;
		if (!('event' in data)) return;

		const event = (data as unknown as { event: string }).event;
		const handlers = registeredHandlers.get(event);
		if (!handlers?.size) return;

		for (const registered of handlers) {
			registered.handler.call(registered.context, data);
		}
	};

	process.on('message', processMessageListener);
}

/**
 * Detaches the process-level message listener when there are no registered handlers left.
 */
function detachProcessMessageListenerIfIdle(): void {
	if (!processMessageListener) return;
	if (registeredHandlers.size > 0) return;

	process.removeListener('message', processMessageListener);
	processMessageListener = null;
}

/**
 * Function for registering events on the node process.
 *
 * @param   context  The context object being bound to the event handler.
 * @param   event    The event name being registered.
 * @param   handler  The event handler function.
 * @returns The message handler function for later removal.
 */
export function registerEvent(
	context: Logger,
	event: string,
	handler: EventHandler
): () => void {
	attachProcessMessageListener();

	const registered: RegisteredHandler = { context, handler };
	const handlers = registeredHandlers.get(event) ?? new Set();

	handlers.add(registered);
	registeredHandlers.set(event, handlers);

	return () => {
		const current = registeredHandlers.get(event);
		if (!current) return;

		current.delete(registered);
		if (current.size === 0) registeredHandlers.delete(event);

		detachProcessMessageListenerIfIdle();
	};
}

/**
 * Function for broadcasting event to all node processes.
 *
 * @param   event      The event being broadcasted.
 * @param   [data={}]  The event data being passed in.
 */
export function broadcastEvent(event: string, data: EventData = {}): void {
	const payload = { ...data, event } as unknown as NodeJS.Signals;

	if (!process.send) {
		// Non clustered application
		process.emit('message' as NodeJS.Signals, payload);
	} else {
		if (cluster.isWorker) return;

		for (const worker of Object.values(cluster.workers ?? {})) {
			if (!worker?.send) continue;

			worker.send(payload);
		}
	}
}
