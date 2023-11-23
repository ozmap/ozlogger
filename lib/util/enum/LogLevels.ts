export const LogLevels = {
    critical: 0, // Deprecated
    error: 0,
    warn: 1,
    info: 2,
    http: 2, // Deprecated
    audit: 3,
    debug: 4,
    silly: 4 // Deprecated
} as const;
