"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Json = void 0;
const winston_1 = require("winston");
/**
 * JSON formatter function for Winston logger format option.
 */
function Json(label, colors = false) {
    const opts = [
        winston_1.format.label({
            label: label.toUpperCase(),
            message: false
        }),
        winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston_1.format.metadata(),
        winston_1.format.json()
    ];
    if (colors)
        opts.push(winston_1.format.colorize({
            all: true,
            colors: {
                debug: 'blue',
                info: 'green',
                http: 'cyan',
                warn: 'yellow',
                error: 'red'
            }
        }));
    return winston_1.format.combine(...opts);
}
exports.Json = Json;
