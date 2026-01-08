# Memory Leak Detection - Quick Start Guide

## What I Found

I analyzed your Metal Server codebase and identified **6 potential memory leak sources**:

### 🔴 Critical Issues (Fixed)

1. **AiDocker.AutoScaleWorker** - `setInterval` without cleanup
2. **StorageFoldersData.Lock** - Unbounded Map growth

### 🟡 Medium Priority Issues (Documented)

3. **ReadableUtils** - Event listeners not removed
4. **AiDocker streams** - Docker stream event listeners
5. **Cache.Index** - Growing Map without auto-cleanup

### 🟢 Low Priority Issues (Documented)

6. **ServerRuntime** - File watcher not closed

---

## What I Created for You

### 1. **MemoryLeakDetector Utility**

`src/utils/MemoryLeakDetector.ts`

A comprehensive tool to:

- Monitor memory usage over time
- Track object growth (Maps, Sets, Arrays)
- Calculate growth rates
- Identify leaking objects
- Print detailed reports

### 2. **MemoryLeakMonitor Example**

`src/examples/MemoryLeakMonitor.ts`

Integration example showing how to:

- Track AiDocker.Instances
- Track Cache.Index
- Monitor your specific objects
- Set up automatic reporting

### 3. **Detailed Analysis Report**

`docs/MEMORY_LEAK_ANALYSIS.md`

Complete documentation with:

- All issues found
- Code locations
- Explanations
- Fixes for each issue
- Testing strategies

### 4. **Code Fixes Applied**

#### ✅ AiDocker.ts

Added `StopScaler()` method to cleanup the interval timer:

```typescript
static StopScaler() {
    if (AiDocker.AutoScaleWorker) {
        clearInterval(AiDocker.AutoScaleWorker)
        AiDocker.AutoScaleWorker = undefined
    }
}
```

#### ✅ StorageFoldersData.ts

Added lock cleanup methods with timestamp tracking:

```typescript
cleanupLock(fileName: string)
cleanupAllLocks()
```

---

## How to Use

### Quick Start

1. **Add to your main server file:**

```typescript
import { MemoryLeakMonitor } from "./examples/MemoryLeakMonitor";

// On server startup
MemoryLeakMonitor.Init();

// On server shutdown
process.on("SIGTERM", () => {
  MemoryLeakMonitor.Cleanup();
});
```

2. **Run your server with GC exposed:**

```bash
node --expose-gc dist/index.js
```

3. **Check the logs every 60 seconds:**

You'll see reports like:

```
=== Memory Leak Detection Report ===

Memory Usage:
  Heap Used: 45.23 MB
  Heap Total: 67.50 MB
  RSS: 89.12 MB
  Growth Rate: 12.45 KB/sec
  Is Leaking: ✅ NO

Tracked Objects:
  AiDocker.Instances:
    Current Size: 3
    Growth Rate: 0.00 items/sec
    Status: ✅ STABLE

  Cache.Index:
    Current Size: 1247
    Growth Rate: 2.15 items/sec
    Status: ⚠️ GROWING
```

### Manual Tracking

Track any object in your code:

```typescript
import { MemoryLeakDetector } from "./utils/MemoryLeakDetector";

// Track a Map
MemoryLeakDetector.TrackObject("MyMap", myMap);

// Track an Array
MemoryLeakDetector.TrackObject("MyArray", myArray);

// Get a report
MemoryLeakDetector.PrintReport();
```

---

## Next Steps

### Immediate Actions

1. **Call cleanup methods on shutdown:**

Add to your server shutdown logic:

```typescript
// In your shutdown handler
AiDocker.StopScaler();
await storageFoldersDataInstance.cleanupAllLocks();
```

2. **Enable monitoring:**

Add the MemoryLeakMonitor to your server initialization.

3. **Run load tests:**

Monitor memory usage under load to verify fixes work.

### Recommended Improvements

1. **Add automatic lock cleanup:**

In StorageFoldersData, add a periodic cleanup:

```typescript
// In Init() method
setInterval(() => {
  this.cleanupAllLocks();
}, 300000); // Every 5 minutes
```

2. **Add automatic cache cleanup:**

In Cache.ts, add periodic cleanup of expired entries.

3. **Review event listeners:**

Check ReadableUtils and ensure all listeners are properly removed.

---

## Testing for Leaks

### 1. Load Testing

```bash
# Run your server
npm start

# In another terminal, run load tests
# Monitor memory usage
```

### 2. Heap Snapshots

Use Chrome DevTools:

```bash
node --inspect dist/index.js
# Open chrome://inspect
# Take heap snapshots before/after operations
```

### 3. Clinic.js

```bash
npm install -g clinic
clinic doctor -- node dist/index.js
```

---

## Objects to Watch

Based on my analysis, monitor these objects:

| Object                     | Location                 | Risk Level | Status        |
| -------------------------- | ------------------------ | ---------- | ------------- |
| `AiDocker.AutoScaleWorker` | AiDocker.ts:23           | 🔴 High    | ✅ Fixed      |
| `StorageFoldersData.Lock`  | StorageFoldersData.ts:62 | 🔴 High    | ✅ Fixed      |
| `Cache.Index`              | Cache.ts:68              | 🟡 Medium  | 📝 Documented |
| `AiDocker.Instances`       | AiDocker.ts:24           | 🟡 Medium  | 📝 Monitor    |
| Event Listeners            | ReadableUtils.ts         | 🟡 Medium  | 📝 Documented |

---

## Common Patterns to Avoid

1. **setInterval without clearInterval**

   ```typescript
   // ❌ Bad
   setInterval(() => {...}, 1000)

   // ✅ Good
   const id = setInterval(() => {...}, 1000)
   // Later...
   clearInterval(id)
   ```

2. **Maps/Sets that grow forever**

   ```typescript
   // ❌ Bad
   map.set(key, value); // Never deleted

   // ✅ Good
   map.set(key, value);
   // Later, cleanup old entries
   if (isOld(key)) map.delete(key);
   ```

3. **Event listeners not removed**

   ```typescript
   // ❌ Bad
   stream.on("data", handler);

   // ✅ Good
   stream.once("data", handler);
   // Or
   stream.on("data", handler);
   stream.removeListener("data", handler); // When done
   ```

---

## Questions?

Check the detailed analysis in `docs/MEMORY_LEAK_ANALYSIS.md` for:

- Complete explanations of each issue
- Code examples
- Additional tools and techniques
- Testing strategies

---

## Summary

✅ **Created** memory leak detection utilities  
✅ **Fixed** critical memory leaks (AiDocker, StorageFoldersData)  
✅ **Documented** all potential issues  
✅ **Provided** monitoring tools

**Next:** Enable monitoring and run load tests to verify the fixes work!
