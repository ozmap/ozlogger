import { EventData, EventHandler } from './type/Event';
import { Logger } from '../Logger';
import cluster from 'cluster';

/**
 * Function for registering events on the node process.
 *
 * @param   context  The context object being bound to the event handler.
 * @param   event    The event name being registered.
 * @param   handler  The event handler function.
 */
export function registerEvent(
	context: Logger,
	event: string,
	handler: EventHandler
): void {
	process.on('message', (data: EventData) => {
		if ('event' in data && data.event === event)
			handler.bind(context)(data);
	});
}

/**
 * Function for broadcasting event to all node processes.
 *
 * @param   event      The event being broadcasted.
 * @param   [data={}]  The event data being passed in.
 */
export function broadcastEvent(event: string, data: EventData = {}): void {
	if (cluster.isWorker) return;

	for (const worker of Object.values(cluster.workers ?? {})) {
		if (!worker?.send) continue;

		Object.assign(data, { event });

		worker.send(data);
	}
}
