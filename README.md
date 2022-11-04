# OZLogger
DevOZ logger module.

----

## Available log methods
The available methods are presented in level hierarchy order.

 - `debug(message: string, ...tags?: string[])`
 - `http(message: string, ...tags?: string[])`
 - `info(message: string, ...tags?: string[])`
 - `warning(message: string, ...tags?: string[])`
 - `error(message: string, ...tags?: string[])`

## Usage examples
Here is a simple code snippet example of using the OZLogger:

```javascript
import { OZLogger } from '@devoz/logger';

// Initialize and configure the logging facility
OZLogger.init({
	app: 'test',
	filename: 'app.log',
	maxsize: 5120, // Bytes
	level: 'debug'
});


// Example of simple debug log
OZLogger.debug("Simple test log");

// Example of simple debug log with tags
OZLogger.debug("Another test log", "Tag1");
```

Another code snippet example shows the OZLogger configured
to send the logs directly to a Mongo database instance:

```javascrip
import { OZLogger } from '@devoz/logger';

// Mongo connection is only established
// on production environments
process.env.NODE_ENV = 'prod';

// Initialize and configure the logging
// facility with the Mongo transport
OZLogger.init({
	app: 'test',
	filename: 'app.log',
	level: 'debug',
	mongo: {
		auth: {
			user: 'username',
			pass: 'password'
		},
		server: {
			host: 'localhost',
			port: 27017,
			database: 'isis_ng',
			collection: 'ozlogs',
			level: 'info'
		},
		options: {
			useUnifiedTopology: true,
			authSource: 'admin'
		}
	}
});


// Example of simple info log
OZLogger.info("Simple test log");

// Example of simple info log with tags
OZLogger.info("Another test log", "Tag1");
```
