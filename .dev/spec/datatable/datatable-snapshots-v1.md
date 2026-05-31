# DataTable - Snapshots - v1

## 1. Overview

A snapshot is a **named, user-visible** copy of a DataTable's data (all non-deleted rows) at a point in time. Snapshots are stored as **full DuckDB tables in the same connection** as the main table. Loading a snapshot **replaces** the main table's data entirely.

---

## 2. SnapShots Property

A new public property `SnapShots` on `DataTable` exposes the snapshot catalog:

```ts
class DataTable {
  SnapShots: Map<string, TSnapshotInfo>

  SnapshotSave(name: string): Promise<this>
  SnapshotLoad(name: string): Promise<this>
  SnapshotDelete(name: string): Promise<this>
  SnapshotList(): Promise<TSnapshotInfo[]>
  SnapshotExists(name: string): Promise<boolean>
}
```

`SnapShots` is a `Map<string, TSnapshotInfo>` — hydrated from the `__snapshots__` DuckDB table on init, updated synchronously on Save/Delete. It replaces the earlier `_snapshotCache` private field design.

---

## 3. Types

```ts
type TSnapshotInfo = {
  name: string
  created_at: Date
  row_count: number
}
```

---

## 4. Internal Storage

### 4.1 Snapshot Data Tables

Each snapshot's data is a DuckDB table in the same connection:

| Artifact | Internal Table Name |
|----------|-------------------|
| Snapshot data | `__snapshot_{name}` |

The table name uses the raw user-provided name. When referenced in SQL, wrap with `duckDb_Sql_SafeName` (which double-quotes the identifier), allowing any valid DuckDB identifier characters.

Snapshot tables use the same schema as the main table (`__seq__`, `__idx__`, `__data__`, `__deleted__`, `__created_at__`).

### 4.2 `__snapshots__` Catalog Table

A `__snapshots__` table stores the catalog of all snapshots persistently. This is the **source of truth**:

```sql
CREATE TABLE IF NOT EXISTS __snapshots__ (
  name       VARCHAR PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  row_count  INTEGER
);
```

### 4.3 SnapShots Map

`this.SnapShots = new Map<string, TSnapshotInfo>()` mirrors the `__snapshots__` table in-memory for fast reads (no DuckDB query on every `SnapshotList()` or `SnapshotExists()`).

---

## 5. Initialization — Loading the Catalog

On `_dbEnsureInitialized()`, after the main table is created:

1. `CREATE TABLE IF NOT EXISTS __snapshots__ (name VARCHAR PRIMARY KEY, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, row_count INTEGER)`
2. `SELECT name, created_at, row_count FROM __snapshots__ ORDER BY created_at DESC`
3. For each row: `this.SnapShots.set(row.name, { name: row.name, created_at: row.created_at, row_count: row.row_count })`

This ensures snapshots survive persistent DataTable restarts.

---

## 6. Behavior

### SnapshotSave(name)
1. Validate name: non-empty, not starting with `__`, max 128 chars
2. Assert `this.SnapShots` has no entry for name — throw `HttpErrorConflict` (409) if duplicate
3. `const snapTable = duckDb_Sql_SafeName('__snapshot_' + name)`
4. `const seqName = duckDb_Sql_SafeSeqName('__snapshot_' + name)` — derive sequence name
5. Execute `duckDb_Sql_CreateTable(snapTable, seqName)` to create table with full schema (sequence, defaults, PK)
6. `INSERT INTO {snapTable} (__seq__, __idx__, __data__, __deleted__, __created_at__) SELECT __seq__, __idx__, __data__, __deleted__, __created_at__ FROM {main.SafeName} WHERE __deleted__ = false`
7. `SELECT COUNT(*) FROM {snapTable}` for row count
8. `INSERT INTO __snapshots__ (name, created_at, row_count) VALUES (name, CURRENT_TIMESTAMP, row_count)`
9. `this.SnapShots.set(name, { name, created_at: new Date(), row_count })`
10. Return `this`

### SnapshotLoad(name)
1. Assert `this.SnapShots` has entry for name — throw `HttpErrorNotFound` (404) if not
2. `const snapTable = duckDb_Sql_SafeName('__snapshot_' + name)`
3. `DELETE FROM {main.SafeName}`
4. `INSERT INTO {main.SafeName} SELECT * FROM {snapTable}`
5. `FieldsSet()` to rebuild field metadata
6. Return `this`

### SnapshotDelete(name)
1. Assert `this.SnapShots` has entry for name — throw `HttpErrorNotFound` (404) if not
2. `const snapTable = duckDb_Sql_SafeName('__snapshot_' + name)`
3. `DROP TABLE IF EXISTS {snapTable}`
4. `DELETE FROM __snapshots__ WHERE name = name`
5. `this.SnapShots.delete(name)`
6. Return `this`

### SnapshotList()
1. Return `Array.from(this.SnapShots.values())`

### SnapshotExists(name)
1. Return `this.SnapShots.has(name)`

---

## 7. Implementation Notes

### 7.1 DuckDB Operations

