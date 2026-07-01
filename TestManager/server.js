import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pool, { query } from './database/connection.js';
import PDFDocument from 'pdfkit';

// Cargar variables de entorno
dotenv.config();

// Crear tablas si no existen e inicializar proyectos
async function setupDatabase() {
  try {
    console.log('Verificando y configurando base de datos...');
    
    // 1. Crear tabla custom_modules
    await query(`
      CREATE TABLE IF NOT EXISTS custom_modules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        label VARCHAR(100) NOT NULL,
        FOREIGN KEY (project_id) REFERENCES test_projects(id) ON DELETE CASCADE,
        UNIQUE KEY unique_module_project (project_id, name)
      )
    `);
    
    // 2. Crear tabla config
    await query(`
      CREATE TABLE IF NOT EXISTS config (
        project_id INT PRIMARY KEY,
        defaultTester VARCHAR(100),
        matrixVersion VARCHAR(50),
        FOREIGN KEY (project_id) REFERENCES test_projects(id) ON DELETE CASCADE
      )
    `);

    console.log('✓ Tablas custom_modules y config aseguradas.');

    // 3. Inicializar proyectos existentes con módulos y configuración por defecto
    const projects = await query('SELECT id FROM test_projects');
    const legacyModules = [
      'AUTH', 'USUARIOS', 'ROLES', 'ESTABLECIMIENTOS', 'MESAS',
      'CATEGORIAS', 'PRODUCTOS', 'ORDENES', 'INVENTARIO', 'REPORTES',
      'CONFIGURACION', 'GENERAL'
    ];

    for (const p of projects) {
      // Verificar e inicializar módulos
      const modules = await query('SELECT id FROM custom_modules WHERE project_id = ?', [p.id]);
      if (modules.length === 0) {
        console.log(`Inicializando módulos por defecto para proyecto ID ${p.id}...`);
        for (const mod of legacyModules) {
          await query(
            'INSERT IGNORE INTO custom_modules (project_id, name, label) VALUES (?, ?, ?)',
            [p.id, mod, mod]
          );
        }
      }

      // Verificar e inicializar config
      const config = await query('SELECT project_id FROM config WHERE project_id = ?', [p.id]);
      if (config.length === 0) {
        console.log(`Inicializando configuración por defecto para proyecto ID ${p.id}...`);
        await query(
          'INSERT IGNORE INTO config (project_id, defaultTester, matrixVersion) VALUES (?, ?, ?)',
          [p.id, '', '1.1']
        );
      }
    }
    console.log('✓ Datos iniciales de proyectos verificados y cargados.');
  } catch (error) {
    console.error('❌ Error al configurar e inicializar la base de datos:', error);
  }
}

// Ejecutar configuración de base de datos
setupDatabase();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3030;

// Habilitar CORS
app.use(cors({
  origin: 'http://localhost:6180', // Puerto de Vite
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Asegurar que exista la carpeta uploads fuera de src/
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Carpeta uploads creada en:', uploadsDir);
}

// Servir la carpeta uploads estáticamente
app.use('/evidences', express.static(uploadsDir));

// Configuración de Multer para almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `evidence-${uniqueSuffix}${ext}`);
  }
});

// Filtro de archivos para permitir solo imágenes
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Endpoint básico de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor TestManager corriendo correctamente.' });
});

// Endpoint para subir evidencias
app.post('/api/evidences/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
    }

    const fileUrl = `/evidences/${req.file.filename}`;
    res.status(200).json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar la subida.' });
  }
});

// Endpoint para eliminar evidencias
app.delete('/api/evidences/:filename', (req, res) => {
  const filename = req.params.filename;
  
  // Evitar ataques de Path Traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Nombre de archivo no válido.' });
  }

  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado.' });
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error al eliminar archivo:', err);
      return res.status(500).json({ error: 'No se pudo eliminar el archivo físico.' });
    }
    res.status(200).json({ success: true, message: 'Evidencia eliminada correctamente.' });
  });
});

// ==========================================
// API - Casos de Prueba (CRUD)
// ==========================================

