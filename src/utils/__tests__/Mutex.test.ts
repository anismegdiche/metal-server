
import { describe, expect, it } from 'vitest';
import { Mutex } from '../Mutex';

describe('Mutex', () => {
    it('should behave as a semaphore with concurrency 1', async () => {
        const mutex = new Mutex();
        let locked = false;

        await mutex.Acquire();
        locked = true;

        const p = mutex.Acquire().then(() => {
            locked = true;
        });

        locked = false; // "Unlock" for the sake of the next check
        mutex.Release();
        await p;
        expect(locked).toBe(true);
    });
});
