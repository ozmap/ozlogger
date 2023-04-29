import { AvailableTargets, SetupTargets } from '../type/Targets';
import { Stdout, File, Mongo } from './transport';

interface TargetOptions extends SetupTargets {
	stdout?: Stdout;
	file?: File;
	mongo?: Mongo;
}

export default interface LoggerConfigOptions extends TargetOptions {
	app: string; // Application's name
	level: string; // Minimum level to be logged (Default for all targets)
	targets: AvailableTargets[];
	dynamic?: boolean;
}
