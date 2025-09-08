# OZLogger
DevOZ logger module.

----

## ⚠️  Deprecation Notice

#### Deprecated logger methods:

The following methods have been deprecated since version `0.2.x` and will be removed completely starting from version `0.3.x`:

 - `Logger.init(opts?: { tag?: string; client?: AbstractLogger }): Logger` is deprecated, please use `createLogger(tag?: string, opts?: { client?: AbstractLogger; noServer?: boolean }): Logger` instead.
 - `.tag(...tags: string[]): Logger` used to add tags to log messages, removed in favor of using dedicated tagged loggers.
 - `.silly(...messages: unknown[]): void` used for very verbose logging, removed in favor of using `.debug(...messages: unknown[]): void`.
 - `.http(...messages: unknown[]): void` used for HTTP related logs, removed in favor of using `.info(...messages: unknown[]): void`.
 - `.critical(...messages: unknown[]): void` used for critical error logs, removed in favor of using `.error(...messages: unknown[]): void`.

#### Deprecated log levels:

The following log levels have been deprecated since version `0.2.x` and will be removed completely starting from version `0.3.x`:

 - `SILLY` level, please use `DEBUG` level instead.
 - `HTTP` level, please use `INFO` level instead.
 - `CRITICAL` level, please use `ERROR` level instead.

#### Deprecated structured JSON output fields:

The following structured JSON output fields have been deprecated since version `0.2.x` and will be removed completely starting from version `0.3.x`:

 - `data` field, please use `body` field instead.
 - `level` field, please use `severityText` field instead.


Please migrate to the recommended alternatives to avoid breaking changes when upgrading to `0.3.x`.

----

## Available log methods
The available logging methods are presented in hierarchy level order.

 - `.debug(...messages: any[])`
 - `.info(...messages: any[])`
 - `.audit(...messages: any[])`
 - `.warn(...messages: any[])`
 - `.error(...messages: any[])`

There are also timing methods available:

 - `.time(id: string)`
 - `.timeEnd(id: string)`

## Usage examples
Here is a simple code snippet example of using it with typescript:

```typescript
import createLogger from '@ozmap/logger';

// Initialize and configure the logging facility
const logger = createLogger();

// Example of simple debug log
logger.debug("Simple test log");
```

Or if you are using it with javascript:

```javascript
const createLogger = require('@ozmap/logger');

// Initialize and configure the logging facility
const logger = createLogger();

// Example of simple debug log
logger.debug("Simple test log");
```

You can also use it to time operations:

```typescript
import createLogger from '@ozmap/logger';

// Initialize and configure the logging facility
const logger = createLogger();

// Example of timing an operation
logger.time("test-operation");

// ... some code here ...

logger.timeEnd("test-operation");
```

By default, timing logs are output at the `INFO` level, but you can change this by chaining the level method beforehand:

```typescript
import createLogger from '@ozmap/logger';

// Initialize and configure the logging facility
const logger = createLogger();

// Example of timing an operation with custom log level
logger.debug.time("test-operation");

// ... some code here ...

logger.debug.timeEnd("test-operation");
```


## HTTP server
The logger module also starts an HTTP server on port `9898` by default.
This server can be used to change the log level at runtime without having to restart your application.

The server can be disabled by setting the `OZLOGGER_HTTP="false"` environment variable.
Or passing it as an option when creating the logger itself.

```typescript
import createLogger from '@ozmap/logger';

// Initialize and configure the logging facility
const logger = createLogger({ noServer: true });
```


## Changing log levels

You can change log levels by setting the `OZLOGGER_LEVEL` environment variable on your deployment.

```bash
OZLOGGER_LEVEL="debug"
```

Or alternatively you can make an HTTP request to the logger's server to change the log level at runtime without restarting your application.

```text
POST http://localhost:9898/changeLevel
{
    "level": "<log-level>",
    "duration": <milliseconds>
}
```

```curl
curl -L -X POST -H 'Content-Type: application/json' -d '{"level":"<log-level>","duration":<milliseconds>}' http://localhost:9898/changeLevel
```

**IMPORTANT:** If you have disabled the HTTP server, you will not be able to change the log level at runtime.

When changing the log level at runtime, you must specify a duration (in milliseconds) for how long the new log level should be active. Afterwards, the log level will revert to the default level set in the environment variable `OZLOGGER_LEVEL` or to 'INFO' if not set.


## Logging during development

Since the logger module is primarily designed for production use and performance, it comes with non friendly defaults for development purposes.

Out of the box, the logger will output messages in a JSON format without colors or pretty printing.

It is recommended for **development only** purposes to set the `OZLOGGER_COLORS="true"` and `OZLOGGER_OUTPUT="text"` environment variables to enable colored and easier to read logs.

Another option that can be useful during development is to set the `OZLOGGER_DATETIME="true"` environment variable to enable timestamped logs.


## Logging during testing

When running tests, you can come across situations where the HTTP port `9898` is already in use by another instance of the logger module. Because of this, it is recommended to disable the HTTP server during tests by setting the `OZLOGGER_HTTP="false"` environment variable.

Besides that, if you want to avoid cluttering your test output with log messages, you can set the `OZLOGGER_LEVEL="quiet"` environment variable to suppress all log messages.
