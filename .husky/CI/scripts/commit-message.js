const CI = require('../CI');
const Stdin = require('../Stdin');

/*
 |------------------------------------------------------------
 | Parse command line arguments.
 |------------------------------------------------------------
 */
const args = Stdin(['message'], __filename);

/*
 |------------------------------------------------------------
 | Create the CI pipeline.
 |------------------------------------------------------------
 */
const ci = new CI('commit-msg');

/*
 |------------------------------------------------------------
 | Commit linting stage.
 |------------------------------------------------------------
 */
ci.stage({
	title: 'Linting commit message',
	task: () => {
		const commit_pattern =
			/^(OZLOGGER)(-[0-9]+)? +(feat(ure)?|(bug)?fix|ci|chore|refactor|style|test|docs)(\(\w{1,32}\))?!?: +(#time +([1-9][0-9]*)m) +(.+)$/g;

		if (!args.message.match(commit_pattern))
			throw new Error(
				'Commit message does not follow conventional commits standards.'
			);
	}
});

/*
 |------------------------------------------------------------
 | Run the CI pipeline.
 |------------------------------------------------------------
 */
ci.run();
