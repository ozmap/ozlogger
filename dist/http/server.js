"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupLogServer = void 0;
const cluster_1 = __importDefault(require("cluster"));
const http_1 = __importDefault(require("http"));
const Events_1 = require("../util/Events");
const Helpers_1 = require("../util/Helpers");
/**
 * Function to create HTTP server on the primary process.
 *
 * @param   port     The interface port for the server to listen on.
 * @param   address  The interface address for the server to listen on.
 * @param   logger   The logger instance.
 * @returns The HTTP server that was setup.
 */
function setupLogServer(port, address, logger) {
    if (cluster_1.default.isWorker)
        return;
    return http_1.default
        .createServer(async (req, res) => new Promise((done) => {
        var _a, _b, _c, _d, _e, _f;
        const reqJson = 'content-type' in req.headers
            ? Array.isArray(req.headers['content-type'])
                ? (_a = req.headers['content-type'].some((header) => header === 'application/json')) !== null && _a !== void 0 ? _a : false
                : (_c = (_b = req.headers['content-type']) === null || _b === void 0 ? void 0 : _b.split(' ').some((header) => header === 'application/json')) !== null && _c !== void 0 ? _c : false
            : false;
        const resJson = 'accept' in req.headers
            ? Array.isArray(req.headers['accept'])
                ? (_d = req.headers['accept'].some((header) => header === 'application/json')) !== null && _d !== void 0 ? _d : false
                : (_f = (_e = req.headers['accept']) === null || _e === void 0 ? void 0 : _e.split(' ').some((header) => header === 'application/json')) !== null && _f !== void 0 ? _f : false
            : false;
        Object.assign(req, { reqJson, resJson });
        if (req.method === 'GET')
            return router(req, res).finally(done);
        let data = Buffer.from('');
        req.on('data', (chunk) => {
            data += chunk;
            // Too much data from HTTP request
            if (limit(data, 5))
                req.socket.destroy();
        });
        req.on('end', () => {
            try {
                Object.assign(req, {
                    body: reqJson
                        ? JSON.parse(data.toString())
                        : data.toString()
                });
            }
            catch (e) {
                return respond(res, 422, resJson, `Unable to process request data.`);
            }
            router(req, res).finally(done);
        });
    }))
        .listen(port, address, () => {
        logger.info(`Log server started listening at ${address}:${port}`);
    });
}
exports.setupLogServer = setupLogServer;
/**
 * Function for checking if data reached the allowed limit.
 *
 * @param   data  The current data being checked.
 * @param   mb    The limit data size.
 * @returns Whether or not the limit has been reached.
 */
function limit(data, mb) {
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
function respond(res, code, resJson, message) {
    return res
        .writeHead(code)
        .end(resJson ? JSON.stringify({ message }) : message);
}
/**
 * Router function to handle actions for different routes.
 *
 * @param   req  Incoming HTTP request.
 * @param   res  Outgoing HTTP response.
 */
async function router(req, res) {
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
                return respond(res, 409, req.resJson, `Request content must be of type JSON.`);
            if (!(0, Helpers_1.isJsonObject)(req.body))
                return respond(res, 409, req.resJson, `Invalid request payload. Data must be a key/value pair object.`);
            const data = req.body;
            if (!('level' in data))
                return respond(res, 409, req.resJson, `Request is missing 'level' parameter.`);
            if (typeof data.level !== 'string')
                return respond(res, 409, req.resJson, `Request parameter 'level' must be a string.`);
            if (!('duration' in data))
                return respond(res, 409, req.resJson, `Request is missing 'duration' parameter.`);
            if (typeof data.duration !== 'number' || data.duration < 1)
                return respond(res, 409, req.resJson, `Request parameter 'duration' must be a non zero positive integer.`);
            (0, Events_1.broadcastEvent)('ozlogger.http.changeLevel', data);
            break;
        }
        default: {
            return respond(res, 404, req.resJson, `not found`);
        }
    }
    return respond(res, 200, req.resJson, `ok`);
}
