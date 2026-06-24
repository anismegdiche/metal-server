import { DuckDBInstance, DuckDBConnection, DuckDBValue } from '@duckdb/node-api';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Helper function to safely parse JSON with type assertion
function safeJsonParse<T = JsonValue>(json: string | null | undefined): T | null {
    if (json === null || json === undefined) return null;
    try {
        return JSON.parse(json) as T;
    } catch (e) {
        console.error('Failed to parse JSON:', e);
        return null;
    }
}

// Helper function to safely convert DuckDBValue to number
function toNumber(value: DuckDBValue): number | null {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
}

// Helper function to safely convert DuckDBValue to string
function toString(value: DuckDBValue): string {
    return value === null || value === undefined ? '' : String(value);
}

// LRU Cache implementation for memory management
class LRUCache<K, V> {
    private cache = new Map<K, V>();
    private maxSize: number;

    constructor(maxSize: number = 1000) {
        this.maxSize = maxSize;
    }

    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    set(key: K | undefined, value: V): void {
        if (key === undefined) return;
        // Remove if already exists to reinsert at end
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        // Evict oldest if at capacity
        else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value as K;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}

// Lazy loading result set with streaming support
class LazyResultSet<T> {
    private cache: LRUCache<number, T>;
    private totalCount: number | null = null;
    private lastId: bigint | null = null;
    private chunkSize: number;
    private done: boolean = false;

    constructor(
        private connection: DuckDBConnection,
        private query: string,
        private params: (string | number | boolean | null)[],
        private parser: (row: Record<string, DuckDBValue>) => T,
        chunkSize: number = 100,
        cacheSize: number = 1000
    ) {
        this.chunkSize = chunkSize;
        this.cache = new LRUCache<number, T>(cacheSize);
    }

    // Cursor-based chunk fetching for O(1) performance
    private async fetchNextChunk(): Promise<T[]> {
        let fullQuery: string;

        if (this.lastId === null) {
            // First chunk - add ORDER BY and LIMIT
            fullQuery = `${this.query} ORDER BY id LIMIT ${this.chunkSize}`;
        } else {
            // Subsequent chunks - add cursor condition, ORDER BY, and LIMIT
            // Add the cursor condition to the existing WHERE clause
            fullQuery = `${this.query} AND id > ${this.lastId} ORDER BY id LIMIT ${this.chunkSize}`;
        }

        const reader = await this.connection.streamAndReadAll(fullQuery, this.params);
        const rows = reader.getRowObjects();

        if (rows.length === 0) {
            this.done = true;
            return [];
        }

        // Update last ID for cursor
        const lastRowId = rows[rows.length - 1].id;
        this.lastId = typeof lastRowId === 'bigint' 
        ? lastRowId 
        : (typeof lastRowId === 'string' 
            ? BigInt(lastRowId) 
            : null);

        return rows.map(this.parser);
    }

    private async ensureLoaded(index: number): Promise<T | undefined> {
        // Check cache first
        if (this.cache.has(index)) {
            return this.cache.get(index);
        }

        // For cursor-based pagination, we need to load sequentially
        // This is a trade-off: random access requires loading all previous chunks
        let currentIndex = 0;
        this.lastId = null;
        this.done = false;

        while (currentIndex <= index && !this.done) {
            const chunk = await this.fetchNextChunk();

            chunk.forEach((item, i) => {
                const globalIndex = currentIndex + i;
                this.cache.set(globalIndex, item);
            });

            if (chunk.length === 0) {
                break;
            }

            currentIndex += chunk.length;
        }

        return this.cache.get(index);
    }

    async get(index: number): Promise<T | undefined> {
        return this.ensureLoaded(index);
    }

    async length(): Promise<number> {
        if (this.totalCount !== null) {
            return this.totalCount;
        }

        // More efficient count - strip ORDER BY and use simple COUNT
        const countQuery = this.query
            .replaceAll(/ORDER BY.*/i, '')
            .replaceAll(/LIMIT.*/i, '');
        const wrappedQuery = `SELECT COUNT(*) as count FROM (${countQuery})`;

        const reader = await this.connection.runAndReadAll(wrappedQuery, this.params);
        const rows = reader.getRowObjects();
        this.totalCount = rows[0]?.count as number ?? 0;

        return this.totalCount;
    }

    // Streaming async iterator - most memory efficient
    async *[Symbol.asyncIterator](): AsyncIterator<T> {
        this.lastId = null;
        this.done = false;

        while (!this.done) {
            const chunk = await this.fetchNextChunk();

            for (const item of chunk) {
                yield item;
            }

            if (chunk.length < this.chunkSize) {
                this.done = true;
            }
        }
    }

    // forEach that processes on demand
    async forEach(callback: (item: T, index: number) => void | Promise<void>): Promise<void> {
        let index = 0;
        for await (const item of this) {
            await callback(item, index++);
        }
    }

