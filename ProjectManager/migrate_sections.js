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
    // Create project_sections table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS project_sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        order_index INT NOT NULL DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE KEY unique_section_project (project_id, name)
      )
    `);
    console.log('+ Table project_sections created (or already exists)');

    // Seed default sections for existing projects that have none
    const [projects] = await conn.execute('SELECT id FROM projects');
    const defaults = [
      'Planeación y Diseño', 'Front End WEB', 'Backend Local', 'Server Cloud',
      'Backend Cloud', 'PWA Cliente', 'App Mesero', 'Cocina/Bar',
      'Integraciones', 'Pruebas', 'Lanzamiento'
    ];

    for (const proj of projects) {
      const [existing] = await conn.execute(
        'SELECT COUNT(*) as cnt FROM project_sections WHERE project_id = ?',
        [proj.id]
      );
      if (existing[0].cnt === 0) {
        for (let i = 0; i < defaults.length; i++) {
          await conn.execute(
            'INSERT IGNORE INTO project_sections (project_id, name, order_index) VALUES (?, ?, ?)',
            [proj.id, defaults[i], i + 1]
          );
        }
        console.log('  Seeded default sections for project', proj.id);
      } else {
        console.log('  Project', proj.id, 'already has sections, skipping');
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
