# OZLogger
DevOZ logger module.

----

## Available log methods
The available methods are presented in level hierarchy order.

 - `.debug(...messages: any[])`
 - `.audit(...messages: any[])`
 - `.info(...messages: any[])`
 - `.warn(...messages: any[])`
 - `.error(...messages: any[])`

## Usage examples
Here is a simple code snippet example of using the OZLogger:

```javascript
import createLogger from '@ozmap/logger';

// Initialize and configure the logging facility
const OZLogger = createLogger();

// Example of simple debug log
OZLogger.debug("Simple test log");
```

## Changing log levels

In order to change the log level at runtime the following
HTTP request can be made:

```
POST http://localhost:9898/changeLevel
{
    "level": "<log-level>",
    "duration": <milliseconds>
}
```

```curl
curl -L -X POST -H 'Content-Type: application/json' -d '{"level":"<log-level>","duration":<milliseconds>}' http://localhost:9898/changeLevel
```
