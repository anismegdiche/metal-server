# Memory Leak Analysis Report

## Executive Summary

This report identifies potential memory leaks in the Metal Server codebase based on static code analysis.

## Critical Issues Found

### 1. **AiDocker.ts - setInterval without cleanup** ⚠️ HIGH PRIORITY

**Location:** `src/modules/ai-engine/AiDocker.ts:111`

**Issue:**

```typescript
static StartScaler() {
    AiDocker.AutoScaleWorker = setInterval(AiDocker.AutoScale, AiDocker.ServiceInstance.ScaleInterval)
}
```

**Problem:**

- The `setInterval` is started but there's no corresponding `clearInterval` in a cleanup/shutdown method
- If the server restarts or reinitializes, a new interval is created without clearing the old one
- This creates orphaned timers that continue to run and consume memory

**Fix:**
Add a cleanup method:

```typescript
static StopScaler() {
    if (AiDocker.AutoScaleWorker) {
        clearInterval(AiDocker.AutoScaleWorker)
        AiDocker.AutoScaleWorker = undefined
    }
}
```

Call this in your shutdown/cleanup logic.

---

### 2. **StorageFoldersData.ts - Growing Lock Map** ⚠️ MEDIUM PRIORITY

**Location:** `src/modules/source/providers/StorageFoldersData.ts:62,78-81`

**Issue:**

```typescript
Lock: Map<string, Mutex> = new Map<string, Mutex>()

setLock(fileName: string) {
    if (!this.Lock.has(fileName))
        this.Lock.set(fileName, new Mutex())
}
```

**Problem:**

- Locks are added to the Map but never removed
- Every unique file path creates a new Mutex that stays in memory forever
- Over time, this Map will grow unbounded

**Fix:**
Add cleanup after operations complete:

```typescript
private async cleanupLock(fileName: string) {
    const lock = this.Lock.get(fileName)
    if (lock && !lock.IsLocked()) {
        this.Lock.delete(fileName)
    }
}
```

Or implement a TTL-based cleanup mechanism.

---

### 3. **ReadableUtils.ts - Event Listeners Not Removed** ⚠️ MEDIUM PRIORITY

**Location:** `src/utils/ReadableUtils.ts` (multiple methods)

**Issue:**

```typescript
readable.on('data', (chunk) => { ... })
readable.on('end', () => { ... })
readable.on('error', (err) => { ... })
```

**Problem:**

- Event listeners are attached but not explicitly removed
- If streams are reused or not properly closed, listeners accumulate
- Each listener holds references to closures and prevents garbage collection

**Fix:**
Use `once()` instead of `on()` for one-time events, or explicitly remove listeners:

```typescript
const onData = (chunk) => { ... }
const onEnd = () => {
    readable.removeListener('data', onData)
    readable.removeListener('error', onError)
    resolve(result)
}
const onError = (err) => {
    readable.removeListener('data', onData)
    readable.removeListener('end', onEnd)
    reject(err)
}

readable.on('data', onData)
readable.on('end', onEnd)
readable.on('error', onError)
```

Or better yet:

```typescript
readable.once('end', () => { ... })
readable.once('error', (err) => { ... })
```

---

### 4. **Cache.ts - Index Map Growth** ✅ **FIXED**

**Location:** `src/modules/cache/Cache.ts:68,118-119`

**Issue:**

```typescript
static Index = new Map<string, number>()

Cache.Index = schemaResponse && TypeUtils.IsSchemaResponseWithData(schemaResponse)
    ? new Map((await schemaResponse.data.Rows() as TCacheData[]).map(row => [row.hash, row.expires]))
    : new Map()
```

**Problem:**

- The Cache.Index Map can grow large over time
- While there are `Clean()` and `Purge()` methods, they need to be called manually
- No automatic cleanup of expired entries

**Fix:** ✅ **IMPLEMENTED**
Implemented automatic cleanup:

```typescript
static StartAutoCleanup(intervalMs: number = 3600000) { // 1 hour
    setInterval(async () => {
        const expiresNow = new Date().getTime()
        Cache.Index.forEach((expires, hash) => {
            if (expires < expiresNow) {
                Cache.Index.delete(hash)
            }
        })
    }, intervalMs)
}
```

```typescript
static StartAutoCleanup(intervalMs: number = 3600000) { // 1 hour
    setInterval(async () => {
        const expiresNow = new Date().getTime()
        Cache.Index.forEach((expires, hash) => {
            if (expires < expiresNow) {
                Cache.Index.delete(hash)
            }
        })
    }, intervalMs)
}
```

---

### 5. **AiDocker.ts - Docker Stream Event Listeners** ✅ **FIXED**

**Location:** `src/modules/ai-engine/AiDocker.ts:229,250,260,527,533-534`

**Issue:**

```typescript
stream.on('data', (data: Buffer) => { ... })
stream.on('end', () => { ... })
stream.on('error', (err: Error) => { ... })
```

**Problem:**

- Multiple stream event listeners in `BuildServiceImage` and `WaitForService`
- If errors occur before streams complete, listeners may not be cleaned up
- Docker streams can be long-lived

**Fix:** ✅ **IMPLEMENTED**
Ensured cleanup in all code paths using named functions and explicit removal:

```typescript
const cleanup = () => {
  stream.removeListener("data", onData);
  stream.removeListener("end", onEnd);
  stream.removeListener("error", onError);
};
```

```typescript
const cleanup = () => {
  stream.removeAllListeners("data");
  stream.removeAllListeners("end");
  stream.removeAllListeners("error");
};

stream.on("end", () => {
  cleanup();
  resolve();
});

stream.on("error", (err) => {
  cleanup();
  reject(err);
});
```

---

### 6. **ServerRuntime.ts - File Watcher** ⚠️ LOW PRIORITY

**Location:** `src/modules/core/ServerRuntime.ts:56`

**Issue:**

```typescript
chokidar.watch(ConfigManager.ConfigFilePath).on('change', () => { ... })
```

**Problem:**

- File watcher is created but never closed
- If the server restarts, a new watcher is created without closing the old one

**Fix:**
Store the watcher and close it on shutdown:

```typescript
static configWatcher: FSWatcher

static Init() {
    this.configWatcher = chokidar.watch(ConfigManager.ConfigFilePath)
        .on('change', () => { ... })
}

static Cleanup() {
    if (this.configWatcher) {
        this.configWatcher.close()
    }
}
```

---

## Objects to Monitor

Based on the analysis, these objects should be tracked for growth:

1. **AiDocker.Instances** - Map of Docker service instances
2. **Cache.Index** - Map of cache hashes and expiration times
3. **StorageFoldersData.Lock** - Map of file locks (per instance)
4. **SynchronizerManager** - Internal synchronization state
5. **DataTable instances** - Check if they're being properly released

---

## Recommended Actions

### Immediate (High Priority)

1. ✅ Add cleanup for `AiDocker.AutoScaleWorker` interval
2. ✅ Implement lock cleanup in `StorageFoldersData`
3. ✅ Add stream listener cleanup in `AiDocker` methods

### Short Term (Medium Priority)

1. ✅ Review and fix event listener patterns in `ReadableUtils`
2. ✅ Add automatic cache cleanup
3. ✅ Implement proper shutdown hooks for all services

### Long Term (Low Priority)

1. ✅ Add comprehensive memory monitoring using the `MemoryLeakDetector`
2. ✅ Implement resource pooling for frequently created objects
3. ✅ Add metrics/telemetry for memory usage trends

---

## How to Use the Memory Leak Detector

1. **Add to your main server file:**

```typescript
import { MemoryLeakMonitor } from "./examples/MemoryLeakMonitor";

// On server start
MemoryLeakMonitor.Init();

// On server shutdown
process.on("SIGTERM", () => {
  MemoryLeakMonitor.Cleanup();
});
```

2. **Run with garbage collection exposed:**

```bash
node --expose-gc dist/index.js
```

3. **Monitor the logs:**
   The detector will print reports every 60 seconds showing:

- Memory growth rate
- Object growth rate
- Which objects are growing

4. **Manual inspection:**

```typescript
// Take a snapshot
MemoryLeakMonitor.GetSnapshot();

// Force GC and compare
MemoryLeakMonitor.ForceGC();
setTimeout(() => {
  MemoryLeakMonitor.GetSnapshot();
}, 1000);
```

---

## Testing for Memory Leaks

1. **Load Testing:**
   - Run the server under load for extended periods
   - Monitor memory usage trends
   - Look for continuous growth without stabilization

2. **Heap Snapshots:**
   - Use Chrome DevTools or clinic.js
   - Take snapshots before and after operations
   - Compare to identify retained objects

3. **Automated Monitoring:**
   - Use the `MemoryLeakDetector` in production
   - Set up alerts for abnormal growth rates
   - Review reports regularly

---

## Additional Tools

Consider using these tools for deeper analysis:

1. **clinic.js** - Comprehensive Node.js performance analysis

   ```bash
   npm install -g clinic
   clinic doctor -- node dist/index.js
   ```

2. **node --inspect** - Chrome DevTools integration

   ```bash
   node --inspect dist/index.js
   # Open chrome://inspect
   ```

3. **heapdump** - Generate heap snapshots programmatically
   ```bash
   npm install heapdump
   ```

---

## Conclusion

The main memory leak risks in your codebase are:

1. **Uncleaned intervals/timers** (AiDocker)
2. **Growing Maps without cleanup** (StorageFoldersData.Lock, Cache.Index)
3. **Event listeners not removed** (ReadableUtils, AiDocker streams)

Use the provided `MemoryLeakDetector` to monitor these objects and verify that the fixes work.
