import { Signal } from '../type/Signal';
export { Socket } from 'net';
export interface Message {
    signal: Signal;
    data?: {
        [key: string]: unknown;
    };
}