// Listar casos de prueba (con filtros opcionales)
app.get('/api/test-cases', async (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId) : 1;
    let sql = 'SELECT * FROM test_cases WHERE project_id = ?';
    const params = [projectId];

    if (req.query.module) {
      sql += ' AND module = ?';
      params.push(req.query.module);
    }
    if (req.query.priority) {
      sql += ' AND priority = ?';
      params.push(req.query.priority);
    }
    if (req.query.status) {
      sql += ' AND status = ?';
      params.push(req.query.status);
    }
    if (req.query.assignedTo) {
      sql += ' AND assignedTo = ?';
      params.push(req.query.assignedTo);
    }
    if (req.query.search) {
      sql += ' AND (code LIKE ? OR name LIKE ? OR description LIKE ?)';
      const searchPattern = `%${req.query.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const rows = await query(sql, params);
    
    // Formatear columnas JSON
    const formattedRows = rows.map(row => ({
      ...row,
      steps: typeof row.steps === 'string' ? JSON.parse(row.steps) : (row.steps || []),
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || [])
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error('Error al listar casos de prueba:', error);
    res.status(500).json({ error: 'Error al obtener los casos de prueba de la base de datos.' });
  }
});

// Obtener un caso de prueba individual
app.get('/api/test-cases/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query('SELECT * FROM test_cases WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Caso de prueba no encontrado.' });
    }
    const row = rows[0];
    const formattedRow = {
      ...row,
      steps: typeof row.steps === 'string' ? JSON.parse(row.steps) : (row.steps || []),
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || [])
    };
    res.json(formattedRow);
  } catch (error) {
    console.error('Error al obtener caso de prueba:', error);
    res.status(500).json({ error: 'Error al obtener el caso de prueba.' });
  }
});

// Crear nuevo caso de prueba
app.post('/api/test-cases', async (req, res) => {
  try {
    const tc = req.body;
    const projectId = tc.projectId || 1;
    const id = tc.id || `tc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const stepsJson = JSON.stringify(tc.steps || []);
    const tagsJson = JSON.stringify(tc.tags || []);
    const estimatedTime = tc.estimatedTime !== undefined ? parseInt(tc.estimatedTime) : null;
    const version = tc.version || '1.0';
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    // Validar unicidad del código para el proyecto
    const existing = await query('SELECT id FROM test_cases WHERE project_id = ? AND code = ?', [projectId, tc.code]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `El código de caso de prueba '${tc.code}' ya existe en este proyecto.` });
    }

    const sql = `
      INSERT INTO test_cases (
        id, project_id, code, module, name, description, 
        preconditions, steps, expectedResult, priority, 
        status, assignedTo, estimatedTime, tags, 
        createdAt, updatedAt, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      id, projectId, tc.code, tc.module, tc.name, tc.description || '',
      tc.preconditions || '', stepsJson, tc.expectedResult || '', tc.priority,
      tc.status, tc.assignedTo || null, estimatedTime, tagsJson,
      createdAt, updatedAt, version
    ];

    await query(sql, params);
    
    res.status(201).json({
      ...tc,
      id,
      projectId,
      createdAt,
      updatedAt,
      version
    });
  } catch (error) {
    console.error('Error al crear caso de prueba:', error);
    res.status(500).json({ error: 'Error al crear el caso de prueba en la base de datos.' });
  }
});

// Actualizar caso de prueba
app.put('/api/test-cases/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;

    const current = await query('SELECT * FROM test_cases WHERE id = ?', [id]);
    if (current.length === 0) {
      return res.status(404).json({ error: 'Caso de prueba no encontrado.' });
    }

    const tc = { ...current[0], ...updates };
    const stepsJson = JSON.stringify(tc.steps || []);
    const tagsJson = JSON.stringify(tc.tags || []);
    const estimatedTime = tc.estimatedTime !== undefined ? parseInt(tc.estimatedTime) : null;
    const updatedAt = new Date().toISOString();

    const sql = `
      UPDATE test_cases SET
        code = ?, module = ?, name = ?, description = ?, 
        preconditions = ?, steps = ?, expectedResult = ?, priority = ?, 
        status = ?, assignedTo = ?, estimatedTime = ?, tags = ?, 
        updatedAt = ?, version = ?
      WHERE id = ?
    `;
    const params = [
      tc.code, tc.module, tc.name, tc.description,
      tc.preconditions, stepsJson, tc.expectedResult, tc.priority,
      tc.status, tc.assignedTo, estimatedTime, tagsJson,
      updatedAt, tc.version, id
    ];

    await query(sql, params);

    res.json({
      ...tc,
      steps: typeof tc.steps === 'string' ? JSON.parse(tc.steps) : tc.steps,
      tags: typeof tc.tags === 'string' ? JSON.parse(tc.tags) : tc.tags,
      updatedAt
    });
  } catch (error) {
    console.error('Error al actualizar caso de prueba:', error);
    res.status(500).json({ error: 'Error al actualizar el caso de prueba.' });
  }
});

// Eliminar caso de prueba
app.delete('/api/test-cases/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await query('DELETE FROM test_cases WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Caso de prueba no encontrado.' });
    }
    res.json({ success: true, message: 'Caso de prueba eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar caso de prueba:', error);
    res.status(500).json({ error: 'Error al eliminar el caso de prueba de la base de datos.' });
  }
});

// ==========================================
// API - Ejecuciones de Prueba (CRUD)
// ==========================================

// Listar ejecuciones (con filtros opcionales y carga de evidencias)
app.get('/api/executions', async (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId) : 1;
    let sql = 'SELECT * FROM test_executions WHERE project_id = ?';
    const params = [projectId];

    if (req.query.testCaseId) {
      sql += ' AND testCaseId = ?';
      params.push(req.query.testCaseId);
    }
    if (req.query.result) {
      sql += ' AND result = ?';
      params.push(req.query.result);
    }
    if (req.query.executedBy) {
      sql += ' AND executedBy = ?';
      params.push(req.query.executedBy);
    }
    if (req.query.dateFrom) {
      sql += ' AND executedAt >= ?';
      params.push(req.query.dateFrom);
    }
    if (req.query.dateTo) {
      sql += ' AND executedAt <= ?';
      params.push(req.query.dateTo);
    }
    if (req.query.includeRetries === 'false') {
      sql += ' AND retryCount = 0';
    }

    sql += ' ORDER BY executedAt DESC';

    const executions = await query(sql, params);

    // Para cada ejecución, cargar las evidencias físicas guardadas en BD
    for (const exec of executions) {
      // Parsear environment JSON
      exec.environment = typeof exec.environment === 'string' 
        ? JSON.parse(exec.environment) 
        : (exec.environment || {});
        
      exec.evidences = await query(
        'SELECT * FROM test_evidences WHERE executionId = ?', 
        [exec.id]
      );
    }

    res.json(executions);
  } catch (error) {
    console.error('Error al obtener las ejecuciones de prueba:', error);
    res.status(500).json({ error: 'Error al obtener las ejecuciones de la base de datos.' });
  }
});

// Crear nueva ejecución (Transacción atómica: ejecución + evidencias)
app.post('/api/executions', async (req, res) => {
  try {
    const exec = req.body;
    const projectId = exec.projectId || 1;
    const id = exec.id || `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const envJson = JSON.stringify(exec.environment || {});
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const execSql = `
        INSERT INTO test_executions (
          id, project_id, testCaseId, testCaseCode, executedBy, 
          executedAt, duration, result, severity, observations, 
          errorMessage, environment, retryCount, parentExecutionId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const execParams = [
        id, projectId, exec.testCaseId, exec.testCaseCode, exec.executedBy,
        exec.executedAt || new Date().toISOString(), exec.duration || 0, exec.result,
        exec.severity || null, exec.observations || '', exec.errorMessage || null,
        envJson, exec.retryCount || 0, exec.parentExecutionId || null
      ];

      await connection.query(execSql, execParams);

      // Guardar registros de las evidencias si existen
      if (exec.evidences && Array.isArray(exec.evidences)) {
        for (const ev of exec.evidences) {
          const evId = ev.id || `evid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const evSql = `
            INSERT INTO test_evidences (
              id, executionId, type, filename, path, description, uploadedAt, size
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const evParams = [
            evId, id, ev.type || 'IMAGE', ev.filename, ev.path,
            ev.description || null, ev.uploadedAt || new Date().toISOString(), ev.size || 0
          ];
          await connection.query(evSql, evParams);
        }
      }

      await connection.commit();
      
      // Obtener la ejecución insertada con sus evidencias para retornar
      const [insertedExec] = await query('SELECT * FROM test_executions WHERE id = ?', [id]);
      if (insertedExec) {
        insertedExec.environment = typeof insertedExec.environment === 'string' 
          ? JSON.parse(insertedExec.environment) 
          : (insertedExec.environment || {});
        insertedExec.evidences = await query('SELECT * FROM test_evidences WHERE executionId = ?', [id]);
      }

      res.status(201).json(insertedExec);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al registrar ejecución de prueba:', error);
    res.status(500).json({ error: 'Error al registrar la ejecución en la base de datos.' });
  }
});

// Eliminar ejecución (y limpiar archivos físicos de evidencias en disco)
app.delete('/api/executions/:id', async (req, res) => {
  const id = req.params.id;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. Consultar evidencias para borrar archivos físicos de uploads/
    const evidences = await query('SELECT path FROM test_evidences WHERE executionId = ?', [id]);
    const uploadsDir = path.join(__dirname, 'uploads');

    for (const ev of evidences) {
      // ev.path es ej. "/evidences/evidence-123456.jpg"
      if (ev.path && ev.path.startsWith('/evidences/')) {
        const filename = ev.path.replace('/evidences/', '');
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`✓ Archivo físico de evidencia borrado del disco: ${filename}`);
        }
      }
    }

    // 2. Eliminar ejecución de la base de datos (por ON DELETE CASCADE se borran evidencias en BD)
    const result = await connection.query('DELETE FROM test_executions WHERE id = ?', [id]);
    
    if (result[0].affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Ejecución no encontrada.' });
    }

    await connection.commit();
    res.json({ success: true, message: 'Ejecución y archivos de evidencias eliminados correctamente.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar ejecución de prueba:', error);
    res.status(500).json({ error: 'Error al eliminar la ejecución de la base de datos.' });
  } finally {
    connection.release();
  }
});

// ==========================================
// API - Estadísticas y Optimizaciones (Fase 4)
// ==========================================

app.get('/api/statistics/summary', async (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId) : 1;
    
    // 1. Total general y por estado
    const totalCasesRes = await query('SELECT COUNT(*) as total FROM test_cases WHERE project_id = ?', [projectId]);
    const total = totalCasesRes[0]?.total || 0;
    
    const latestExecs = await query(`
      SELECT e.result, e.severity, COUNT(*) as count
      FROM test_executions e
      INNER JOIN (
        SELECT testCaseId, MAX(executedAt) as max_executedAt
        FROM test_executions
        WHERE project_id = ?
        GROUP BY testCaseId
      ) latest ON e.testCaseId = latest.testCaseId AND e.executedAt = latest.max_executedAt
      WHERE e.project_id = ?
      GROUP BY e.result, e.severity
    `, [projectId, projectId]);
    
    let executed = 0;
    let approved = 0;
    let criticalFailed = 0;
    let minorFailed = 0;
    let inProgress = 0;
    let notApplicable = 0;
    let requiresUpdate = 0;
    
    latestExecs.forEach(row => {
      executed += row.count;
      if (row.result === 'APROBADO') approved += row.count;
      else if (row.result === 'FALLA_CRITICA') criticalFailed += row.count;
      else if (row.result === 'FALLA_MENOR') minorFailed += row.count;
      else if (row.result === 'EN_PROCESO') inProgress += row.count;
      else if (row.result === 'NO_APLICA') notApplicable += row.count;
      else if (row.result === 'ACTUALIZAR') requiresUpdate += row.count;
    });
    
    const pending = total - executed;
    const passRate = executed > 0 ? (approved / executed) * 100 : 0;
    
    // 2. Modulos
    const moduleRows = await query(`
      SELECT 
        tc.module,
        COUNT(tc.id) as total,
        COUNT(latest.testCaseId) as executed,
        SUM(CASE WHEN latest.result = 'APROBADO' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN latest.result = 'FALLA_CRITICA' THEN 1 ELSE 0 END) as criticalFailed,
        SUM(CASE WHEN latest.result = 'FALLA_MENOR' THEN 1 ELSE 0 END) as minorFailed
      FROM test_cases tc
      LEFT JOIN (
        SELECT e.testCaseId, e.result
        FROM test_executions e
        INNER JOIN (
            SELECT testCaseId, MAX(executedAt) as max_executedAt
            FROM test_executions
            WHERE project_id = ?
            GROUP BY testCaseId
        ) le ON e.testCaseId = le.testCaseId AND e.executedAt = le.max_executedAt
        WHERE e.project_id = ?
      ) latest ON tc.id = latest.testCaseId
      WHERE tc.project_id = ?
      GROUP BY tc.module
    `, [projectId, projectId, projectId]);
    
    const moduleStats = {};
    moduleRows.forEach(row => {
      moduleStats[row.module] = {
        total: row.total,
        executed: row.executed,
        approved: row.approved,
        criticalFailed: row.criticalFailed,
        minorFailed: row.minorFailed
      };
    });
    
    // 3. Prioridad
    const priorityRows = await query(`
      SELECT 
        tc.priority,
        COUNT(tc.id) as total,
        COUNT(latest.testCaseId) as executed,
        SUM(CASE WHEN latest.result = 'APROBADO' THEN 1 ELSE 0 END) as approved
      FROM test_cases tc
      LEFT JOIN (
        SELECT e.testCaseId, e.result
        FROM test_executions e
        INNER JOIN (
            SELECT testCaseId, MAX(executedAt) as max_executedAt
            FROM test_executions
            WHERE project_id = ?
            GROUP BY testCaseId
        ) le ON e.testCaseId = le.testCaseId AND e.executedAt = le.max_executedAt
        WHERE e.project_id = ?
      ) latest ON tc.id = latest.testCaseId
      WHERE tc.project_id = ?
      GROUP BY tc.priority
    `, [projectId, projectId, projectId]);
    
    const priorityStats = {};
    priorityRows.forEach(row => {
      priorityStats[row.priority] = {
        total: row.total,
        executed: row.executed,
        approved: row.approved
      };
    });
    
    // 4. Severidad
    const severityRows = await query(`
      SELECT e.severity, COUNT(*) as count
      FROM test_executions e
      INNER JOIN (
          SELECT testCaseId, MAX(executedAt) as max_executedAt
          FROM test_executions
          WHERE project_id = ?
          GROUP BY testCaseId
      ) latest ON e.testCaseId = latest.testCaseId AND e.executedAt = latest.max_executedAt
      WHERE e.project_id = ? AND e.severity IS NOT NULL
      GROUP BY e.severity
    `, [projectId, projectId]);
    
    const severityStats = {
      CRITICA: 0,
      ALTA: 0,
      MEDIA: 0,
      BAJA: 0
    };
    severityRows.forEach(row => {
      if (row.severity in severityStats) {
        severityStats[row.severity] = row.count;
      }
    });
    
    res.json({
      total,
      executed,
      pending,
      approved,
      criticalFailed,
      minorFailed,
      inProgress,
      notApplicable,
      requiresUpdate,
      passRate,
      moduleStats,
      priorityStats,
      severityStats
    });
  } catch (error) {
    console.error('Error al calcular estadísticas:', error);
    res.status(500).json({ error: 'Error al calcular estadísticas en el servidor.' });
  }
});

// ==========================================
// API - Proyectos (Fase 5)
// ==========================================

// Listar todos los proyectos
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM test_cases WHERE project_id = p.id) as caseCount
      FROM test_projects p
      ORDER BY p.created_at ASC
    `);
    res.json(projects);
  } catch (error) {
    console.error('Error al listar proyectos:', error);
    res.status(500).json({ error: 'Error al obtener proyectos de la base de datos.' });
  }
});

