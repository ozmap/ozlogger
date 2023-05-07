import ipc from 'node-ipc';
import { Ipc } from './enum/Ipc';
import { Message } from './interface/Message';

/**
 * Abstract emitter for IPC messages.
 */
export async function emit(message: Message): Promise<void> {
	Object.assign(ipc.config, {
		id: Ipc.CLIENT,
		retry: 1500,
		silent: true
	});

	ipc.connectTo(Ipc.SERVER, (): void => {
		ipc.of[Ipc.SERVER].on('connect', (): void => {
			ipc.of[Ipc.SERVER].emit('message', JSON.stringify(message));
		});
		ipc.of[Ipc.SERVER].on('disconnect', (): void => {
			ipc.disconnect(Ipc.SERVER);
		});
	});
}
