"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastEvent = exports.registerEvent = void 0;
const cluster_1 = __importDefault(require("cluster"));
/**
 * Function for registering events on the node process.
 *
 * @param   context  The context object being bound to the event handler.
 * @param   event    The event name being registered.
 * @param   handler  The event handler function.
 */
function registerEvent(context, event, handler) {
    process.on('message', (data) => {
        if ('event' in data && data.event === event)
            handler.bind(context)(data);
    });
}
exports.registerEvent = registerEvent;
/**
 * Function for broadcasting event to all node processes.
 *
 * @param   event      The event being broadcasted.
 * @param   [data={}]  The event data being passed in.
 */
function broadcastEvent(event, data = {}) {
    if (cluster_1.default.isWorker)
        return;
    for (const worker of Object.values(cluster_1.default.workers || {})) {
        if (!(worker === null || worker === void 0 ? void 0 : worker.send))
            continue;
        Object.assign(data, { event });
        worker.send(data);
    }
}
exports.broadcastEvent = broadcastEvent;
