import cluster from 'cluster';
import http, { IncomingMessage, Server, ServerResponse } from 'http';
import { ProcessedRequest } from '../util/type/Http';
import { broadcastEvent } from '../util/Events';
import { Logger } from '../Logger';
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

	return http
		.createServer(
			async (req: IncomingMessage, res: ServerResponse): Promise<void> =>
				new Promise<void>((done) => {
					const reqJson =
						'content-type' in req.headers
							? Array.isArray(req.headers['content-type'])
								? req.headers['content-type'].some(
										(header) =>
											header === 'application/json'
								  ) ?? false
								: req.headers['content-type']
										?.split(' ')
										.some(
											(header) =>
												header === 'application/json'
										) ?? false
							: false;
					const resJson =
						'accept' in req.headers
							? Array.isArray(req.headers['accept'])
								? req.headers['accept'].some(
										(header) =>
											header === 'application/json'
								  ) ?? false
								: req.headers['accept']
										?.split(' ')
										.some(
											(header) =>
												header === 'application/json'
										) ?? false
							: false;

					Object.assign(req, { reqJson, resJson });

					if (req.method === 'GET')
						return router(req as ProcessedRequest, res).finally(
							done
						);

					let data = Buffer.from('');

					req.on('data', (chunk) => {
						data += chunk;

						// Too much data from HTTP request
						if (limit(data, 5)) req.socket.destroy();
					});
					req.on('end', () => {
						try {
							Object.assign(req, {
								body: reqJson
									? JSON.parse(data.toString())
									: data.toString()
							});
						} catch (e) {
							return respond(
								res,
								422,
								resJson,
								`Unable to process request data.`
							);
						}

						router(req as ProcessedRequest, res).finally(done);
					});
				})
		)
		.listen(port, address, () => {
			logger.info(`Log server started listening at ${address}:${port}`);
		});
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
 * Function for responding HTTP request with standard payload.
 *
 * @param   res      The server response instance.
 * @param   code     The status code to send.
 * @param   resJson  If the response content is JSON.
 * @param   message  The response message to be sent.
 * @returns The server response.
 */
function respond<RES extends ServerResponse = ServerResponse>(
	res: ServerResponse,
	code: number,
	resJson: boolean,
	message: string
): RES {
	return res
		.writeHead(code)
		.end(resJson ? JSON.stringify({ message }) : message) as RES;
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
			if (!req.reqJson)
				return respond<RES>(
					res,
					409,
					req.resJson,
					`Request content must be of type JSON.`
				);

			if (!isJsonObject(req.body))
				return respond<RES>(
					res,
					409,
					req.resJson,
					`Invalid request payload. Data must be a key/value pair object.`
				);

			const data = req.body as Record<string, unknown>;

			if (!('level' in data))
				return respond<RES>(
					res,
					409,
					req.resJson,
					`Request is missing 'level' parameter.`
				);

			if (typeof data.level !== 'string')
				return respond<RES>(
					res,
					409,
					req.resJson,
					`Request parameter 'level' must be a string.`
				);

			if (!('duration' in data))
				return respond<RES>(
					res,
					409,
					req.resJson,
					`Request is missing 'duration' parameter.`
				);

			if (typeof data.duration !== 'number' || data.duration < 1)
				return respond<RES>(
					res,
					409,
					req.resJson,
					`Request parameter 'duration' must be a non zero positive integer.`
				);

			broadcastEvent('ozlogger.http.changeLevel', data);

			break;
		}

		default: {
			return respond<RES>(res, 404, req.resJson, `not found`);
		}
	}

	return respond<RES>(res, 200, req.resJson, `ok`);
}
