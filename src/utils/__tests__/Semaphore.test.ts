
import { describe, expect, it } from 'vitest';
import { Semaphore } from '../Semaphore';

describe('Semaphore', () => {
    it('should allow acquiring up to maxConcurrency immediately', async () => {
        const sem = new Semaphore(2);
        await sem.Acquire();
        await sem.Acquire();
        // Third one should block, but we won't await it here as it would hang the test
    });

    it('should queue requests and release them in order', async () => {
        const sem = new Semaphore(1);
        const order: number[] = [];

        await sem.Acquire();

        const p1 = sem.Acquire().then(() => order.push(1));
        const p2 = sem.Acquire().then(() => order.push(2));

        expect(order).toEqual([]);

        sem.Release();
        await p1;
        expect(order).toEqual([1]);

        sem.Release();
        await p2;
        expect(order).toEqual([1, 2]);
    });

    it('should increment Available when releasing and no tasks in queue', async () => {
        const sem = new Semaphore(1);
        await sem.Acquire();
        sem.Release();
        // This is internal state check, but we can verify it by acquiring again twice
        await sem.Acquire();
        // Should be at 0 now.
    });
});
