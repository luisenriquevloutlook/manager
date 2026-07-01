import { query } from '../connection.js';
import fs from 'fs';
import path from 'path';

async function migrate() {
  console.log('===================================================');
  console.log(' SCRIPT DE MIGRACIÓN: Casos de Prueba (JSON -> MySQL)');
  console.log('===================================================');

  // Obtener la ruta del archivo JSON desde los argumentos
  const args = process.argv.slice(2);
  const jsonPath = args[0] || 'backup-test-manager.json';

  const absolutePath = path.resolve(jsonPath);
  console.log(`Buscando archivo de respaldo en: ${absolutePath}`);

  if (!fs.existsSync(absolutePath)) {
    console.error(`\n❌ Error: El archivo "${jsonPath}" no existe.`);
    console.error('Uso: node migrate-test-cases.js <ruta_al_backup.json>');
    console.error('Ejemplo: node migrate-test-cases.js ./backup-2026-06-08.json\n');
    process.exit(1);
  }

  let backupData;
  try {
    const rawContent = fs.readFileSync(absolutePath, 'utf8');
    backupData = JSON.parse(rawContent);
  } catch (err) {
    console.error('\n❌ Error al leer o parsear el archivo JSON:', err.message);
    process.exit(1);
  }

  // Validar formato básico de backup
  // El backup de TestManager exporta un objeto que puede contener testCases directamente
  // o dentro de una clave "testCases" o ser un array de casos directamente.
  let cases = [];
  if (Array.isArray(backupData)) {
    cases = backupData;
  } else if (backupData.testCases && Array.isArray(backupData.testCases)) {
    cases = backupData.testCases;
  } else {
    console.error('\n❌ Error: El formato de JSON de respaldo no es válido.');
    console.error('Debe ser un array de casos de prueba o un objeto que contenga una clave "testCases".');
    process.exit(1);
  }

  console.log(`\nSe encontraron ${cases.length} casos de prueba para migrar.`);
  console.log('Iniciando importación en la base de datos (Proyecto ID: 1)...');

  let successCount = 0;
  let errorCount = 0;

  for (const tc of cases) {
    try {
      // Normalizar campos opcionales
      const stepsJson = JSON.stringify(tc.steps || []);
      const tagsJson = JSON.stringify(tc.tags || []);
      const estimatedTime = tc.estimatedTime !== undefined ? parseInt(tc.estimatedTime) : null;
      const version = tc.version || '1.0';

      const sql = `
        INSERT INTO test_cases (
          id, project_id, code, module, name, description, 
          preconditions, steps, expectedResult, priority, 
          status, assignedTo, estimatedTime, tags, 
          createdAt, updatedAt, version
        ) VALUES (
          ?, 1, ?, ?, ?, ?, 
          ?, ?, ?, ?, 
          ?, ?, ?, ?, 
          ?, ?, ?
        )
        ON DUPLICATE KEY UPDATE
          code = VALUES(code),
          module = VALUES(module),
          name = VALUES(name),
          description = VALUES(description),
          preconditions = VALUES(preconditions),
          steps = VALUES(steps),
          expectedResult = VALUES(expectedResult),
          priority = VALUES(priority),
          status = VALUES(status),
          assignedTo = VALUES(assignedTo),
          estimatedTime = VALUES(estimatedTime),
          tags = VALUES(tags),
          updatedAt = VALUES(updatedAt),
          version = VALUES(version)
      `;

      const params = [
        tc.id,
        tc.code,
        tc.module,
        tc.name,
        tc.description || '',
        tc.preconditions || '',
        stepsJson,
        tc.expectedResult || '',
        tc.priority,
        tc.status,
        tc.assignedTo || null,
        estimatedTime,
        tagsJson,
        tc.createdAt || new Date().toISOString(),
        tc.updatedAt || new Date().toISOString(),
        version
      ];

      await query(sql, params);
      successCount++;
      if (successCount % 10 === 0 || successCount === cases.length) {
        console.log(`  Progress: ${successCount}/${cases.length} casos procesados...`);
      }
    } catch (err) {
      console.error(`  ❌ Error al migrar caso ${tc.code} (${tc.id}):`, err.message);
      errorCount++;
    }
  }

  console.log('\n===================================================');
  console.log(' RESUMEN DE MIGRACIÓN:');
  console.log(`   Casos importados/actualizados: ${successCount}`);
  console.log(`   Casos fallidos: ${errorCount}`);
  console.log('===================================================');

  if (errorCount > 0) {
    console.warn('\n⚠️  Hubo errores en algunos casos de prueba. Revisa los logs de arriba.');
    process.exit(1);
  } else {
    console.log('\n🎉 ¡Migración de casos de prueba finalizada exitosamente!');
    process.exit(0);
  }
}

migrate();
