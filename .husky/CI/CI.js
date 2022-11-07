const process = require('node:process');
const Listr = require('listr');

/**
 * Class representing the CI automation.
 * @class
 */
class CI {
	/**
	 * Stores the CI object instance.
	 *
	 * @static
	 * @var  { CI }
	 */
	static instance;

	/**
	 * Stores the CI pipeline jobs.
	 *
	 * @var  { Array<number, object> }
	 */
	pipeline = [];

	/**
	 * CI class constructor.
	 *
	 * @constructor
	 * @param  { String }  name  Name given for the CI pipeline.
	 * @return { this }
	 */
	constructor(name = 'DevOZ') {
		if (!this.constructor.instance) {
			this.name = name;
			this.constructor.instance = this;
		}

		return this.constructor.instance;
	}

	/**
	 * Method to create pipeline stage with multiple jobs.
	 *
	 * @static
	 * @param  { Array<number, object> }  jobs  Array of job objects to run.
	 * @return { Listr }
	 */
	static batch(jobs) {
		if (!jobs?.length)
			throw new Error(
				'Pipeline batch jobs must be an array of JSON objects.'
			);

		return new Listr(jobs);
	}

	/**
	 * Method to add single job to pipeline stage.
	 *
	 * @param  { Object }  job  Object representing the job to run.
	 * @return { void }
	 */
	stage(job) {
		if (typeof job !== 'object')
			throw new Error('Pipeline job must be a JSON object.');

		this.pipeline.push(job);
	}

	/**
	 * Method to run the CI pipeline.
	 *
	 * @return { void }
	 */
	run() {
		new Listr(this.pipeline)
			.run()
			.then(() => {
				console.log(
					`\n[${this.name}] All pipeline stages succeeded.\n`
				);
				process.exit(0); // Pipeline suceeded
			})
			.catch(() => {
				console.error(
					`\n[${this.name}] Some pipeline stages failed!\n`
				);
				process.exit(1); // Pipeline failed
			});
	}
}

module.exports = CI;
