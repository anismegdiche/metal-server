# Lock Cleanup Strategy - StorageFoldersData

## Problem

The `StorageFoldersData` class uses a `Map<string, Mutex>` to manage file locks. Without cleanup, this Map grows unbounded as new files are accessed, causing a memory leak.

## Solution

Implemented a **three-tier cleanup strategy**:

### 1. ✅ **Periodic Automatic Cleanup** (Primary Strategy)

**What:** A timer runs every 5 minutes to clean up unused locks.

**How:**

```typescript
// Started in Init()
startLockCleanup() {
    this.LockCleanupTimer = setInterval(() => {
        this.cleanupAllLocks()
    }, this.LockCleanupInterval) // 300000ms = 5 minutes
}
```

**When locks are cleaned:**

- Locks that haven't been used in the last 5 minutes are removed
- Timestamp is updated every time `setLock()` is called

**Benefits:**

- Automatic - no manual intervention needed
- Balances memory usage vs overhead
- Prevents unbounded growth

### 2. ✅ **Cleanup on Disconnect** (Safety Net)

**What:** All locks are cleaned up when the data source disconnects.

**How:**

```typescript
async Disconnect(): Promise<void> {
    // Stop the cleanup timer
    this.stopLockCleanup()

    // Clean up all locks
    await this.cleanupAllLocks()

    // Disconnect storage
    if (this.Connection)
        await this.Connection.Disconnect()
}
```

**Benefits:**

- Ensures complete cleanup on shutdown
- Prevents locks from persisting after disconnect
- Integrates with graceful shutdown

### 3. 🔧 **Try-Finally Protection** (Error Safety)

**What:** Locks are always released, even if operations fail.

**How:**

```typescript
this.setLock(__file.path)
await this.Lock.get(__file.path)!.Acquire()
try {
    await this.Connection!.FileWrite(...)
} finally {
    this.Lock.get(__file.path)!.Release()
    // Optional: this.cleanupLock(__file.path)
}
```

**Benefits:**

- Prevents deadlocks from errors
- Ensures lock is always released
- Maintains system stability

## Configuration

### Adjust Cleanup Interval

If you want to clean up more or less frequently:

```typescript
// In your config or before Init()
storageFoldersDataInstance.LockCleanupInterval = 600000; // 10 minutes
```

**Recommendations:**

- **High traffic:** 60000ms (1 minute) - more frequent cleanup
- **Normal traffic:** 300000ms (5 minutes) - default, balanced
- **Low traffic:** 600000ms (10 minutes) - less overhead

### Immediate Cleanup (Optional)

If you want to clean up locks immediately after use, uncomment the cleanup call:

```typescript
} finally {
    this.Lock.get(__file.path)!.Release()
    this.cleanupLock(__file.path) // Uncomment this line
}
```

**Trade-offs:**

- ✅ **Pros:** Immediate memory reclamation, smaller Map size
- ❌ **Cons:** More overhead per operation, lock recreation if file accessed again soon

**Recommendation:** Keep it commented out and rely on periodic cleanup unless you have very high file churn.

## How It Works

### Lock Lifecycle

```
1. File Operation Starts
   └─> setLock(fileName)
       └─> Create Mutex if not exists
       └─> Update timestamp

2. Acquire Lock
   └─> Wait if locked by another operation
   └─> Acquire when available

3. Perform Operation
   └─> Read/Write/Update file
   └─> May throw errors

4. Release Lock (always, via finally)
   └─> Release Mutex
   └─> Lock available for next operation

5. Periodic Cleanup (every 5 minutes)
   └─> Check all lock timestamps
   └─> Remove locks unused for > 5 minutes
   └─> Log cleanup count

6. Disconnect Cleanup
   └─> Stop cleanup timer
   └─> Remove ALL locks
   └─> Disconnect storage
```

### Memory Impact

**Before cleanup:**

```
Time: 0min  -> Locks: 10
Time: 5min  -> Locks: 50
Time: 10min -> Locks: 100
Time: 15min -> Locks: 150
...
Time: 60min -> Locks: 600+ ⚠️ Memory leak!
```

**After cleanup (5min interval):**

```
Time: 0min  -> Locks: 10
Time: 5min  -> Locks: 50  -> Cleanup: -40 unused = 10 active
Time: 10min -> Locks: 50  -> Cleanup: -40 unused = 10 active
Time: 15min -> Locks: 50  -> Cleanup: -40 unused = 10 active
...
Time: 60min -> Locks: ~10-50 ✅ Stable!
```

## Monitoring

### Check Lock Count

Add this to your monitoring/debugging:

```typescript
// Get current lock count
const lockCount = storageFoldersDataInstance.Lock.size;
Logger.Info(`Current locks: ${lockCount}`);

// Get lock details
for (const [
  fileName,
  timestamp,
] of storageFoldersDataInstance.LockTimestamps.entries()) {
  const age = Date.now() - timestamp;
  Logger.Debug(`Lock: ${fileName}, Age: ${age}ms`);
}
```

