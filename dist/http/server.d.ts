/// <reference types="node" />
import { Server } from 'http';
import { Logger } from '../Logger';
/**
 * Function to create HTTP server on the primary process.
 *
 * @param   port     The interface port for the server to listen on.
 * @param   address  The interface address for the server to listen on.
 * @param   logger   The logger instance.
 * @returns The HTTP server that was setup.
 */
export declare function setupLogServer(port: number, address: string, logger: Logger): Server | void;
