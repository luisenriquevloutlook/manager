/**
 * Migración: Cambiar REQUIERE_ACTUALIZACION a ACTUALIZAR
 * 
 * Este script actualiza el nombre del estado "REQUIERE_ACTUALIZACION" a "ACTUALIZAR"
 * en la base de datos para los casos de prueba y ejecuciones existentes.
 */

const mysql = require('mysql2/promise');

async function migrateRequiereActualizacion() {
  console.log('🔄 Iniciando migración de estado REQUIERE_ACTUALIZACION a ACTUALIZAR...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'manager',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || 'Soysuperadmin#1',
    database: process.env.DB_NAME || 'testmanager',
    port: process.env.DB_PORT || 3306
  });

  try {
    // Iniciar transacción
    await connection.beginTransaction();

    // 1. Actualizar casos de prueba con estado REQUIERE_ACTUALIZACION
    console.log('📝 Actualizando casos de prueba...');
    const [result1] = await connection.execute(
      `UPDATE test_cases SET status = 'ACTUALIZAR' WHERE status = 'REQUIERE_ACTUALIZACION'`
    );
    console.log(`   ✅ ${result1.affectedRows} caso(s) de prueba actualizado(s)\n`);

    // 2. Actualizar ejecuciones con resultado REQUIERE_ACTUALIZACION
    console.log('📝 Actualizando ejecuciones de prueba...');
    const [result2] = await connection.execute(
      `UPDATE test_executions SET result = 'ACTUALIZAR' WHERE result = 'REQUIERE_ACTUALIZACION'`
    );
    console.log(`   ✅ ${result2.affectedRows} ejecución(es) actualizada(s)\n`);

    // 3. Resumen de estados actuales
    console.log('📊 Resumen de estados después de la migración:');
    
    // Casos de prueba
    const [caseStats] = await connection.execute(
      `SELECT status, COUNT(*) as count 
       FROM test_cases 
       WHERE status = 'ACTUALIZAR'
       GROUP BY status`
    );

    console.log('\n   Casos de prueba con estado ACTUALIZAR:');
    if (caseStats.length > 0) {
      caseStats.forEach(row => {
        console.log(`   - ${row.status}: ${row.count} caso(s)`);
      });
    } else {
      console.log('   - Ninguno encontrado');
    }

    // Ejecuciones
    const [execStats] = await connection.execute(
      `SELECT result, COUNT(*) as count 
       FROM test_executions 
       WHERE result = 'ACTUALIZAR'
       GROUP BY result`
    );

    console.log('\n   Ejecuciones con resultado ACTUALIZAR:');
    if (execStats.length > 0) {
      execStats.forEach(row => {
        console.log(`   - ${row.result}: ${row.count} ejecución(es)`);
      });
    } else {
      console.log('   - Ninguna encontrada');
    }

    // Confirmar transacción
    await connection.commit();
    console.log('\n✅ Migración completada exitosamente');

  } catch (error) {
    // Revertir transacción en caso de error
    await connection.rollback();
    console.error('\n❌ Error durante la migración:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrateRequiereActualizacion()
    .then(() => {
      console.log('\n🎉 Proceso de migración finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrateRequiereActualizacion };
