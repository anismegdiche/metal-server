# DataTable Leak Analysis & Fix

## 🚨 The Issue

The application was experiencing memory leaks despite previous optimizations. Analysis pointed to `DataTable` usage.
`DataTable` wraps a **DuckDB** instance, which uses native C++ resources and temporary files. These are **NOT** garbage collected automatically by the V8 engine quickly enough, or at all for the file handles/connections, unless `Dispose()` is called.

## 🔍 Findings

We identified that `Step.ts` was creating temporary `DataTable` instances for intermediate operations but failing to dispose of them.

### 1. `Step.Join` Leak

Every JOIN operation created a `dtRight` temporary table.

```typescript
// OLD CODE
dtRight = await Step.Select(...)
return this._joinCaseMap[type](..., dtRight, ...)
// dtRight is lost here -> LEAK!
```

### 2. `Step.Sync` Leak

Synchronization created `dtSource` and `dtDestination` temporary tables.

```typescript
// OLD CODE
const dtSource = await Step.Select(...)
const dtDestination = await Step.Select(...)
const report = await DataTableUtils.SyncReport(...)
// dtSource/dtDestination lost -> LEAK!
```

## ✅ The Fix

We wrapped these operations in `try-finally` blocks to guarantee disposal of intermediate resources.

### Fixed `Step.Join`

```typescript
try {
    dtRight = await Step.Select(...)
    return await this._joinCaseMap(...)
} finally {
    // Only dispose if it's a temporary table, not the passed context
    if (dtRight && dtRight !== step.currentDataTable) {
        dtRight.Dispose()
    }
}
```

### Fixed `Step.Sync`

```typescript
try {
  // ... operations ...
} finally {
  if (dtSource && dtSource !== step.currentDataTable) dtSource.Dispose();
  if (dtDestination && dtDestination !== step.currentDataTable)
    dtDestination.Dispose();
}
```

## 📉 Impact

- **Immediate Resource Release:** DuckDB connections are closed immediately after the step finishes.
- **File Cleanup:** Temporary DB files are deleted.
- **Memory Stability:** Prevents unbounded growth of native memory used by DuckDB.

## 🧪 Verification

A reproduction script `src/examples/ReproduceDataTableLeak.ts` was created to verify the behavior. It confirmed that creating DataTables without `Dispose()` leads to rapid memory growth, while using `Dispose()` keeps memory stable.

## ⚠️ Best Practices

1. **Always Dispose:** If you do `new DataTable()` or get one from `Step.Select()`, you own it (unless you return it). You must call `.Dispose()` when done.
2. **Check References:** Don't dispose a DataTable that might be in use elsewhere (like `step.currentDataTable` passed from outside).
3. **Use `try-finally`:** Ensure disposal happens even if errors occur.
