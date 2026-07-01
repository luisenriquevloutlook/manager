import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'manager',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || 'Soysuperadmin#1',
    database: process.env.DB_NAME || 'projectmanager',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('Running migration: adding start_date and end_date to projects...');

    // Add start_date column
    try {
      await conn.execute('ALTER TABLE projects ADD COLUMN start_date DATE DEFAULT NULL');
      console.log('+ start_date column added');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('  start_date already exists, skipping');
      } else {
        throw e;
      }
    }

    // Add end_date column
    try {
      await conn.execute('ALTER TABLE projects ADD COLUMN end_date DATE DEFAULT NULL');
      console.log('+ end_date column added');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('  end_date already exists, skipping');
      } else {
        throw e;
      }
    }

    // Set defaults for existing rows
    const [result1] = await conn.execute(
      "UPDATE projects SET start_date = '2025-12-15' WHERE start_date IS NULL"
    );
    console.log('Default start_date applied to', result1.affectedRows, 'project(s)');

    const [result2] = await conn.execute(
      "UPDATE projects SET end_date = '2026-02-23' WHERE end_date IS NULL"
    );
    console.log('Default end_date applied to', result2.affectedRows, 'project(s)');

    console.log('\nMigration complete!');
  } finally {
    await conn.end();
  }
}

migrate().catch(err => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
