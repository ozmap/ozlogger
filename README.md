# OZLogger
DevOZ logger module.

----

## Usage
```javascript
import { OZLogger } from '@devoz/logger';

// Initialize and configure the logging facility
OZLogger.init({
	app: 'test',
	filename: 'app.log',
	level: 'debug'
});


// Example of simple debug log
OZLogger.debug("Simple test log");

// Example of simple debug log with tags
OZLogger.debug("Another test log", "Tag1");
```