    // Map that processes on demand
    async map<U>(callback: (item: T, index: number) => U | Promise<U>): Promise<U[]> {
        const results: U[] = [];
        let index = 0;
        for await (const item of this) {
            results.push(await callback(item, index++));
        }
        return results;
    }

    // Filter that processes on demand
    async filter(callback: (item: T, index: number) => boolean | Promise<boolean>): Promise<T[]> {
        const results: T[] = [];
        let index = 0;
        for await (const item of this) {
            if (await callback(item, index++)) {
                results.push(item);
            }
        }
        return results;
    }

    // Convert to array (loads everything)
    async toArray(): Promise<T[]> {
        const results: T[] = [];
        for await (const item of this) {
            results.push(item);
        }
        return results;
    }

    // Get a slice (optimized for cursor pagination)
    async slice(start: number, end?: number): Promise<T[]> {
        const results: T[] = [];
        let index = 0;

        for await (const item of this) {
            if (index >= start && (end === undefined || index < end)) {
                results.push(item);
            }
            index++;
            if (end !== undefined && index >= end) {
                break;
            }
        }

        return results;
    }

    clearCache(): void {
        this.cache.clear();
    }

    getCacheStats(): { size: number; hits: number } {
        return { size: this.cache.size, hits: 0 };
    }
}

// Dynamic JSON Table Manager with Auto-increment ID
class DynamicTableAutoIncrement {
    constructor(
        private connection: DuckDBConnection,
        private tableName: string = 'my_table'
    ) { }

