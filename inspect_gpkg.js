const db = require('better-sqlite3')('docs/vmn_ci.gpkg');
const contents = db.prepare("SELECT table_name FROM gpkg_contents").all();
console.log("Tables:", contents);

if (contents.length > 0) {
  const tableName = contents[0].table_name;
  const sample = db.prepare(`SELECT * FROM ${tableName} LIMIT 1`).all();
  console.log(`Sample from ${tableName}:`, sample);
}
