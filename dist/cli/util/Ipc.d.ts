import { Message } from './interface/Message';
/**
 * Abstract emitter for IPC messages.
 */
export declare function emit(message: Message): Promise<void>;
