import njodb from 'njodb';

// Initialize database with file, creating 'mydb.json'
const db = new njodb.Database('./tmp/mydb.json');

async function runExample() {
  // Insert records (can insert single object or array of objects)
  await db.insert([
    { id: 1, name: 'Alice', age: 28, active: true },
    { id: 2, name: 'Bob', age: 22, active: false },
    { id: 3, name: 'Charlie', age: 35, active: true }
  ]);

  // Select records using MongoDB-like filter function
  // Example: find users who are active and older than 25
  const results = db.selectSync(record => record.active && record.age > 25,record => record);

  console.log('Selected records:', results.data);

  // Update records matching a selector
  db.updateSync(
        record => record.id === 2, // Selector function
        // Selector function
        record => ({ ...record, active: true }) // Updater function
    );

  // Delete records where age less than 25
  db.deleteSync(record => record.age < 25);

  // Verify after update & delete
  const all = db.selectSync(() => true, record => record);
  console.log('All records after update and delete:', all.data);
}

runExample().catch(console.error);
