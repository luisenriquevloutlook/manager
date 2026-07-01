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
    console.log('Adding weight and progress columns to project_sections...');

    // Add weight column
    try {
      await conn.execute('ALTER TABLE project_sections ADD COLUMN weight DECIMAL(5,4) DEFAULT 0.0000');
      console.log('+ weight column added');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('  weight already exists');
      else throw e;
    }

    // Add progress column
    try {
      await conn.execute('ALTER TABLE project_sections ADD COLUMN progress DECIMAL(5,4) DEFAULT 0.0000');
      console.log('+ progress column added');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('  progress already exists');
      else throw e;
    }

    // For each project, distribute equal weights among sections
    const [projects] = await conn.execute('SELECT id FROM projects');
    for (const proj of projects) {
      const [secs] = await conn.execute(
        'SELECT id, name FROM project_sections WHERE project_id = ? ORDER BY order_index ASC',
        [proj.id]
      );

      if (secs.length === 0) continue;

      // Try to copy weights from old components table where names match
      const [comps] = await conn.execute(
        'SELECT name, weight, progress FROM components WHERE project_id = ?',
        [proj.id]
      );

      const compMap = {};
      comps.forEach(c => { compMap[c.name.toLowerCase()] = c; });

      // Calculate equal weight for sections that have no match in components
      const equalWeight = parseFloat((1.0 / secs.length).toFixed(4));

      let assigned = 0;
      for (let i = 0; i < secs.length; i++) {
        const sec = secs[i];
        const match = compMap[sec.name.toLowerCase()];

        let w, p;
        if (match) {
          w = parseFloat(match.weight);
          p = parseFloat(match.progress);
        } else {
          // Last section gets remainder to ensure weights sum to 1
          w = (i === secs.length - 1) ? parseFloat((1.0 - assigned).toFixed(4)) : equalWeight;
          p = 0;
        }

        assigned += w;
        await conn.execute(
          'UPDATE project_sections SET weight = ?, progress = ? WHERE id = ?',
          [w, p, sec.id]
        );
        console.log(`  Project ${proj.id} | ${sec.name}: weight=${w}, progress=${p}`);
      }
    }

    console.log('\nMigration complete!');
  } finally {
    await conn.end();
  }
}

migrate().catch(err => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