// Crear nuevo proyecto
app.post('/api/projects', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'El nombre del proyecto es obligatorio.' });
    }
    const result = await query(
      'INSERT INTO test_projects (name, description) VALUES (?, ?)',
      [name, description || '']
    );
    const newProjectId = result.insertId;

    // Inicializar módulos por defecto para el nuevo proyecto
    const legacyModules = [
      'AUTH', 'USUARIOS', 'ROLES', 'ESTABLECIMIENTOS', 'MESAS',
      'CATEGORIAS', 'PRODUCTOS', 'ORDENES', 'INVENTARIO', 'REPORTES',
      'CONFIGURACION', 'GENERAL'
    ];
    for (const mod of legacyModules) {
      await query(
        'INSERT INTO custom_modules (project_id, name, label) VALUES (?, ?, ?)',
        [newProjectId, mod, mod]
      );
    }

    // Inicializar configuración por defecto para el nuevo proyecto
    await query(
      'INSERT INTO config (project_id, defaultTester, matrixVersion) VALUES (?, ?, ?)',
      [newProjectId, '', '1.1']
    );

    const [newProject] = await query('SELECT * FROM test_projects WHERE id = ?', [newProjectId]);
    res.status(201).json(newProject);
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    res.status(500).json({ error: 'Error al crear el proyecto.' });
  }
});

