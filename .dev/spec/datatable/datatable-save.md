# DataTable - Save / Load - v1

## 1. Overview

Save/Load provides **file-based persistence** for DataTable using DuckDB's native database format (`.db`). Save writes the DataTable's full state (data + schema + metadata) to a DuckDB database file. Load restores it from that file.

This is distinct from snapshots (in-memory copies within the same connection). Save/Load enables:
- Persisting data across process restarts
- Transferring data between DataTable instances
- Sharing data via DuckDB-compatible files

---

## 2. API

```ts
type TSaveOptions = {
  mode?: "overwrite" | "append"
}

class DataTable {
  Save(filePath?: string, opt?: TSaveOptions): Promise<this>
  Load(filePath?: string): Promise<this>
}
```

If `filePath` is omitted:
- **Save**: generates a path under `DATATABLE_TEMP_PATH` using the sanitized file name.
- **Load**: uses the same default path as Save would.

---

## 3. File Naming & Sanitization

The file is named using the DataTable's `Name` property. To ensure filesystem compatibility across operating systems, any characters that are not alphanumeric, underscores, or dashes are replaced with underscores:

```ts
const safeFileName = this.Name.replaceAll(/[^a-zA-Z0-9_\-]/g, "_") + ".db"
const defaultPath = StringUtils.Path(DATATABLE_TEMP_PATH, safeFileName)
```

Example:
- Name: `my table` -> Default path: `{DATATABLE_TEMP_PATH}/my_table.db`
- Name: `user/profile` -> Default path: `{DATATABLE_TEMP_PATH}/user_profile.db`

The internal table name inside the DuckDB file remains the double-quoted `SafeName` to ensure lossless round-tripping.

---

## 4. Behavior

### Save(filePath?, opt?)

1. If `filePath` omitted, compute default sanitized path.
2. Ensure parent directory exists.
3. Determine mode from `opt` (default is `"overwrite"`):
   - In **overwrite** mode: If file exists, delete it via `fs.rmSync(filePath, { force: true })` to prevent fragmentation and page bloat.
   - In **append** mode: Ensure file exists. If it does not exist, initialize it as a new file.
4. Attach the database file using a unique temporary alias (e.g. `save_{UUID}`) to prevent conflicts with live persistent/attached databases:
   `ATTACH '{filePath}' AS {tempAlias} (READ_ONLY=false);`
5. Wrap the save operations in a DuckDB transaction: `BEGIN TRANSACTION;`
6. If the file is newly created (or in overwrite mode):
   - Create sequence: `{tempAlias}.main.seq_{this.Name}`
   - Create table: `{tempAlias}.main.{SafeName}` (using `duckDb_Sql_CreateTable`)
   - Create versioning metadata table: `{tempAlias}.main.__datatable_meta__` with schema:
     `CREATE TABLE {tempAlias}.main.__datatable_meta__ (key TEXT PRIMARY KEY, value TEXT);`
     Insert version and schema hash details:
     `INSERT INTO {tempAlias}.main.__datatable_meta__ (key, value) VALUES ('version', '1'), ('schema_hash', '{hash}');`
7. Copy all rows from the memory table:
   `INSERT INTO {tempAlias}.main.{SafeName} SELECT * FROM {this.SafeName};`
8. Query the maximum sequence number from the saved table:
   `SELECT COALESCE(MAX(${DT_SYS_FIELDS.seq}), 0) as maxSeq FROM {tempAlias}.main.{SafeName}`
9. Restart the sequence on disk to `maxSeq + 1` to ensure correct starting sequence number.
10. Commit transaction: `COMMIT;` (or rollback on error).
11. Detach the database file: `DETACH {tempAlias};`
12. Return `this`.

### Load(filePath?)

1. If `filePath` omitted, compute same default sanitized path.
2. Assert file exists — throw `HttpErrorNotFound` if missing.
3. Ensure the local table is initialized by calling `_dbEnsureInitialized()`.
4. Attach the database file using a unique temporary alias (e.g. `load_{UUID}`):
   `ATTACH '{filePath}' AS {tempAlias};`
5. Validate schema and compatibility:
   - Check version: Query version from `{tempAlias}.main.__datatable_meta__`. Throw error if incompatible.
   - Check table existence: Verify `{tempAlias}.main.{SafeName}` exists.
   - Validate column alignment: Query column count and schema from `{tempAlias}.main.{SafeName}` using `PRAGMA table_info(...)`. Match them against local memory table columns to prevent silent column mismatch or alignment errors. Throw descriptive error on mismatch.
