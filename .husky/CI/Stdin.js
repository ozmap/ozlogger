const process = require('node:process');

/**
 * Helper function to process input parameters from Husky.
 *
 * @param  { Array<number, string> }  args
 * @param  { String }  filename
 * @return { Object }
 */
function Stdin(args, filename) {
	if (!args?.length)
		throw new Error('Argument names must be an array of strings.');

	if (typeof filename !== 'string')
		throw new Error('Filename must be a string.');

	const stdin = process.argv.slice(
		process.argv.indexOf(filename) + 1,
		process.argv.length
	);

	return args.reduce((acc, val) => {
		return { ...acc, [val]: stdin.shift() };
	}, {});
}

module.exports = Stdin;