// Eliminar proyecto (con borrado en cascada de evidencias físicas y registros SQL)
app.delete('/api/projects/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (id === 1) {
    return res.status(400).json({ error: 'No se puede eliminar el proyecto por defecto.' });
  }
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 1. Obtener todas las evidencias del proyecto para borrar sus archivos físicos
    const evidences = await query(`
      SELECT te.path
      FROM test_evidences te
      INNER JOIN test_executions ex ON te.executionId = ex.id
      WHERE ex.project_id = ?
    `, [id]);
    
    const uploadsDir = path.join(__dirname, 'uploads');
    for (const ev of evidences) {
      if (ev.path && ev.path.startsWith('/evidences/')) {
        const filename = ev.path.replace('/evidences/', '');
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`✓ Archivo físico de evidencia del proyecto eliminado: ${filename}`);
        }
      }
    }
    
    // 2. Eliminar el proyecto de la base de datos (se disparará ON DELETE CASCADE en las tablas relacionadas)
    const result = await connection.query('DELETE FROM test_projects WHERE id = ?', [id]);
    if (result[0].affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }
    
    await connection.commit();
    res.json({ success: true, message: 'Proyecto y todos sus datos relacionados eliminados correctamente.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar proyecto:', error);
    res.status(500).json({ error: 'Error al eliminar el proyecto de la base de datos.' });
  } finally {
    connection.release();
  }
});

