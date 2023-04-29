import { AvailableOutputs } from '../../type/Targets';

export interface File {
	filename: string;
	output: AvailableOutputs;
	maxsize?: number;
}
