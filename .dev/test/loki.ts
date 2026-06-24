import Loki from 'lokijs';

// Create or load database file 'database.json'
const db = new Loki('database.json', {
  persistenceMethod: 'fs',
  autoload: true,
  autoloadCallback: databaseInitialize,
  autosave: true,
  autosaveInterval: 4000
});

function databaseInitialize() {
  // Get or create collection
  let users = db.getCollection('users');
  if (!users) {
    users = db.addCollection('users');
  }

  // Insert sample data
  users.insert([
    { name: 'Alice', age: 30, active: true },
    { name: 'Bob', age: 25, active: false },
    { name: 'Charlie', age: 35, active: true }
  ]);

  // Save to file
  db.saveDatabase();

  // MongoDB-style query filtering e.g., active users older than 28
  const results = users.find({
    age: { '$gt': 28 },
    active: true
  });

  console.log('Query results:', results);
}

// Optional: wait for autosave to complete on exit
process.on('exit', () => {
  db.close();
});
