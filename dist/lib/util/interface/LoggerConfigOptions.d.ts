import { AvailableTargets, SetupTargets } from '../type/Targets';
import { Stdout, File, Mongo } from './transport';
interface TargetOptions extends SetupTargets {
    stdout?: Stdout;
    file?: File;
    mongo?: Mongo;
}
export default interface LoggerConfigOptions extends TargetOptions {
    app: string;
    level: string;
    targets: AvailableTargets[];
    dynamic?: boolean;
}
export {};
