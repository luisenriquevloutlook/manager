import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'manager',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'Soysuperadmin#1',
  database: process.env.DB_NAME || 'projectmanager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

console.log('Configurando Pool de Conexiones MySQL en ProjectManager para:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
});

let pool;

try {
  pool = mysql.createPool(dbConfig);
  console.log('Pool de conexiones MySQL inicializado correctamente.');
} catch (error) {
  console.error('Error al crear el pool de conexiones MySQL:', error);
}

/**
 * Helper para ejecutar consultas SQL utilizando promesas
 * @param {string} sql Consulta SQL con placeholders
 * @param {Array} params Parámetros para la consulta
 * @returns {Promise<any>} Filas devueltas por la consulta
 */
export async function query(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error(`Error ejecutando query: ${sql}`, error);
    throw error;
  }
}

export default pool;
