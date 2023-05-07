#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const action_1 = require("./action");
commander_1.program
    .command('set-level')
    .description('Command to change the current log level.')
    .argument('<level>', 'The log level to be used.')
    .option('-t, --timeout <seconds>', 'Timeout in seconds until the log level is reset.')
    .action(action_1.updateLogLevel);
commander_1.program
    .command('reset-level')
    .description('Command to reset the log level to its default.')
    .action(action_1.resetLogLevel);
commander_1.program.parse();
