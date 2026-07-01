import { query } from '../connection.js';
import mysql from 'mysql2/promise';
import pool from '../connection.js'; // Pool para obtener conexiones específicas para transacciones
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('===================================================');
  console.log(' SCRIPT DE MIGRACIÓN: Ejecuciones e Imágenes (JSON -> MySQL)');
  console.log('===================================================');

  // Obtener la ruta del archivo JSON desde los argumentos
  const args = process.argv.slice(2);
  const jsonPath = args[0] || 'backup-test-manager.json';

  const absolutePath = path.resolve(jsonPath);
  console.log(`Buscando archivo de respaldo en: ${absolutePath}`);

  if (!fs.existsSync(absolutePath)) {
    console.error(`\n❌ Error: El archivo "${jsonPath}" no existe.`);
    console.error('Uso: node migrate-executions.js <ruta_al_backup.json>');
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

  let executions = [];
  if (backupData.executions && Array.isArray(backupData.executions)) {
    executions = backupData.executions;
  } else {
    console.error('\n❌ Error: El JSON no contiene una lista de "executions".');
    process.exit(1);
  }

  console.log(`\nSe encontraron ${executions.length} ejecuciones de prueba para migrar.`);
  
  // Asegurar que la carpeta uploads exista
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Carpeta de evidencias creada en: ${uploadsDir}`);
  }

  let successExecutions = 0;
  let successEvidences = 0;
  let errorExecutions = 0;

  for (const exec of executions) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insertar la ejecución en test_executions
      const execSql = `
        INSERT INTO test_executions (
          id, project_id, testCaseId, testCaseCode, executedBy, 
          executedAt, duration, result, severity, observations, 
          errorMessage, environment, retryCount, parentExecutionId
        ) VALUES (
          ?, 1, ?, ?, ?, 
          ?, ?, ?, ?, ?, 
          ?, ?, ?, ?
        )
        ON DUPLICATE KEY UPDATE
          testCaseId = VALUES(testCaseId),
          testCaseCode = VALUES(testCaseCode),
          executedBy = VALUES(executedBy),
          executedAt = VALUES(executedAt),
          duration = VALUES(duration),
          result = VALUES(result),
          severity = VALUES(severity),
          observations = VALUES(observations),
          errorMessage = VALUES(errorMessage),
          environment = VALUES(environment),
          retryCount = VALUES(retryCount),
          parentExecutionId = VALUES(parentExecutionId)
      `;

      const envJson = JSON.stringify(exec.environment || {});
      const execParams = [
        exec.id,
        exec.testCaseId,
        exec.testCaseCode,
        exec.executedBy,
        exec.executedAt,
        exec.duration,
        exec.result,
        exec.severity || null,
        exec.observations || '',
        exec.errorMessage || null,
        envJson,
        exec.retryCount || 0,
        exec.parentExecutionId || null
      ];

      await connection.query(execSql, execParams);

      // 2. Procesar evidencias asociadas
      if (exec.evidences && Array.isArray(exec.evidences)) {
        for (const ev of exec.evidences) {
          let finalPath = ev.path;
          let finalFilename = ev.filename;

          // Si contiene un dataUrl (Base64), decodificar y guardar como archivo físico
          if (ev.dataUrl && ev.dataUrl.startsWith('data:image')) {
            const matches = ev.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const buffer = Buffer.from(matches[2], 'base64');
              const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
              const ext = path.extname(ev.filename || '.png') || '.png';
              
              finalFilename = `evidence-migrated-${uniqueSuffix}${ext}`;
              const filePath = path.join(uploadsDir, finalFilename);
              fs.writeFileSync(filePath, buffer);
              
              finalPath = `/evidences/${finalFilename}`;
              successEvidences++;
            }
          }

          const evSql = `
            INSERT INTO test_evidences (
              id, executionId, type, filename, path, description, uploadedAt, size
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?
            )
            ON DUPLICATE KEY UPDATE
              filename = VALUES(filename),
              path = VALUES(path),
              description = VALUES(description),
              uploadedAt = VALUES(uploadedAt),
              size = VALUES(size)
          `;

          const evParams = [
            ev.id,
            exec.id,
            ev.type || 'IMAGE',
            finalFilename,
            finalPath,
            ev.description || null,
            ev.uploadedAt || new Date().toISOString(),
            ev.size || 0
          ];

          await connection.query(evSql, evParams);
        }
      }

      await connection.commit();
      successExecutions++;
      
      if (successExecutions % 10 === 0 || successExecutions === executions.length) {
        console.log(`  Progreso: ${successExecutions}/${executions.length} ejecuciones guardadas...`);
      }
    } catch (err) {
      await connection.rollback();
      console.error(`  ❌ Error al migrar ejecución ${exec.id} para caso ${exec.testCaseCode}:`, err.message);
      errorExecutions++;
    } finally {
      connection.release();
    }
  }

  console.log('\n===================================================');
  console.log(' RESUMEN DE MIGRACIÓN:');
  console.log(`   Ejecuciones migradas/actualizadas: ${successExecutions}`);
  console.log(`   Ejecuciones fallidas: ${errorExecutions}`);
  console.log(`   Archivos de evidencia decodificados e importados: ${successEvidences}`);
  console.log('===================================================');

  if (errorExecutions > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 ¡Migración de ejecuciones y evidencias finalizada exitosamente!');
    process.exit(0);
  }
}

migrate();
