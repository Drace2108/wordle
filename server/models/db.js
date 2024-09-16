const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");

// Initialize database
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS words (word TEXT, possible BOOLEAN, guessed BOOLEAN)",
    (err) => {
      if (err) {
        console.error("Error creating table:", err);
      }
    }
  );
});

module.exports = db;