### Integration with MemoryLeakDetector

Track lock growth over time:

```typescript
import { MemoryLeakDetector } from "./utils/MemoryLeakDetector";

// In your monitoring code
setInterval(() => {
  MemoryLeakDetector.TrackObject(
    "StorageFoldersData.Lock",
    storageFoldersDataInstance.Lock
  );
}, 10000); // Every 10 seconds
```

### Expected Behavior

**Healthy:**

```
[DEBUG] StorageFoldersData: Lock cleanup timer started (interval: 300000ms)
[DEBUG] StorageFoldersData: Cleaned up 15 unused locks
[DEBUG] StorageFoldersData: Cleaned up 12 unused locks
[DEBUG] StorageFoldersData: Lock cleanup timer stopped
```

**Potential Issue:**

```
[DEBUG] StorageFoldersData: Cleaned up 0 unused locks  // All locks still in use
[DEBUG] StorageFoldersData: Cleaned up 0 unused locks  // All locks still in use
[DEBUG] StorageFoldersData: Cleaned up 0 unused locks  // All locks still in use
⚠️ Locks never cleaned up - might indicate:
   - Very high traffic (all locks constantly used)
   - Locks not being released (check for errors)
   - Cleanup interval too short
```

## Testing

### Test Periodic Cleanup

```typescript
// Create a test instance
const storage = new StorageFoldersData();
await storage.Init("test", config);

// Create some locks
storage.setLock("file1.txt");
storage.setLock("file2.txt");
storage.setLock("file3.txt");

console.log("Locks before:", storage.Lock.size); // 3

// Wait for cleanup interval + 1 second
await new Promise((r) => setTimeout(r, storage.LockCleanupInterval + 1000));

console.log("Locks after cleanup:", storage.Lock.size); // 0 (all unused)
```

### Test Disconnect Cleanup

```typescript
const storage = new StorageFoldersData();
await storage.Init("test", config);

// Create locks
storage.setLock("file1.txt");
storage.setLock("file2.txt");

console.log("Locks before disconnect:", storage.Lock.size); // 2

await storage.Disconnect();

console.log("Locks after disconnect:", storage.Lock.size); // 0
```

### Test Try-Finally Protection

```typescript
const storage = new StorageFoldersData();
await storage.Init("test", config);

try {
  // This will throw an error
  await storage.Insert({
    entity: "test",
    data: [{ name: "test.txt", content: "invalid-base64" }],
  });
} catch (error) {
  // Lock should still be released
  console.log("Error caught, checking locks...");
}

// Wait a bit for async cleanup
await new Promise((r) => setTimeout(r, 100));

// Lock should be released (not acquired)
const lock = storage.Lock.get("test/test.txt");
console.log("Lock exists:", lock !== undefined);
console.log("Lock is available:" /* check if can acquire immediately */);
```

## Best Practices

### 1. **Don't Disable Periodic Cleanup**

The periodic cleanup is essential. Don't set the interval too high:

❌ **Bad:**

```typescript
storage.LockCleanupInterval = 3600000; // 1 hour - too long!
```

✅ **Good:**

```typescript
storage.LockCleanupInterval = 300000; // 5 minutes - balanced
```

### 2. **Monitor Lock Growth**

Use the MemoryLeakDetector to track lock growth:

```typescript
MemoryLeakDetector.TrackObject("StorageFoldersData.Lock", storage.Lock);
```

If you see continuous growth, investigate:

- Are locks being released?
- Is cleanup running?
- Is the interval too long?

### 3. **Handle Errors Properly**

Always use try-finally when working with locks:

❌ **Bad:**

```typescript
await lock.Acquire();
await doSomething();
lock.Release(); // Won't run if doSomething() throws!
```

✅ **Good:**

```typescript
await lock.Acquire();
try {
  await doSomething();
} finally {
  lock.Release(); // Always runs
}
```

### 4. **Test Shutdown**

Ensure locks are cleaned up on shutdown:

```bash
# Start server
npm start

# Trigger some file operations
curl -X POST http://127.0.0.1:3000/...

# Stop server
Ctrl+C

# Check logs for cleanup
# Should see: "Lock cleanup timer stopped"
```

## Summary

✅ **Implemented:**

- Periodic automatic cleanup (every 5 minutes)
- Cleanup on disconnect (graceful shutdown)
- Try-finally protection (error safety)
- Configurable cleanup interval
- Comprehensive logging

✅ **Benefits:**

- No memory leaks from unbounded lock growth
- Automatic cleanup - no manual intervention
- Error-safe lock handling
- Integrates with graceful shutdown
- Monitoring-friendly

✅ **Recommendations:**

- Use default 5-minute interval for most cases
- Monitor lock count with MemoryLeakDetector
- Keep immediate cleanup commented out (rely on periodic)
- Test shutdown to verify cleanup works
