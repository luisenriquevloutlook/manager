/**
 * Migración de Estados de Casos de Prueba
 * 
 * Este script actualiza los estados antiguos a los nuevos estados que coinciden con los resultados de ejecución:
 * - COMPLETADO → APROBADO
 * - EN_PROGRESO → Mantener o actualizar basado en última ejecución
 * - BLOQUEADO → Mantener o actualizar basado en última ejecución
 */

const mysql = require('mysql2/promise');

async function migrateTestStatuses() {
  console.log('🔄 Iniciando migración de estados de casos de prueba...\n');

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

    // 1. Actualizar COMPLETADO a APROBADO (casos que se completaron exitosamente)
    console.log('📝 Actualizando estados COMPLETADO a APROBADO...');
    const [result1] = await connection.execute(
      `UPDATE test_cases SET status = 'APROBADO' WHERE status = 'COMPLETADO'`
    );
    console.log(`   ✅ ${result1.affectedRows} caso(s) actualizado(s) de COMPLETADO a APROBADO\n`);

    // 2. Actualizar casos EN_PROGRESO y BLOQUEADO basándose en su última ejecución
    console.log('📝 Actualizando estados EN_PROGRESO y BLOQUEADO basándose en última ejecución...');
    
    // Obtener casos con estado EN_PROGRESO o BLOQUEADO
    const [oldStatusCases] = await connection.execute(
      `SELECT id, status FROM test_cases WHERE status IN ('EN_PROGRESO', 'BLOQUEADO')`
    );

    let updatedFromLastExec = 0;
    let updatedToFallback = 0;

    for (const testCase of oldStatusCases) {
      // Obtener la última ejecución del caso
      const [executions] = await connection.execute(
        `SELECT result FROM test_executions 
         WHERE testCaseId = ? 
         ORDER BY executedAt DESC 
         LIMIT 1`,
        [testCase.id]
      );

      let newStatus;
      if (executions.length > 0) {
        // Si hay ejecución, usar su resultado como nuevo estado
        newStatus = executions[0].result;
        updatedFromLastExec++;
      } else {
        // Si no hay ejecución, usar un estado por defecto basado en el estado anterior
        newStatus = testCase.status === 'BLOQUEADO' ? 'FALLA_CRITICA' : 'FALLA_MENOR';
        updatedToFallback++;
      }

      // Actualizar el estado
      await connection.execute(
        `UPDATE test_cases SET status = ? WHERE id = ?`,
        [newStatus, testCase.id]
      );
    }

    console.log(`   ✅ ${updatedFromLastExec} caso(s) actualizado(s) basándose en última ejecución`);
    console.log(`   ✅ ${updatedToFallback} caso(s) actualizado(s) con estado por defecto\n`);

    // 3. Resumen de estados actuales
    console.log('📊 Resumen de estados después de la migración:');
    const [statusSummary] = await connection.execute(
      `SELECT status, COUNT(*) as count 
       FROM test_cases 
       GROUP BY status 
       ORDER BY count DESC`
    );

    console.log('\n   Estados actuales:');
    statusSummary.forEach(row => {
      console.log(`   - ${row.status}: ${row.count} caso(s)`);
    });

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
  migrateTestStatuses()
    .then(() => {
      console.log('\n🎉 Proceso de migración finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrateTestStatuses };
