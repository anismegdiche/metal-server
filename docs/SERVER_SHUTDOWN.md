# Server Shutdown Logic - Implementation Guide

## Overview

The Metal Server now has comprehensive graceful shutdown logic that properly cleans up all resources when the server stops. This prevents memory leaks and ensures data integrity.

## What Was Added

### 1. **ServerShutdown Class** (`src/modules/core/ServerShutdown.ts`)

A centralized shutdown manager that orchestrates the graceful shutdown of all server components.

**Features:**

- ✅ Stops HTTP server from accepting new connections
- ✅ Stops all scheduled tasks
- ✅ Stops AI Engine and Docker containers
- ✅ Closes file watchers
- ✅ Disconnects from all data sources
- ✅ Disconnects from cache
- ✅ Runs final cleanup (garbage collection, lock cleanup)
- ✅ Handles shutdown timeout (30 seconds default)
- ✅ Registers signal handlers (SIGTERM, SIGINT, uncaught exceptions, unhandled rejections)

### 2. **Updated Files**

#### `src/index.ts`

- Added `ServerShutdown.SetupSignalHandlers()` to register shutdown handlers on startup
- Added proper error handling with `process.exit(1)` on initialization failure

#### `src/modules/core/ServerEndpoint.ts`

- Stores the HTTP server instance
- Registers it with `ServerShutdown` for graceful shutdown

#### `src/modules/core/ServerRuntime.ts`

- Stores the config file watcher instance
- Registers it with `ServerShutdown` for proper cleanup
- Implemented `Stop()` method that triggers graceful shutdown

#### `src/modules/ai-engine/AiDocker.ts`

- Added `StopScaler()` method to cleanup the AutoScaleWorker interval

#### `src/modules/source/providers/StorageFoldersData.ts`

- Added lock cleanup methods to prevent memory leaks

## How It Works

### Shutdown Sequence

When a shutdown signal is received (SIGTERM, SIGINT, Ctrl+C, etc.), the following sequence occurs:

```
1. Stop HTTP Server
   └─> No new requests accepted
   └─> Existing requests complete

2. Stop Scheduled Tasks
   └─> All cron jobs stopped

3. Stop AI Engine
   └─> AutoScaler stopped
   └─> Docker containers cleaned up

4. Stop File Watchers
   └─> Config file watcher closed

5. Disconnect Data Sources
   └─> All database connections closed

6. Disconnect Cache
   └─> Cache connections closed

7. Final Cleanup
   └─> Lock cleanup
   └─> Garbage collection (if --expose-gc)

8. Exit Process
   └─> Clean exit with code 0
```

### Timeout Protection

If shutdown takes longer than 30 seconds (configurable), the process will force exit to prevent hanging.

```typescript
// Change timeout (default: 30000ms)
ServerShutdown.SetShutdownTimeout(60000); // 60 seconds
```

## Usage

### Automatic Shutdown

The shutdown handlers are automatically registered when the server starts. No manual intervention needed!

**Supported signals:**

- `SIGTERM` - Docker/Kubernetes graceful shutdown
- `SIGINT` - Ctrl+C in terminal
- `SIGKILL` - Force kill (cannot be caught, but other signals handle graceful shutdown)
- `Uncaught Exception` - Unhandled errors
- `Unhandled Rejection` - Unhandled promise rejections

### Manual Shutdown

You can trigger a manual shutdown via the API:

```bash
POST /server/stop
Authorization: Bearer <admin-token>
```

Or programmatically:

```typescript
import { ServerRuntime } from "./modules/core/ServerRuntime";

// Trigger shutdown
await ServerRuntime.Stop(userToken);
```

## Testing Shutdown

### Local Testing

1. **Start the server:**

   ```bash
   npm start
   ```

2. **Trigger shutdown with Ctrl+C:**

   ```
   Press Ctrl+C
   ```

3. **Watch the logs:**
   ```
   SIGINT received. Starting graceful shutdown...
   Stopping HTTP server...
   ✅ HTTP server stopped
   Stopping scheduled tasks...
   ✅ Scheduled tasks stopped
   Stopping AI Engine...
   ✅ AI Engine stopped
   Stopping file watchers...
   ✅ Config file watcher stopped
   Disconnecting from data sources...
   ✅ Data sources disconnected
   Disconnecting from cache...
   ✅ Cache disconnected
   Performing final cleanup...
   ✅ Final cleanup completed
   ✅ Graceful shutdown completed successfully
   ```

### Docker Testing

1. **Build and run:**

   ```bash
   docker build -t metal-server .
   docker run -p 3000:3000 metal-server
   ```

2. **Stop gracefully:**

   ```bash
   docker stop metal-server
   ```

   Docker sends SIGTERM, waits 10 seconds, then sends SIGKILL if still running.

### Kubernetes Testing

In Kubernetes, when a pod is terminated:

1. K8s sends SIGTERM to the container
2. Waits for `terminationGracePeriodSeconds` (default: 30s)
3. Sends SIGKILL if still running

Our shutdown completes in < 30 seconds, so it works perfectly with default K8s settings.

## Monitoring Shutdown

### Logs to Watch

During shutdown, look for these log messages:

✅ **Success indicators:**

- `✅ HTTP server stopped`
- `✅ Scheduled tasks stopped`
- `✅ AI Engine stopped`
- `✅ Config file watcher stopped`
- `✅ Data sources disconnected`
- `✅ Cache disconnected`
- `✅ Final cleanup completed`
- `✅ Graceful shutdown completed successfully`

⚠️ **Warning indicators:**

- `Shutdown already in progress...` - Multiple shutdown signals received
- `No HTTP server to stop` - Server wasn't fully initialized

❌ **Error indicators:**

- `Error stopping HTTP server: ...`
- `Error disconnecting data sources: ...`
- `Shutdown timeout exceeded. Forcing exit...`

## Integration with Memory Leak Detection

The shutdown logic integrates with the memory leak detection system:

```typescript
import { MemoryLeakMonitor } from "./examples/MemoryLeakMonitor";

// On startup
MemoryLeakMonitor.Init();

// Shutdown is automatic - the signal handlers will:
// 1. Stop all monitoring
// 2. Cleanup all resources
// 3. Exit cleanly
```

## Best Practices

### 1. **Always Use Graceful Shutdown**

Never use `process.exit()` directly in your code. Let the shutdown manager handle it.

❌ **Bad:**

```typescript
// Don't do this
process.exit(1);
```

✅ **Good:**

```typescript
// Do this
throw new Error("Something went wrong");
// The uncaught exception handler will trigger graceful shutdown
```

### 2. **Add Cleanup to New Components**

When adding new components that need cleanup, add them to `ServerShutdown.ts`:

```typescript
// Example: Adding WebSocket cleanup
private static async StopWebSockets(): Promise<void> {
    try {
        Logger.Info('Stopping WebSocket server...')
        await WebSocketServer.close()
        Logger.Info('✅ WebSocket server stopped')
    } catch (error) {
        Logger.Error(`Error stopping WebSocket server: ${error}`)
    }
}

// Then add to the Shutdown() method:
static async Shutdown(signal: string): Promise<void> {
    // ... existing code ...
    await this.StopWebSockets() // Add here
    // ... rest of shutdown ...
}
```

### 3. **Test Shutdown Regularly**

Include shutdown testing in your CI/CD pipeline:

```bash
# Start server in background
npm start &
SERVER_PID=$!

# Wait for startup
sleep 5

# Send SIGTERM
kill -TERM $SERVER_PID

# Wait for graceful shutdown
wait $SERVER_PID

# Check exit code
if [ $? -eq 0 ]; then
    echo "✅ Graceful shutdown successful"
else
    echo "❌ Shutdown failed"
    exit 1
fi
```

## Troubleshooting

### Shutdown Hangs

If shutdown hangs for 30 seconds and force-exits:

1. **Check logs** to see which step is hanging
2. **Increase timeout** if needed:
   ```typescript
   ServerShutdown.SetShutdownTimeout(60000);
   ```
3. **Debug the hanging component** - add more logging

### Resources Not Cleaned Up

If you see resource leaks after shutdown:

1. **Check if component is registered** in `ServerShutdown.ts`
2. **Add cleanup method** for the component
3. **Test with memory leak detector**

### Docker Container Won't Stop

If `docker stop` takes too long:

1. **Check shutdown timeout** - should be < 10 seconds for Docker
2. **Reduce timeout** if needed
3. **Check for blocking operations** in shutdown sequence

## Summary

✅ **Implemented:**

- Comprehensive shutdown manager
- Signal handlers for all shutdown scenarios
- Proper cleanup of all resources
- Timeout protection
- Integration with existing components

✅ **Benefits:**

- No more resource leaks on shutdown
- Clean Docker/Kubernetes deployments
- Proper data integrity
- Better error handling
- Production-ready shutdown logic

✅ **Next Steps:**

- Test shutdown in your environment
- Monitor shutdown logs
- Add component-specific cleanup as needed
- Integrate with monitoring/alerting systems
