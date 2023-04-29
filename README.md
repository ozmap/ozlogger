# OZLogger
DevOZ logger module.

----

## Available log methods
The available methods are presented in level hierarchy order.

 - `.debug(...messages: any[])`
 - `.http(...messages: any[])`
 - `.info(...messages: any[])`
 - `.warn(...messages: any[])`
 - `.error(...messages: any[])`

## Usage examples
Here is a simple code snippet example of using the OZLogger:

```javascript
import { OZLogger } from '@ozmap/logger';

// Initialize and configure the logging facility
OZLogger.init({
	app: 'test',
	level: 'debug',
    targets: ['stdout']
});


// Example of simple debug log
OZLogger.debug("Simple test log");

// Example of simple debug log with single tag
OZLogger.tag("Tag").debug("Another test log");
```

Another code snippet example shows the OZLogger configured
to send the logs directly to a Mongo database instance. In
this case, no console output will be shown due to it being
used in a production environment.

```javascript
import { OZLogger } from '@ozmap/logger';

// Mongo connection is only established
// on production environments
process.env.NODE_ENV = 'prod';

// Initialize and configure the logging
// facility with the Mongo transport
OZLogger.init({
	app: 'test',
	level: 'debug',
    targets: ['mongo'],
	mongo: {
		server: {
			host: 'localhost',
			port: 27017,
			database: 'application',
			collection: 'ozlogs',
			level: 'info'
		},
		auth: {
			user: 'username',
			pass: 'password'
		},
		options: {
			useUnifiedTopology: true,
			authSource: 'admin'
		}
	}
});


// Example of simple info log
OZLogger.info("Simple test log");

// Example of simple info log with multiple tags
OZLogger.tag("Tag1", "Tag2").info("Another test log");
```