| Operation | DuckDB SQL |
|-----------|-----------|
| Ensure catalog | `CREATE TABLE IF NOT EXISTS __snapshots__ (name VARCHAR PRIMARY KEY, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, row_count INTEGER)` |
| Create snapshot schema | `duckDb_Sql_CreateTable(snapTable, seqName)` — creates table + sequence with full schema |
| Populate snapshot data | `INSERT INTO {snapTable} (__seq__, __idx__, __data__, __deleted__, __created_at__) SELECT __seq__, __idx__, __data__, __deleted__, __created_at__ FROM {main.SafeName} WHERE __deleted__ = false` |
| Save catalog entry | `INSERT INTO __snapshots__ (name, created_at, row_count) VALUES (name, CURRENT_TIMESTAMP, row_count)` |
| Load snapshot | `DELETE FROM {main.SafeName}; INSERT INTO {main.SafeName} SELECT * FROM {snapTable}` |
| Delete snapshot data | `DROP TABLE IF EXISTS {snapTable}` |
| Delete catalog entry | `DELETE FROM __snapshots__ WHERE name = name` |
| Read catalog (init) | `SELECT name, created_at, row_count FROM __snapshots__ ORDER BY created_at DESC` |

Where `snapTable = duckDb_Sql_SafeName('__snapshot_' + name)` and `main.SafeName` is the DataTable's own safe name.

### 7.2 No Custom Sanitization

Snapshot table names use the raw user-provided name with an `__snapshot_` prefix. DuckDB's double-quoted identifiers (via `duckDb_Sql_SafeName`) handle special characters safely. No additional sanitization is needed.

### 7.3 SnapshotLoad Implementation Detail

`SnapshotLoad` uses `DELETE` + `INSERT` (not `DROP` + `CREATE`) to preserve the DuckDB table schema and sequence:

```
DELETE FROM {main.SafeName};
INSERT INTO {main.SafeName} SELECT * FROM {snapTable};
```

The `__seq__` values from the snapshot are preserved as-is. The sequence generator is unaffected.

---

## 8. Test Cases

Tests should be added to `src/types/__tests__/DataTable.test.ts` following the existing testing patterns (Vitest, `vi.mock`, `beforeEach`, `afterEach`).

### 8.1 SnapshotSave

| # | Test | Expected |
|---|------|----------|
| 1 | Save snapshot on empty DataTable | `SnapShots` has entry, `row_count` is 0, DuckDB table `__snapshot_{name}` exists |
| 2 | Save snapshot with 3 rows | `SnapShots` has entry, `row_count` is 3 |
| 3 | Save snapshot with duplicate name | Throws `HttpErrorConflict` (409), no new table created |
| 4 | Save snapshot with name starting with `__` | Throws validation error |
| 5 | Save snapshot, then verify DuckDB table has same columns as main | Schema matches: `__seq__`, `__idx__`, `__data__`, `__deleted__`, `__created_at__` |
| 6 | Save snapshot, then verify `__snapshots__` table has matching entry | `SELECT * FROM __snapshots__ WHERE name = ?` returns one row |

### 8.2 SnapshotLoad

| # | Test | Expected |
|---|------|----------|
| 7 | Load snapshot into DataTable with different data | Main table data is replaced by snapshot data |
| 8 | Load snapshot on empty DataTable | Main table now has snapshot's rows |
| 9 | Load non-existent snapshot | Throws `HttpErrorNotFound` (404) |
| 10 | Load snapshot then verify Fields are rebuilt | `Fields` reflects snapshot data columns |
| 11 | Load snapshot multiple times (idempotent) | Second load produces same state as first |

### 8.3 SnapshotDelete

| # | Test | Expected |
|---|------|----------|
| 12 | Delete existing snapshot | `SnapShots` has no entry, DuckDB table dropped, `__snapshots__` entry removed |
| 13 | Delete non-existent snapshot | Throws `HttpErrorNotFound` (404) |
| 14 | Delete snapshot, then SnapshotSave same name | Succeeds (name is free again) |
| 15 | Delete snapshot does not affect main table data | Main table rows unchanged |

### 8.4 SnapshotList & SnapshotExists

| # | Test | Expected |
|---|------|----------|
| 16 | List snapshots when none exist | Returns `[]` |
| 17 | List snapshots after saving 3 | Returns array of 3 `TSnapshotInfo` objects |
| 18 | SnapshotExists returns true for saved snapshot | `true` |
| 19 | SnapshotExists returns false for unknown name | `false` |
| 20 | SnapshotExists after delete | `false` |

### 8.5 Persistence & Initialization

| # | Test | Expected |
|---|------|----------|
| 21 | Create persistent DataTable, save snapshot, dispose, recreate | `SnapShots` is re-hydrated from `__snapshots__` table |
| 22 | Create persistent DataTable with no snapshots | `SnapShots` is empty, `__snapshots__` table auto-created on init |
| 23 | Snapshot table manually dropped from DuckDB | `SnapshotLoad` cleans up stale catalog entry and throws |
| 24 | Dispose ephemeral DataTable with snapshots | Snapshots lost (no re-discovery possible) |
| 25 | `__snapshots__` table missing on init | Auto-created via `CREATE TABLE IF NOT EXISTS` before hydration |

### 8.6 Edge Cases

| # | Test | Expected |
|---|------|----------|
| 26 | SnapshotLoad on table with deleted rows marked `__deleted__ = true` | Snapshot only contains non-deleted rows |
| 27 | Large snapshot (100K rows) | Saves and loads without memory issues |
| 28 | Concurrent SnapshotSave + SnapshotDelete on same name | Serialized by `_writeLock`, no race |
| 29 | Snapshot name with special characters: `my-data_v2.0` | DuckDB quoted identifier handles it |
| 30 | SnapshotLoad replaces main table entirely | Old data is lost unless a snapshot was saved first |
