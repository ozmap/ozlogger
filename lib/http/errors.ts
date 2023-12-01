import { ServerResponse } from 'http';

/**
 * Http error class.
 */
export class HttpError extends Error {
	/**
	 * Stores the HTTP response message.
	 */
	public message: string;

	/**
	 * Stores the HTTP response status code.
	 */
	public code: number;

	/**
	 * HttpError class constructor.
	 *
	 * @param   message  The response message.
	 * @param   code     The response status code.
	 */
	public constructor(message: string, code: number) {
		super();
		this.message = message;
		this.code = code;
	}

	/**
	 * Method for responding HTTP request with standard error.
	 *
	 * @param   res     The server response instance.
	 * @param   isJson  If the response content is JSON.
	 * @returns The server response.
	 */
	public respond<RES extends ServerResponse = ServerResponse>(
		res: ServerResponse,
		isJson: boolean
	): RES {
		return res
			.writeHead(this.code)
			.end(
				isJson
					? JSON.stringify({ message: this.message })
					: this.message
			) as RES;
	}
}
