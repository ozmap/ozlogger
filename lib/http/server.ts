import cluster from 'cluster';
import http, {
	IncomingHttpHeaders,
	IncomingMessage,
	Server,
	ServerResponse
} from 'http';
import { AddressInfo } from 'net';
import { ProcessedRequest } from '../util/type/Http';
import { HttpError } from './errors';
import { Logger } from '../Logger';
import routes from './routes';

/**
 * Singleton server instance for the process.
 * Ensures only one HTTP server is created regardless of how many loggers are instantiated.
 */
let globalServer: Server | null = null;

/**
 * The actual port the server is listening on.
 * Useful when port 0 (dynamic) is requested.
 */
let actualPort: number | null = null;

/**
 * Get the actual port the server is listening on.
 *
 * @returns The actual port number or null if server is not running.
 */
export function getServerPort(): number | null {
	return actualPort;
}

/**
 * Get the global server instance.
 *
 * @returns The server instance or null if not running.
 */
export function getServerInstance(): Server | null {
	return globalServer;
}

/**
 * Reset the global server state.
 * This is primarily useful for testing to allow starting a new server.
 * Note: This does NOT close the server, call server.close() first if needed.
 */
export function resetServerState(): void {
	globalServer = null;
	actualPort = null;
	// Reset the env variable to allow new server creation
	delete process.env.OZLOGGER_HTTP;
}

/**
 * Function to create HTTP server on the primary process.
 * Implements singleton pattern to prevent port conflicts when multiple loggers are created.
 * Gracefully handles EADDRINUSE errors when port is already in use.
 *
 * @param   port       The interface port for the server to listen on. Use 0 for dynamic port.
 * @param   address    The interface address for the server to listen on.
 * @param   allowExit  If true, calls server.unref() to allow process exit.
 * @returns The HTTP server that was setup, or undefined if server is disabled or already running.
 */
export function setupLogServer<TScope extends Logger>(
	this: TScope,
	port: number,
	address: string,
	allowExit?: boolean
): Server | void {
	if (cluster.isWorker) return;

	// Return existing server if already created (singleton pattern)
	// This check must come BEFORE the OZLOGGER_HTTP check since we set it to 'false' after starting
	if (globalServer) {
		return globalServer;
	}

	// Check if HTTP server is explicitly disabled
	if (process.env.OZLOGGER_HTTP?.match(/false/i)) return;

	// Mark as initialized to prevent other loggers from trying
	process.env.OZLOGGER_HTTP = 'false';

	try {
		const server = http.createServer(handleRequest.call(this));

		server.on('listening', () => {
			const addr = server.address() as AddressInfo;
			actualPort = addr.port;
			this.info(
				`Log server started listening at ${address}:${actualPort}`
			);
		});

		server.on('error', (e: NodeJS.ErrnoException) => {
			if (e.code === 'EADDRINUSE') {
				this.warn(
					`Log server port ${port} already in use, server not started`
				);
				globalServer = null;
				actualPort = null;
			} else {
				this.error(`Log server at ${address}:${port} got an error`, e);
			}
		});

		server.listen(port, address);

		if (allowExit) {
			server.unref();
		}

		globalServer = server;
		return server;
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
		? ((headers[header] as string[]).some((h) => h.trim() === value) ??
				false)
		: ((headers[header] as string)
				?.split(',')
				.some((h) => h.trim() === value) ?? false);
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