// ==========================================
// API - Módulos por Proyecto (CRUD)
// ==========================================

// Listar módulos de un proyecto
app.get('/api/projects/:projectId/modules', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const modules = await query(
      'SELECT name FROM custom_modules WHERE project_id = ? ORDER BY id ASC',
      [projectId]
    );
    res.json(modules.map(m => m.name));
  } catch (error) {
    console.error('Error al listar módulos:', error);
    res.status(500).json({ error: 'Error al obtener los módulos del proyecto.' });
  }
});

// Agregar módulo a un proyecto
app.post('/api/projects/:projectId/modules', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'El nombre del módulo es obligatorio.' });
    }
    const trimmedName = name.trim().toUpperCase();
    // Verificar que no exista ya en este proyecto
    const existing = await query(
      'SELECT id FROM custom_modules WHERE project_id = ? AND name = ?',
      [projectId, trimmedName]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: `El módulo "${trimmedName}" ya existe en este proyecto.` });
    }
    await query(
      'INSERT INTO custom_modules (project_id, name, label) VALUES (?, ?, ?)',
      [projectId, trimmedName, trimmedName]
    );
    res.status(201).json({ name: trimmedName });
  } catch (error) {
    console.error('Error al agregar módulo:', error);
    res.status(500).json({ error: 'Error al agregar el módulo.' });
  }
});

