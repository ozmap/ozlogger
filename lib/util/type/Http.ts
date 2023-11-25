import { IncomingMessage } from 'http';

export type ProcessedRequest<T = string | Record<string, unknown> | unknown[]> =
	IncomingMessage & {
		body?: T;
		reqJson: boolean;
		resJson: boolean;
	};
