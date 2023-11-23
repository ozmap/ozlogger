import { expect, test } from '@jest/globals';
import createLogger, { OZLogger } from '../lib';

const logger: OZLogger = createLogger('perf');

describe('OZLogger performance test suite.', () => {
    test('Must log 1500+ messages in 1s', () => {
        let counter = 0;
        const start = Date.now();

        while (Date.now() - start < 1000) {
            logger.info('1', '2', '3', '4', '5');
            ++counter;
        }

        expect(counter).toBeGreaterThan(1500);
    });
});
