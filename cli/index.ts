#!/usr/bin/env node
import { program } from 'commander';
import { updateLogLevel, resetLogLevel } from './action';

program
	.command('set-level')
	.description('Command to change the current log level.')
	.argument('<level>', 'The log level to be used.')
	.action(updateLogLevel);

program
	.command('reset-level')
	.description('Command to reset the log level to its default.')
	.action(resetLogLevel);

program.parse();