// Editar módulo de un proyecto (y actualizar en cascada los casos de prueba del proyecto)
app.put('/api/projects/:projectId/modules/:oldName', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const projectId = parseInt(req.params.projectId);
    const oldName = req.params.oldName.toUpperCase();
    const { name: newName } = req.body;
    if (!newName) {
      await connection.rollback();
      return res.status(400).json({ error: 'El nuevo nombre del módulo es obligatorio.' });
    }
    const trimmedNewName = newName.trim().toUpperCase();

    // Verificar que el módulo viejo exista
    const [existing] = await connection.query(
      'SELECT id FROM custom_modules WHERE project_id = ? AND name = ?',
      [projectId, oldName]
    );
    if (!existing || existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: `Módulo "${oldName}" no encontrado en este proyecto.` });
    }

    // Verificar que el nombre nuevo no esté ya en uso en este proyecto
    const [conflict] = await connection.query(
      'SELECT id FROM custom_modules WHERE project_id = ? AND name = ?',
      [projectId, trimmedNewName]
    );
    if (conflict && conflict.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: `El módulo "${trimmedNewName}" ya existe en este proyecto.` });
    }

    // Actualizar el nombre del módulo
    await connection.query(
      'UPDATE custom_modules SET name = ?, label = ? WHERE project_id = ? AND name = ?',
      [trimmedNewName, trimmedNewName, projectId, oldName]
    );

    // Actualizar en cascada los casos de prueba del proyecto que usaban el módulo anterior
    await connection.query(
      'UPDATE test_cases SET module = ? WHERE project_id = ? AND module = ?',
      [trimmedNewName, projectId, oldName]
    );

    await connection.commit();
    res.json({ oldName, name: trimmedNewName });
  } catch (error) {
    await connection.rollback();
    console.error('Error al editar módulo:', error);
    res.status(500).json({ error: 'Error al editar el módulo.' });
  } finally {
    connection.release();
  }
});

