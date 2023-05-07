export type AvailableOutputs = 'text' | 'json';

export type AvailableTargets = 'stdout' | 'file' | 'mongo';

export type SetupTargets = {
	[key in AvailableTargets]?: unknown;
};
