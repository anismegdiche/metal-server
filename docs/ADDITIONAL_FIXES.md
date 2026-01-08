# Additional Memory Leak Fixes

This document details the fixes applied to `Cache.ts` and `AiDocker.ts` to address remaining memory leak issues identified in the analysis.

## 1. Cache.ts - Automatic Index Cleanup

### Problem

The `Cache.Index` Map (storing hash -> expiration) could grow indefinitely because expired entries were never automatically removed from memory, even if they were removed from the database via manual `Clean()` calls.

### Fix

Implemented a `StartAutoCleanup` method that runs periodically (default: every 1 hour) to check and remove expired cache entries from the in-memory Map.

**Changes:**

- Added `static StartAutoCleanup(intervalMs)`: checks `Cache.Index` and removes expired entries.
- Added `static StopAutoCleanup()`: clears the interval.
- Update `Cache.Init()`: calls `StartAutoCleanup()`.
- Update `Cache.Disconnect()`: calls `StopAutoCleanup()`.

```typescript
    static StartAutoCleanup(intervalMs: number = Cache.AutoCleanupIntervalMs) {
        Cache.StopAutoCleanup()

        Logger.Info(`Cache auto-cleanup started (interval: ${intervalMs}ms)`)
        Cache.AutoCleanupInterval = setInterval(async () => {
             const expiresNow = new Date().getTime()
             let cleanedCount = 0
             Cache.Index.forEach((expires, hash) => {
                 if (expires < expiresNow) {
                     Cache.Index.delete(hash)
                     cleanedCount++
                 }
             })
             // ... also cleans DataSource
        }, intervalMs)
    }
```

## 2. AiDocker.ts - Stream Listener Cleanup

### Problem

In `BuildServiceImage` and `WaitForService`, listeners were attached to Docker streams (`data`, `end`, `error`) but not guaranteed to be removed. This serves as a potential memory leak source if streams persist or if references are held.

### Fix

Refactored stream handling to use named listener functions and explicit cleanup context.

**Changes in `BuildServiceImage`:**

- Defined `onData`, `onEnd`, `onError` functions.
- Added `cleanup()` function to remove all listeners.
- Called `cleanup()` in both `onEnd` and `onError`.

**Changes in `WaitForService`:**

- Similar refactoring for the stream processing logic during service health checks.

```typescript
const cleanup = () => {
  stream.removeListener("data", onData);
  stream.removeListener("end", onEnd);
  stream.removeListener("error", onError);
};
```

## Validation

These changes ensure that:

1. Long-running server instances won't accumulate expired cache metadata in memory.
2. Docker operations (builds, health checks) won't leave orphaned event listeners attached to stream objects.
