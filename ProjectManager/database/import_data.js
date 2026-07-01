import { query } from './connection.js';
import fs from 'fs';
import path from 'path';

async function runSchema() {
  console.log('Inicializando esquema de base de datos...');
  const schemaPath = path.resolve('./database/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`No se encontró el archivo de esquema: ${schemaPath}`);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  // Limpiar comentarios de bloque y de línea del SQL
  const cleanSql = schemaSql
    .replace(/\/\*[\s\S]*?\*\//g, '') // Eliminar /* ... */
    .split('\n')
    .map(line => line.trim())
    .filter(line => !line.startsWith('--') && line.length > 0) // Eliminar comentarios --
    .join('\n');

  // Separar consultas por punto y coma
  // Esto es un parser simple que separa por ";" pero teniendo cuidado de no romper nada básico
  const queries = cleanSql.split(';').map(q => q.trim()).filter(q => q.length > 0);

  for (const q of queries) {
    try {
      await query(q);
    } catch (err) {
      console.error(`Error ejecutando sentencia SQL del esquema:\n${q}\n`, err.message);
      throw err;
    }
  }
  console.log('Esquema de base de datos inicializado con éxito.');
}

async function seedData() {
  console.log('Buscando datos de exportación...');
  const dataPath = path.resolve('./data_export.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`No se encontró el archivo de exportación: ${dataPath}`);
  }

  const rawData = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(rawData);

  const projectId = 1; // Proyecto por defecto 'MesaGo'

  // Limpiar tablas para evitar duplicados en reinserción
  console.log('Limpiando tablas para el proyecto ID 1...');
  await query('DELETE FROM tasks WHERE project_id = ?', [projectId]);
  await query('DELETE FROM components WHERE project_id = ?', [projectId]);
  await query('DELETE FROM mvp_priorities WHERE project_id = ?', [projectId]);
  await query('DELETE FROM executive_timeline WHERE project_id = ?', [projectId]);

  // 1. Insertar Componentes
  console.log('Importando componentes...');
  let compCount = 0;
  for (const comp of data.components) {
    const sql = `
      INSERT INTO components (project_id, name, weight, progress)
      VALUES (?, ?, ?, ?)
    `;
    await query(sql, [projectId, comp.name, comp.weight, comp.progress]);
    compCount++;
  }
  console.log(`✓ ${compCount} componentes importados.`);

  // 2. Insertar Tareas (Actividades)
  console.log('Importando actividades (tareas)...');
  let taskCount = 0;
  for (const act of data.activities) {
    // Evitar insertar la cabecera si llegó a colarse
    if (act.section === 'Sección' && act.description === 'Descripción') {
      continue;
    }
    const sql = `
      INSERT INTO tasks (
        project_id, section, description, status, tag, 
        original_estimated_date, real_date, days, estimated_date, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      projectId,
      act.section || 'General',
      act.description || '',
      act.status || 'Pendiente',
      act.tag || null,
      act.original_estimated_date || null,
      act.real_date || null,
      act.days !== undefined ? act.days : null,
      act.estimated_date || null,
      taskCount + 1
    ]);
    taskCount++;
  }
  console.log(`✓ ${taskCount} tareas importadas.`);

  // 3. Insertar Prioridades MVP
  console.log('Importando prioridades MVP...');
  let priorityCount = 0;
  for (const prio of data.mvp_priorities) {
    const sql = `
      INSERT INTO mvp_priorities (project_id, priority, functionality, criticity, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    // Quitar marcas como '❌' o '✓' del estado en el excel para normalizarlo en base de datos
    const normalizedStatus = prio.status
      .replace(/[❌✓🔴⚪\s]/g, '')
      .trim() || 'Pendiente';

    await query(sql, [
      projectId,
      prio.priority,
      prio.functionality,
      prio.criticity,
      normalizedStatus
    ]);
    priorityCount++;
  }
  console.log(`✓ ${priorityCount} prioridades MVP importadas.`);

  // 4. Insertar Historial Ejecutivo (Línea de tiempo)
  console.log('Importando bitácora histórica...');
  let timelineCount = 0;
  for (const item of data.timeline) {
    const sql = `
      INSERT INTO executive_timeline (project_id, date, component, task_description, percentage_logrado, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      projectId,
      item.date,
      item.component,
      item.task_description,
      item.percentage_logrado,
      item.notes || null
    ]);
    timelineCount++;
  }
  console.log(`✓ ${timelineCount} registros históricos de ejecución importados.`);
}

async function main() {
  console.log('===================================================');
  console.log(' SEEDER DATABASE: Inicialización e Importación');
  console.log('===================================================');
  try {
    await runSchema();
    await seedData();
    console.log('===================================================');
    console.log('🎉 ¡Inicialización e importación exitosas!');
    console.log('===================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error durante el proceso de inicialización:', err.message);
    process.exit(1);
  }
}

main();