// Eliminar módulo de un proyecto
app.delete('/api/projects/:projectId/modules/:name', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const name = req.params.name.toUpperCase();
    const result = await query(
      'DELETE FROM custom_modules WHERE project_id = ? AND name = ?',
      [projectId, name]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: `Módulo "${name}" no encontrado en este proyecto.` });
    }
    res.json({ success: true, message: `Módulo "${name}" eliminado del proyecto.` });
  } catch (error) {
    console.error('Error al eliminar módulo:', error);
    res.status(500).json({ error: 'Error al eliminar el módulo.' });
  }
});

// ==========================================
// API - Configuración por Proyecto
// ==========================================

// Obtener configuración de un proyecto
app.get('/api/projects/:projectId/config', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const rows = await query('SELECT * FROM config WHERE project_id = ?', [projectId]);
    if (rows.length === 0) {
      // Si no existe, devolver defaults
      return res.json({ defaultTester: '', matrixVersion: '1.1' });
    }
    const cfg = rows[0];
    res.json({ defaultTester: cfg.defaultTester || '', matrixVersion: cfg.matrixVersion || '1.1' });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener la configuración del proyecto.' });
  }
});

// Actualizar configuración de un proyecto (upsert)
app.put('/api/projects/:projectId/config', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { defaultTester, matrixVersion } = req.body;
    await query(
      `INSERT INTO config (project_id, defaultTester, matrixVersion)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE defaultTester = VALUES(defaultTester), matrixVersion = VALUES(matrixVersion)`,
      [projectId, defaultTester ?? '', matrixVersion ?? '1.1']
    );
    res.json({ defaultTester: defaultTester ?? '', matrixVersion: matrixVersion ?? '1.1' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar la configuración del proyecto.' });
  }
});

// ==========================================
// API - Reportes PDF (Fase 5)
// ==========================================

