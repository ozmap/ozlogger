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
Here is a simple code snippet example of using the OZLogger with typescript:

```typescript
import createLogger from '@ozmap/logger';

// Initialize and configure the logging facility
const OZLogger = createLogger();

// Example of simple debug log
OZLogger.debug("Simple test log");
```

If you are using the OZLogger with javascript:

```javascript
const createLogger = require('@ozmap/logger');

// Initialize and configure the logging facility
const OZLogger = createLogger();

// Example of simple debug log
OZLogger.debug("Simple test log");
```

The above snippet can even be improved to:

```javascript
// Initialize and configure the logging facility right after importing it
const OZLogger = require('@ozmap/logger')();

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
