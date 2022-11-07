const CI = require('../CI');
const Stdin = require('../Stdin');
const { execSync } = require('node:child_process');

/*
 |------------------------------------------------------------
 | Parse command line arguments.
 |------------------------------------------------------------
 */
const args = Stdin(['branch', 'files'], __filename);
args.files = args.files.split('\n');

/*
 |------------------------------------------------------------
 | Create the CI pipeline.
 |------------------------------------------------------------
 */
const ci = new CI('pre-commit');

/*
 |------------------------------------------------------------
 | Check branch stage.
 |------------------------------------------------------------
 */
ci.stage({
	title: 'Checking target branch',
	task: async () => {
		const branch_pattern = /^(master)$/g;

		if (args.branch.match(branch_pattern))
			throw new Error(
				`Branch ${args.branch} is not allowed to be directly commited to`
			);
	}
});

/*
 |------------------------------------------------------------
 | Code formatting and linting stage.
 |------------------------------------------------------------
 */
ci.stage({
	title: 'Static testing staged files',
	task: () =>
		CI.batch([
			{
				title: 'Formatting staged files with Prettier',
				task: async () => {
					const staged = args.files
						.filter((file) => file.match(/.+\.(js|ts|json)$/))
						.join(' ');

					if (staged) {
						execSync(`npm run format -- ${staged}`, {
							timeout: 15000 // 15 seconds
						});
						execSync(`git add ${staged}`, {
							timeout: 5000 // 5 seconds
						});
					}
				}
			},
			{
				title: 'Linting staged files with ESLint',
				task: async () => {
					const staged = args.files
						.filter((file) => file.match(/.+\.(js|ts)$/))
						.join(' ');

					if (staged) {
						execSync(`npm run lint -- ${staged}`, {
							timeout: 15000 // 15 seconds
						});
					}
				}
			}
		])
});

/*
 |------------------------------------------------------------
 | Run the CI pipeline.
 |------------------------------------------------------------
 */
ci.run();
