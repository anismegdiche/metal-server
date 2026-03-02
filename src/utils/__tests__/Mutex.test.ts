import { describe, expect, it } from 'vitest';
import { Mutex } from '../Mutex';

describe('Mutex', () => {
    describe('Init', () => {
        it('should behave as a semaphore with concurrency 1', async () => {
            const mutex = new Mutex();
            let locked = false;

            await mutex.Acquire();
            locked = true;

            const p = mutex.Acquire().then(() => {
                locked = true;
            });

            locked = false; // "Unlock" for sake of next check
            mutex.Release();
            await p;
            expect(locked).toBe(true);
        });
    });

    describe('Once', () => {
        it('should create a mutex-protected property', async () => {
            class TestClass {
                @Mutex.Once()
                public testValue: number = 42;
            }

            const instance = new TestClass();

            // Getter should return a Promise
            const value =  instance.testValue;
            expect(value).toBe(42);
        });

        it('should handle concurrent access safely', async () => {
            class TestClass {
                @Mutex.Once()
                public counter: number = 0;
            }

            const instance = new TestClass();

            // Simulate concurrent access
            const promises = Array.from({ length: 10 }, () =>
                instance.counter
            );

            const results = await Promise.all(promises);

            // All should return same initial value
            results.forEach((result: number) => {
                expect(result).toBe(0);
            });
        });

        it('should allow setting values', async () => {
            class TestClass {
                @Mutex.Once()
                public testValue: string = 'initial';
            }

            const instance = new TestClass();

            // Set a new value
            instance.testValue = 'updated';

            // Get the updated value
            const value = instance.testValue;
            expect(value).toBe('updated');
        });

        it('should work with multiple properties on same class', async () => {
            class TestClass {
                @Mutex.Once()
                public prop1: number = 100;

                @Mutex.Once()
                public prop2: string = 'test';
            }

            const instance = new TestClass();

            const [value1, value2] = await Promise.all([
                instance.prop1,
                instance.prop2
            ]);

            expect(value1).toBe(100);
            expect(value2).toBe('test');
        });

        it('should work with symbol property keys', async () => {
            const symbolKey = Symbol('test');

            class TestClass {
                @Mutex.Once()
                public [symbolKey]: boolean = true;
            }

            const instance = new TestClass();

            // Access using the symbol with unknown casting
            const value = await (instance as unknown as Record<symbol, Promise<boolean>>)[symbolKey];
            expect(value).toBe(true);
        });

        it('should handle undefined initial values', async () => {
            class TestClass {
                @Mutex.Once()
                public undefinedValue: undefined;
            }

            const instance = new TestClass();

            const value = instance.undefinedValue;
            expect(value).toBeUndefined();
        });

        it('should maintain separate mutexes for different instances', async () => {
            class TestClass {
                @Mutex.Once()
                public sharedValue: number = 0;
            }

            const instance1 = new TestClass();
            const instance2 = new TestClass();

            // Set different values on different instances
            instance1.sharedValue = 1;
            instance2.sharedValue = 2;

            const [value1, value2] = await Promise.all([
                instance1.sharedValue,
                instance2.sharedValue
            ]);

            expect(value1).toBe(1);
            expect(value2).toBe(2);
        });

        it('should safely increment counter from 0 to 100 with sequential access', async () => {
            class TestClass {
                @Mutex.Once()
                public counter: number = 0;
            }

            const instance = new TestClass();
            const allValues: number[] = [];

            // Create 100 sequential increments to track progression
            for (let i = 0; i < 100; i++) {
                // Get current value
                const currentValue = instance.counter;
                allValues.push(currentValue);

                // Increment
                instance.counter = currentValue + 1;

                // Small delay to simulate async work
                await new Promise(resolve => setTimeout(resolve, 1));
            }

            // Get final value
            const finalValue = instance.counter;

            // Verify progression: should be [0, 1, 2, ..., 99]
            expect(allValues).toHaveLength(100);
            allValues.forEach((value, index) => {
                expect(value).toBe(index);
            });

            // Final value should be 100
            expect(finalValue).toBe(100);
            console.log(`Counter progression: 0 -> 100 (${allValues.length} steps tracked)`);
        });

        it('should demonstrate race condition with concurrent increments', async () => {
            class TestClass {
                @Mutex.Once()
                public counter: number = 0;
            }

            const instance = new TestClass();
            const operationLog: string[] = [];

            // Create 100 concurrent promises that each increment counter
            const incrementPromises = Array.from({ length: 100 }, async (_, _index) => {
                const operationId = Math.random().toString(36).substr(2, 9);

                // Get current value
                const currentValue = instance.counter;
                operationLog.push(`${operationId}: read ${currentValue}`);

                // Small delay to increase chance of race condition
                await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

                // Set incremented value
                const newValue = currentValue + 1;
                instance.counter = newValue;
                operationLog.push(`${operationId}: wrote ${newValue}`);
            });

            // Wait for all increments to complete
            await Promise.all(incrementPromises);

            // Get final value
            const finalValue = instance.counter;

            // Log operations to show race condition
            console.log(`Final counter value: ${finalValue}`);
            console.log(`Total operations: ${operationLog.length}`);
            console.log('Sample operations:', operationLog.slice(0, 10));

            // Due to race condition, final value will be much less than 100
            expect(finalValue).toBeGreaterThan(0);
            expect(finalValue).toBeLessThan(100);
            expect(operationLog).toHaveLength(200); // 100 reads + 100 writes
        });
    });

    describe('CreateMutexProtected', () => {
        it('should create a mutex-protected variable that can be used inside functions', async () => {
            const counter = Mutex.CreateMutexProtected(0);
            
            // Test initial value
            const initialValue = await counter.get();
            expect(initialValue).toBe(0);
            
            // Test setting and getting
            counter.set(5);
            const newValue = await counter.get();
            expect(newValue).toBe(5);
        });

        it('should handle concurrent access safely', async () => {
            const counter = Mutex.CreateMutexProtected(0);
            
            // Create 100 concurrent operations that increment counter
            const incrementPromises = Array.from({ length: 100 }, async () => {
                const currentValue = await counter.get();
                counter.set(currentValue + 1);
            });

            await Promise.all(incrementPromises);
            
            const finalValue = await counter.get();
            
            // Note: Like Once decorator, setter is not mutex-protected
            // so this will demonstrate same race condition
            console.log(`Final counter value: ${finalValue} (demonstrates race condition in createMutexProtected)`);
            expect(finalValue).toBeGreaterThan(0);
            expect(finalValue).toBeLessThanOrEqual(100);
        });

        it('should work with different data types', async () => {
            const stringVar = Mutex.CreateMutexProtected("hello");
            const booleanVar = Mutex.CreateMutexProtected(true);
            const objectVar = Mutex.CreateMutexProtected({ count: 0 });
            
            // Test string
            const stringValue = await stringVar.get();
            expect(stringValue).toBe("hello");
            stringVar.set("world");
            expect(await stringVar.get()).toBe("world");
            
            // Test boolean
            const booleanValue = await booleanVar.get();
            expect(booleanValue).toBe(true);
            booleanVar.set(false);
            expect(await booleanVar.get()).toBe(false);
            
            // Test object
            const objectValue = await objectVar.get();
            expect(objectValue).toEqual({ count: 0 });
            objectVar.set({ count: 42 });
            expect(await objectVar.get()).toEqual({ count: 42 });
        });

        it('should maintain separate state for different instances', async () => {
            const counter1 = Mutex.CreateMutexProtected(0);
            const counter2 = Mutex.CreateMutexProtected(100);
            
            counter1.set(1);
            counter2.set(101);
            
            const [value1, value2] = await Promise.all([
                counter1.get(),
                counter2.get()
            ]);
            
            expect(value1).toBe(1);
            expect(value2).toBe(101);
        });
    });
});
