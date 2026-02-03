
import { describe, expect, it, vi } from 'vitest';
import { Queue } from '../Queue';

describe('Queue', () => {
    it('should process tasks in sequence when wait is true', async () => {
        const queue = new Queue();
        const order: number[] = [];
        const task1 = vi.fn().mockImplementation(async () => {
            await new Promise(r => setTimeout(r, 20));
            order.push(1);
        });
        const task2 = vi.fn().mockImplementation(async () => {
            order.push(2);
        });

        queue.Enqueue(task1, true);
        queue.Enqueue(task2, true);

        // Wait for completion
        let retries = 0;
        while ((queue.IsRunning || queue.Tasks.length > 0) && retries < 100) {
            await new Promise(r => setTimeout(r, 10));
            retries++;
        }

        expect(order).toEqual([1, 2]);
    });

    it('should process tasks and set IsRunning correctly', async () => {
        const queue = new Queue();
        const task = vi.fn().mockResolvedValue(undefined);

        await queue.Enqueue(task, true);

        // Wait for completion
        let retries = 0;
        while ((queue.IsRunning || queue.Tasks.length > 0) && retries < 100) {
            await new Promise(r => setTimeout(r, 10));
            retries++;
        }

        expect(task).toHaveBeenCalled();
        expect(queue.IsRunning).toBe(false);
    });
});