6. Clear existing memory table data using `TRUNCATE TABLE {this.SafeName};` for optimal speed and clear intent.
7. Wrap in transaction: `BEGIN TRANSACTION;`
8. Copy rows: `INSERT INTO {this.SafeName} SELECT * FROM {tempAlias}.main.{SafeName};`
9. Query `maxSeq` from the loaded data:
   `SELECT COALESCE(MAX(${DT_SYS_FIELDS.seq}), 0) as maxSeq FROM {this.SafeName}`
10. Restart the local memory table's sequence generator to `maxSeq + 1` to avoid sequence collisions on subsequent writes.
11. Commit transaction: `COMMIT;` (or rollback on error).
12. Detach the database file: `DETACH {tempAlias};`
13. Call `FieldsSet()` to rebuild field metadata.
14. Return `this`.

---

## 5. Thread Safety & Multi-process Locking

- **In-process Serialization**: Save/Load operations are serialized through the existing `_writeLock` queue of the DataTable instance.
- **Cross-Instance File Lock**: To prevent two DataTable instances (or multiple processes) from writing to the same file concurrently, a global registry of active file paths `Map<string, Promise<void>>` is checked. If the target file path is already being saved to, subsequent operations wait/queue behind that promise.

---

## 6. Validation

| Condition | Behavior |
|-----------|----------|
| File not found (Load) | Throw `HttpErrorNotFound` |
| Directory not writable (Save) | DuckDB error propagates |
| Corrupted `.db` file (Load) | DuckDB error/corruption propagates |
| Schema mismatch / Table missing | Throw clear descriptive validation error |
| Version incompatible | Throw error: "Incompatible DataTable version" |

---

## 7. Existing Methods (unchanged)

- `MoveToDisk()` — transitions in-memory DataTable to persistent (encrypted) mode — remains separate
- `Copy()` / `FreeSql()` — unchanged

Save/Load is a new complementary feature for ad-hoc file persistence.

---

## 8. Test Cases

Tests go in `src/types/__tests__/DataTable.test.ts`.

### 8.1 Save

| # | Test | Expected |
|---|------|----------|
| 1 | Save with default path | File created at sanitized path `{temp}/{SanitizedName}.db` |
| 2 | Save with explicit path | File created at specified path |
| 3 | Save empty DataTable | File created, Load returns 0 rows |
| 4 | Save DataTable with 3 rows | File contains 3 rows |
| 5 | Save overwrites existing file | File replaced completely (old data removed) |
| 6 | Save in append mode | New rows appended to existing file |

### 8.2 Load

| # | Test | Expected |
|---|------|----------|
| 7 | Load into empty DataTable | Rows restored, Fields rebuilt |
| 8 | Load replaces existing data | Old rows gone (truncated), new rows from file |
| 9 | Load non-existent file | Throws `HttpErrorNotFound` |
| 10 | Load incompatible schema | Throws validation error |
| 11 | Load incompatible version | Throws validation error |

### 8.3 Round-trip

| # | Test | Expected |
|---|------|----------|
| 12 | Save then Load (same DataTable) | Data is identical before save and after load |
| 13 | Save then Load into different DataTable | Data matches exactly |
| 14 | Round-trip preserves row count | Count before save == count after load |
| 15 | Save, modify DataTable, Load restores original | Data reverts to saved state |

### 8.4 Edge Cases

| # | Test | Expected |
|---|------|----------|
| 16 | Save after SnapshotSave | Only main table data saved, not snapshots |
| 17 | Load into DataTable with different name | Load fails with schema/table validation error |
| 18 | Save, dispose DataTable, Load into new instance | New DataTable has saved data |

---

## 9. Implementation Notes

### 9.1 DuckDB ATTACH Schema and Temporary Aliasing

When attaching a `.db` file, DuckDB exposes it as a schema-scoped database.
Because persistent or attached DataTables already occupy their `SafeName` as a database alias in the connection, we must use a unique temporary alias (e.g. `save_{UUID}` or `load_{UUID}`) for the attachment.

```sql
ATTACH 'file.db' AS temp_alias;
-- Access path: temp_alias.main."my_table"
```

This allows lossless round-tripping of the table name `"my_table"` (stored inside the attached database under the standard `main` schema) without alias clashes.

### 9.2 File Extension

The `.db` extension is a convention. DuckDB accepts any extension — the file format is always DuckDB native database format.
