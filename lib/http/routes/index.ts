import { ServerResponse } from 'http';
import { ProcessedRequest } from '../../util/type/Http';
import { HttpError } from '../errors';
import { broadcastEvent } from '../../util/Events';
import { isJsonObject } from '../../util/Helpers';

export default {
	'POST /changeLevel': async (req, res) => {
		if (!req.reqIsJson)
			throw new HttpError(`Request content must be of type JSON.`, 409);

		if (!isJsonObject(req.body))
			throw new HttpError(
				`Invalid request payload. Data must be a key/value pair object.`,
				409
			);

		const data = req.body as Record<string, unknown>;

		if (!('level' in data))
			throw new HttpError(`Request is missing 'level' parameter.`, 409);

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
	}
} as Record<
	string,
	(req: ProcessedRequest, res: ServerResponse) => Promise<void>
>;