app.get('/api/reports/project/:id/pdf', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    // 1. Obtener proyecto
    const projectRes = await query('SELECT * FROM test_projects WHERE id = ?', [projectId]);
    if (projectRes.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }
    const project = projectRes[0];
    
    // 2. Obtener datos estadísticos y listado de casos/ejecuciones
    const totalCasesRes = await query('SELECT COUNT(*) as total FROM test_cases WHERE project_id = ?', [projectId]);
    const total = totalCasesRes[0]?.total || 0;
    
    const latestExecs = await query(`
      SELECT e.*
      FROM test_executions e
      INNER JOIN (
        SELECT testCaseId, MAX(executedAt) as max_executedAt
        FROM test_executions
        WHERE project_id = ?
        GROUP BY testCaseId
      ) latest ON e.testCaseId = latest.testCaseId AND e.executedAt = latest.max_executedAt
      WHERE e.project_id = ?
    `, [projectId, projectId]);
    
    let executed = latestExecs.length;
    let approved = latestExecs.filter(e => e.result === 'APROBADO').length;
    let criticalFailed = latestExecs.filter(e => e.result === 'FALLA_CRITICA').length;
    let minorFailed = latestExecs.filter(e => e.result === 'FALLA_MENOR').length;
    let pending = total - executed;
    const passRate = executed > 0 ? (approved / executed) * 100 : 0;
    
    // Obtener detalles de fallas en ejecuciones recientes
    const failures = latestExecs.filter(e => e.result === 'FALLA_CRITICA' || e.result === 'FALLA_MENOR');
    
    // 3. Crear documento PDF
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    
    // Configurar cabeceras de respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Pruebas_${project.name.replace(/\\s+/g, '_')}.pdf`);
    
    doc.pipe(res);
    
    // HEADER de la página
    doc.rect(50, 40, 512, 60).fill('#1e3a8a');
    doc.fillColor('white').fontSize(20).text('MesaGo - Test Manager', 65, 50, { bold: true });
    doc.fontSize(10).text(`Reporte de Ejecución de Pruebas`, 65, 75);
    doc.fontSize(8).text(`Generado el: \${new Date().toLocaleString('es-GT')}`, 65, 87, { align: 'right', width: 480 });
    
    doc.moveDown(4);
    
    // Información del Proyecto
    doc.fillColor('#1e3a8a').fontSize(14).text(`Proyecto: \${project.name}`, { bold: true });
    doc.fillColor('#4b5563').fontSize(10).text(project.description || 'Sin descripción.', { oblique: true });
    
    doc.moveDown(1.5);
    
    // Tabla Resumen Ejecutivo
    doc.fillColor('#1f2937').fontSize(12).text('Resumen Ejecutivo', { underline: true });
    doc.moveDown(0.5);
    
    const summaryX = 50;
    let summaryY = doc.y;
    
    doc.rect(summaryX, summaryY, 512, 70).fill('#f3f4f6');
    doc.fillColor('#1f2937').fontSize(10);
    
    doc.text(`Casos de Prueba Totales: \${total}`, summaryX + 15, summaryY + 15);
    doc.text(`Pruebas Ejecutadas: \${executed} (\${total > 0 ? ((executed/total)*100).toFixed(1) : 0}%)`, summaryX + 15, summaryY + 30);
    doc.text(`Pruebas Pendientes: \${pending}`, summaryX + 15, summaryY + 45);
    
    doc.text(`Pruebas Aprobadas: \${approved}`, summaryX + 260, summaryY + 15);
    doc.text(`Fallas Críticas: \${criticalFailed}`, summaryX + 260, summaryY + 30);
    doc.text(`Fallas Menores: \${minorFailed}`, summaryX + 260, summaryY + 45);
    
    doc.moveDown(5);
    
    // Indicador Pass Rate
    doc.rect(50, doc.y, 512, 30).fill(passRate >= 80 ? '#10b981' : passRate >= 50 ? '#f59e0b' : '#ef4444');
    doc.fillColor('white').fontSize(12).text(`Tasa de Aprobación (Pass Rate): \${passRate.toFixed(1)}%`, 65, doc.y + 8, { bold: true, align: 'center', width: 480 });
    
    doc.moveDown(3);
    
    // Tabla de Fallas
    doc.fillColor('#1f2937').fontSize(12).text('Fallas Reportadas en la Última Ejecución', { underline: true });
    doc.moveDown(0.5);
    
    if (failures.length === 0) {
      doc.fillColor('#10b981').fontSize(10).text('✓ ¡Excelente! No se registran fallas en los casos de prueba de este proyecto.', { bold: true });
    } else {
      failures.forEach((fail, index) => {
        // Añadir página nueva si nos quedamos sin espacio
        if (doc.y > 650) {
          doc.addPage();
        }
        
        const failY = doc.y;
        doc.rect(50, failY, 512, 85).fill(index % 2 === 0 ? '#fffbeb' : '#ffffff');
        doc.rect(50, failY, 5, 85).fill(fail.result === 'FALLA_CRITICA' ? '#ef4444' : '#f59e0b');
        
        doc.fillColor('#111827').fontSize(10).text(`[\${fail.testCaseCode}] - Ejecución: \${fail.id}`, 65, failY + 10, { bold: true });
        doc.fillColor(fail.result === 'FALLA_CRITICA' ? '#ef4444' : '#d97706').fontSize(9).text(
          `\${fail.result} | Severidad: \${fail.severity || 'N/A'}`, 65, failY + 23, { bold: true }
        );
        
        doc.fillColor('#374151').fontSize(9).text(`Observaciones: \${fail.observations || 'Sin observaciones.'}`, 65, failY + 38, { width: 480 });
        if (fail.errorMessage) {
          doc.fillColor('#dc2626').text(`Mensaje de Error: \${fail.errorMessage}`, 65, failY + 53, { width: 480 });
        }
        
        doc.fillColor('#6b7280').fontSize(8).text(`Ejecutado por: \${fail.executedBy} | Fecha: \${new Date(fail.executedAt).toLocaleString('es-GT')}`, 65, failY + 70);
        
        doc.moveDown(1.5);
      });
    }
    
    // Finalizar el reporte
    doc.end();
  } catch (error) {
    console.error('Error al generar PDF del reporte:', error);
    res.status(500).json({ error: 'Error interno al generar el reporte en PDF.' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` Backend TestManager escuchando en puerto ${PORT}`);
  console.log(` Evidencias estáticas servidas en /evidences`);
  console.log(`===================================================`);
});