    async initialize(): Promise<void> {
        await this.connection.run(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id BIGINT PRIMARY KEY,
        data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await this.connection.run(`
      CREATE SEQUENCE IF NOT EXISTS ${this.tableName}_id_seq START 1
    `);

        // Create index on id for cursor-based pagination performance
        await this.connection.run(`
      CREATE INDEX IF NOT EXISTS ${this.tableName}_id_idx ON ${this.tableName}(id)
    `);
    }

    async insert<T extends Record<string, JsonValue>>(data: T): Promise<void> {
        const reader = await this.connection.runAndReadAll(`
      INSERT INTO ${this.tableName} (id, data)
      VALUES (nextval('${this.tableName}_id_seq'), ?)
      RETURNING id
    `, [JSON.stringify(data)]);

        const rows = reader.getRowObjects();
        const id = rows[0]?.id;
    }

    async insertMany<T extends Record<string, JsonValue>>(dataArray: T[]): Promise<void> {
        // Batch insert for better performance
        for (const data of dataArray) {
            await this.insert(data);
        }
    }

    async getById<T>(id: number): Promise<{ id: number; data: T | null; created_at: string } | undefined> {
        const reader = await this.connection.runAndReadAll(`
      SELECT id, data, created_at
      FROM ${this.tableName}
      WHERE id = ?
    `, [id]);

        const rows = reader.getRowObjects();

        if (rows.length > 0) {
            return {
                id: rows[0].id as number,
                data: JSON.parse(rows[0].data as string),
                created_at: rows[0].created_at as string
            };
        }
        return undefined;
    }

    // Lazy loading with streaming - most efficient
    lazy<T>(chunkSize: number = 100): LazyResultSet<{ id: number; data: T | null; created_at: string }> {
        return new LazyResultSet(
            this.connection,
            `SELECT id, data, created_at FROM ${this.tableName} WHERE 1=1`,
            [],
            (row: Record<string, DuckDBValue>) => ({
                id: toNumber(row.id) || 0,
                data: safeJsonParse(row.data?.toString() || '{}'),
                created_at: toString(row.created_at)
            }),
            chunkSize
        );
    }

    // Lazy loading with query filter
    lazyQuery<T>(
        jsonPath: string,
        value: string | number | boolean,
        chunkSize: number = 100
    ): LazyResultSet<{ id: number; data: T | null; created_at: string }> {
        return new LazyResultSet(
            this.connection,
            `SELECT id, data, created_at FROM ${this.tableName} WHERE data->>'${jsonPath}' = ?`,
            [String(value)],
            (row: Record<string, DuckDBValue>) => ({
                id: toNumber(row.id) || 0,
                data: safeJsonParse(row.data?.toString() || '{}'),
                created_at: toString(row.created_at)
            }),
            chunkSize
        );
    }

    async getAll<T>(): Promise<Array<{ id: number; data: T | null; created_at: string }>> {
        const reader = await this.connection.runAndReadAll(`
      SELECT id, data, created_at
      FROM ${this.tableName}
      ORDER BY id
    `);

        const rows = reader.getRowObjects();
        return rows.map(row => ({
            id: toNumber(row.id) || 0,
            data: safeJsonParse(row.data?.toString() || '{}'),
            created_at: toString(row.created_at)
        }));
    }

    async query<T>(jsonPath: string, value: string | number | boolean): Promise<Array<{ id: number; data: T | null }>> {
        const reader = await this.connection.runAndReadAll(`
      SELECT id, data
      FROM ${this.tableName}
      WHERE data->>'${jsonPath}' = ?
      ORDER BY id
    `, [String(value)]);

        const rows = reader.getRowObjects();
        return rows.map(row => ({
            id: toNumber(row.id) || 0,
            data: safeJsonParse(row.data?.toString() || '{}')
        }));
    }

    async update<T extends Record<string, JsonValue>>(id: number, data: T): Promise<boolean> {
        await this.connection.run(`
      UPDATE ${this.tableName}
      SET data = ?
      WHERE id = ?
    `, [JSON.stringify(data), id]);

        return true;
    }

    async delete(id: number): Promise<boolean> {
        await this.connection.run(`
      DELETE FROM ${this.tableName}
      WHERE id = ?
    `, [id]);

        return true;
    }
}

// Define a proper type for our user data
interface UserData extends Record<string, JsonValue> {
    name: string;
    age: number;
    email: string;
    category: 'premium' | 'standard';
}

// Example Usage
async function exampleLazyLoading() {
    console.log('=== LAZY LOADING EXAMPLE (Modern DuckDB) ===\n');

    const instance = await DuckDBInstance.create(':memory:');
    const connection = await instance.connect();
    const table = new DynamicTableAutoIncrement(connection, 'users');

    await table.initialize();
    
    // Insert many records
    console.log('Inserting 1000 records...');
    for (let i = 0; i < 1000; i++) {
        const userData: UserData = {
            name: `User ${i}`,
            age: 20 + (i % 50),
            email: `user${i}@example.com`,
            category: i % 3 === 0 ? 'premium' : 'standard' as const
        };
        await table.insert(userData);
    }
    console.log('Done!\n');

    // Example 1: Lazy iteration with streaming
    console.log('Example 1: Streaming iteration (fetches chunks of 50)');
    const lazy1 = table.lazy(50);
    const all = await table.getAll()
    let count = 0;
    for await (const record of lazy1) {
        count++;
        if (count % 100 === 0) {
            console.log(`Processed ${count} records...`);
        }
    }
    console.log(`Total processed: ${count}\n`);

    // Example 2: Get specific records
    console.log('Example 2: Get specific records');
    const item0 = await table.getById(1);
    const item0Data = item0?.data as UserData | null | undefined;
    console.log('First item:', item0Data?.name);

    const item500 = await table.getById(500);
    const item500Data = item500?.data as UserData | null | undefined;
    console.log('Item 500:', item500Data?.name);

    const item999 = await table.getById(1000);
    const item999Data = item999?.data as UserData | null | undefined;
    console.log('Item 1000:', item999Data?.name);

    // Example 3: Slice
    console.log('\nExample 3: Slice (get items 100-105)');
    const lazy3 = table.lazy(50);
    const slice = await lazy3.slice(100, 105);
    slice.forEach(item => {
        const userData = item.data as UserData | null;
        console.log(`  ${userData?.name} - ${userData?.email}`);
    });

    // Example 4: forEach with early exit
    console.log('\nExample 4: forEach (finds first premium user)');
    const lazy4 = table.lazy(100);
    let found = false;

    await lazy4.forEach((record, index) => {
        const userData = record.data as UserData | null;
        if (!found && userData?.category === 'premium') {
            console.log(`  First premium user at index ${index}: ${userData.name}`);
            found = true;
        }
    });

    // Example 5: Map first 10
    console.log('\nExample 5: Map first 10 items');
    const lazy5 = table.lazy(50);
    const names: string[] = [];

    let mapCount = 0;
    for await (const record of lazy5) {
        const userData = record.data as UserData | null;
        names.push(userData?.name || '');
        if (++mapCount === 10) break;
    }
    console.log(`  Names: ${names.join(', ')}`);

    // Example 6: Query with filter
    console.log('\nExample 6: Query with filter');
    const premiumUsers = await table.query('category', 'premium');
    console.log(`Found ${premiumUsers.length} premium users`);
    console.log('First 5 premium users:', premiumUsers.slice(0, 5).map(item => {
        const user = item.data as UserData | null;
        return {
            name: user?.name,
            email: user?.email
        };
    }));

    // Example 7: Lazy query with filter
    console.log('\nExample 7: Lazy query (category = premium)');
    const lazyQuery = table.lazyQuery('category', 'premium', 50);
    const total = await lazyQuery.length();
    console.log(`  Total premium users: ${total}`);

    let premiumCount = 0;
    for await (const record of lazyQuery) {
        premiumCount++;
        if (premiumCount <= 5) {
            const userData = record.data as UserData | null;
            console.log(`  Premium: ${userData?.name}`);
        }
        if (premiumCount === 20) {
            console.log('  ... stopping at 20');
            break;
        }
    }
    
    // Cleanup
    connection.closeSync();
    instance.closeSync();
    
    console.log('-example end -');
}

// Run example
async function main() {
    try {
        await exampleLazyLoading();
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
