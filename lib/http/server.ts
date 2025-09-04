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
import routes from './routes';

/**
 * Function to create HTTP server on the primary process.
 *
 * @param   port     The interface port for the server to listen on.
 * @param   address  The interface address for the server to listen on.
 * @returns The HTTP server that was setup.
 */
export function setupLogServer<TScope extends Logger>(
	this: TScope,
	port: number,
	address: string
): Server | void {
	if (cluster.isWorker) return;

	if (process.env.OZLOGGER_HTTP?.match(/false/i)) return;

	process.env.OZLOGGER_HTTP = 'false';

	try {
		return http
			.createServer(handleRequest.call(this))
			.listen(port, address, () => {
				this.info(`Log server started listening at ${address}:${port}`);
			});
	} catch (e) {
		this.error(`Log server failed to start at ${address}:${port}`);
	}
}

/**
 * Closure for handling incoming HTTP requests.
 *
 * @returns The HTTP request handler.
 */
function handleRequest<TScope extends Logger>(
	this: TScope
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

				this.error(e);

				return new HttpError(
					`Something went wrong while processing your request content.`,
					500
				).respond(res, resIsJson);
			}
		}

		return router(req as ProcessedRequest, res).catch((e) => {
			if (e instanceof HttpError) return e.respond(res, resIsJson);

			this.error(e);

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

	if (!(route in routes)) throw new HttpError('Not found', 404);

	await routes[route](req, res);

	return res.writeHead(200).end();
}
