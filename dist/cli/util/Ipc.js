"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emit = void 0;
const node_ipc_1 = __importDefault(require("node-ipc"));
const Ipc_1 = require("./enum/Ipc");
/**
 * Abstract emitter for IPC messages.
 */
async function emit(message) {
    Object.assign(node_ipc_1.default.config, {
        id: Ipc_1.Ipc.CLIENT,
        retry: 1500,
        silent: true
    });
    node_ipc_1.default.connectTo(Ipc_1.Ipc.SERVER, () => {
        node_ipc_1.default.of[Ipc_1.Ipc.SERVER].on('connect', () => {
            node_ipc_1.default.of[Ipc_1.Ipc.SERVER].emit('message', JSON.stringify(message));
        });
        node_ipc_1.default.of[Ipc_1.Ipc.SERVER].on('disconnect', () => {
            node_ipc_1.default.disconnect(Ipc_1.Ipc.SERVER);
        });
    });
}
exports.emit = emit;
