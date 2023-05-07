"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Text = void 0;
const winston_1 = require("winston");
/**
 * Text formatter function for Winston logger format option.
 */
function Text(label, colors = false) {
    const opts = [
        winston_1.format.label({
            label: label.toUpperCase(),
            message: false
        }),
        winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston_1.format.errors({ stack: true }),
        winston_1.format.printf(({ timestamp, level, label, tags, message }) => {
            if (tags && tags.length)
                return `(${timestamp}) ${level.toUpperCase()}: ${label} [${tags.join(' ')}] ${message}`;
            return `(${timestamp}) ${level.toUpperCase()}: ${label} ${message}`;
        })
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
exports.Text = Text;
