import cluster from 'cluster';
import http, {
	IncomingHttpHeaders,
	IncomingMessage,
	Server,
	ServerResponse
} from 'http';
import { ProcessedRequest } from '../util/type/Http';
import { HttpError } from './errors';
import { Logger } from '../Logger';
import { broadcastEvent } from '../util/Events';
import { isJsonObject } from '../util/Helpers';

/**
 * Function to create HTTP server on the primary process.
 *
 * @param   port     The interface port for the server to listen on.
 * @param   address  The interface address for the server to listen on.
 * @param   logger   The logger instance.
 * @returns The HTTP server that was setup.
 */
export function setupLogServer(
	port: number,
	address: string,
	logger: Logger
): Server | void {
	if (cluster.isWorker) return;

	if (process.env.OZLOGGER_HTTP?.match(/true/i)) return;

	process.env.OZLOGGER_HTTP = 'true';

	return http
		.createServer(handleRequest(logger))
		.listen(port, address, () => {
			logger.info(`Log server started listening at ${address}:${port}`);
		});
}

/**
 * Closure for handling incoming HTTP requests.
 *
 * @param   logger  The logger client.
 * @returns The HTTP request handler.
 */
function handleRequest(
	logger: Logger
): (req: IncomingMessage, res: ServerResponse) => Promise<ServerResponse> {
	return async (req, res) => {
		const reqIsJson = isContentTypeJson(req.headers);
		const resIsJson = isAcceptTypeJson(req.headers);

		Object.assign(req, { reqIsJson, resIsJson });

		if (req.method !== 'GET') {
			try {
				await parseBody(req, reqIsJson ? 'json' : 'text');
			} catch (e) {
				if (e instanceof HttpError) return e.respond(res, resIsJson);

				logger.error(e);

				return new HttpError(
					`Something went wrong while processing your request content.`,
					500
				).respond(res, resIsJson);
			}
		}

		return router(req as ProcessedRequest, res).catch((e) => {
			if (e instanceof HttpError) return e.respond(res, resIsJson);

			logger.error(e);

			return new HttpError(
				`Something went wrong while handling your request.`,
				500
			).respond(res, resIsJson);
		});
	};
}

/**
 * Method for processing request contents.
 *
 * @param   req   The incoming HTTP request.
 * @param   type  The content type.
 */
async function parseBody<T extends IncomingMessage>(
	req: T,
	type: string
): Promise<void> {
	const data: Buffer[] = [];

	for await (const chunk of req) {
		data.push(chunk as Buffer);

		if (limit(Buffer.concat(data), 5)) {
			req.socket.destroy();
			throw new HttpError('Content too large', 413);
		}
	}

	try {
		Object.assign(req, {
			body:
				type === 'json'
					? JSON.parse(Buffer.concat(data).toString())
					: Buffer.concat(data).toString()
		});
	} catch (e) {
		throw new HttpError('Unprocessable content', 422);
	}
}

/**
 * Function for checking if HTTP header
 * is present and has the given value.
 *
 * @param   headers  The HTTP request headers.
 * @param   header   The HTTP header being checked.
 * @param   value    The HTTP header value being verified.
 * @returns If the header is present and has the given value.
 */
export function checkRequestHeader(
	headers: IncomingHttpHeaders,
	header: string,
	value: string
): boolean {
	if (!(header in headers)) return false;

	return Array.isArray(headers[header])
		? (headers[header] as string[]).some((h) => h.trim() === value) ?? false
		: (headers[header] as string)
				?.split(',')
				.some((h) => h.trim() === value) ?? false;
}

/**
 * Validation method for Content-Type HTTP
 * header having the application/json type.
 *
 * @param   headers  The HTTP request headers.
 * @returns If the request content is JSON.
 */
function isContentTypeJson(headers: IncomingHttpHeaders): boolean {
	return checkRequestHeader(headers, 'content-type', 'application/json');
}

/**
 * Validation method for Accept HTTP header
 * having the application/json type.
 *
 * @param   headers  The HTTP request headers.
 * @returns If JSON is accepted as response.
 */
function isAcceptTypeJson(headers: IncomingHttpHeaders): boolean {
	return checkRequestHeader(headers, 'accept', 'application/json');
}

/**
 * Function for checking if data reached the allowed limit.
 *
 * @param   data  The current data being checked.
 * @param   mb    The limit data size.
 * @returns Whether or not the limit has been reached.
 */
function limit(data: Buffer, mb: number): boolean {
	return data.length > mb * 1000000;
}

/**
 * Router function to handle actions for different routes.
 *
 * @param   req  Incoming HTTP request.
 * @param   res  Outgoing HTTP response.
 */
async function router<
	REQ extends ProcessedRequest = ProcessedRequest,
	RES extends ServerResponse = ServerResponse
>(req: REQ, res: RES): Promise<RES> {
	const route = `${req.method} ${req.url}`;

	// @todo Leandro: Simplified logic for handling routes and
	// their requests. In the future it could be a Map with the
	// method + path as key and the value stored being the
	// request handler. That would make possible to register
	// multiple routes without having to change the router code,
	// therefore abstracting the request routing logic.
	switch (route) {
		case 'POST /changeLevel': {
			if (!req.reqIsJson)
				throw new HttpError(
					`Request content must be of type JSON.`,
					409
				);

			if (!isJsonObject(req.body))
				throw new HttpError(
					`Invalid request payload. Data must be a key/value pair object.`,
					409
				);

			const data = req.body as Record<string, unknown>;

			if (!('level' in data))
				throw new HttpError(
					`Request is missing 'level' parameter.`,
					409
				);

			if (typeof data.level !== 'string')
				throw new HttpError(
					`Request parameter 'level' must be a string.`,
					409
				);

			if (!('duration' in data))
				throw new HttpError(
					`Request is missing 'duration' parameter.`,
					409
				);

			if (typeof data.duration !== 'number' || data.duration < 1)
				throw new HttpError(
					`Request parameter 'duration' must be a non zero positive integer.`,
					409
				);

			broadcastEvent('ozlogger.http.changeLevel', data);

			break;
		}

		default: {
			throw new HttpError('Not found', 404);
		}
	}

	return res.writeHead(200).end();
}
