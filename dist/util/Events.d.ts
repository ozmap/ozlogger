import { EventData, EventHandler } from './type/Event';
import { Logger } from '../Logger';
/**
 * Function for registering events on the node process.
 *
 * @param   context  The context object being bound to the event handler.
 * @param   event    The event name being registered.
 * @param   handler  The event handler function.
 */
export declare function registerEvent(context: Logger, event: string, handler: EventHandler): void;
/**
 * Function for broadcasting event to all node processes.
 *
 * @param   event      The event being broadcasted.
 * @param   [data={}]  The event data being passed in.
 */
export declare function broadcastEvent(event: string, data?: EventData): void;
