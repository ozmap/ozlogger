import { expect, test } from '@jest/globals';
import createLogger, { OZLogger } from '../lib';

const logger: OZLogger = createLogger('perf', {
    log: (msg: string) => undefined
});

describe('OZLogger performance test suite.', () => {
    test('Must process 200K+ string only messages in 1s', () => {
        let counter = 0;
        const start = Date.now();

        while (Date.now() - start < 1000) {
            logger.info('1', '2', '3', '4', '5');
            ++counter;
        }

        console.info(`${counter} msg/s`); // DEBUG
        expect(counter).toBeGreaterThan(200000);
    });
});
