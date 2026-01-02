/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: node tools/inspect-d1-files.cjs <dir>');
  process.exit(1);
}

const entries = fs
  .readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isFile() && d.name.endsWith('.sqlite'))
  .map((d) => path.join(dir, d.name))
  .sort();

if (entries.length === 0) {
  console.log(`No .sqlite files found in: ${dir}`);
  process.exit(0);
}

for (const file of entries) {
  console.log(`--- ${file}`);
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();
    console.log(rows.map((r) => r.name).join(', '));
  } finally {
    db.close();
  }
}
