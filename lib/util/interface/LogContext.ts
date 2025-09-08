export interface LogContext {
	attributes?: Record<string, unknown>;
	spanId: string;
	traceId: string;
}
