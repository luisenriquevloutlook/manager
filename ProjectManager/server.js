import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import pool, { query } from './database/connection.js';

// Helper para limpiar fechas y evitar errores de truncado en MySQL
const cleanDate = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    const yyyy = dateVal.getFullYear();
    const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
    const dd = String(dateVal.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const str = String(dateVal).trim();
  if (str === '' || str === 'null') return null;
  if (str.includes('T')) {
    return str.split('T')[0];
  }
  return str;
};

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3040;

app.use(cors());
app.use(express.json());

// Logger simple
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ==========================================
// ENDPOINTS - PROYECTOS (PROJECTS)
// ==========================================

// Obtener todos los proyectos
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proyectos: ' + error.message });
  }
});

// Actualizar fechas de inicio y fin del proyecto
app.patch('/api/projects/:id/dates', async (req, res) => {
  const { id } = req.params;
  const { start_date, end_date } = req.body;
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Se requieren start_date y end_date.' });
  }
  try {
    await query(
      'UPDATE projects SET start_date = ?, end_date = ? WHERE id = ?',
      [cleanDate(start_date), cleanDate(end_date), id]
    );
    res.json({ success: true, message: 'Fechas del proyecto actualizadas.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar fechas: ' + error.message });
  }
});

// Crear nuevo proyecto
app.post('/api/projects', async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'El nombre del proyecto es obligatorio.' });
  }
  try {
    const result = await query(
      'INSERT INTO projects (name, description) VALUES (?, ?)',
      [name, description || '']
    );
    const newProject = {
      id: result.insertId,
      name,
      description,
      created_at: new Date()
    };

    // Inicializar componentes por defecto para el nuevo proyecto
    const defaultComponents = [
      { name: 'Backend API (.NET 8)', weight: 0.25 },
      { name: 'Panel WEB Admin', weight: 0.20 },
      { name: 'PWA Cliente', weight: 0.20 },
      { name: 'PWA Meseros', weight: 0.15 },
      { name: 'Pantalla Cocina', weight: 0.10 },
      { name: 'Backend Avanzado', weight: 0.05 },
      { name: 'Integraciones', weight: 0.02 },
      { name: 'Testing y QA', weight: 0.02 },
      { name: 'DevOps', weight: 0.01 }
    ];

    for (const comp of defaultComponents) {
      await query(
        'INSERT INTO components (project_id, name, weight, progress) VALUES (?, ?, ?, 0.00)',
        [result.insertId, comp.name, comp.weight]
      );
    }

    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear proyecto: ' + error.message });
  }
});

// Eliminar proyecto (en cascada por FK)
app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ success: true, message: 'Proyecto eliminado con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar proyecto: ' + error.message });
  }
});

// ==========================================
// ENDPOINTS - SECCIONES DEL PROYECTO
// ==========================================

// Obtener secciones de un proyecto ordenadas
app.get('/api/sections', async (req, res) => {
  const projectId = req.query.projectId || 1;
  try {
    const sections = await query(
      'SELECT * FROM project_sections WHERE project_id = ? ORDER BY order_index ASC, id ASC',
      [projectId]
    );
    res.json(sections);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener secciones: ' + error.message });
  }
});

// Crear nueva sección
app.post('/api/sections', async (req, res) => {
  const { project_id, name } = req.body;
  if (!project_id || !name || !name.trim()) {
    return res.status(400).json({ error: 'project_id y name son obligatorios.' });
  }
  try {
    const maxOrder = await query(
      'SELECT COALESCE(MAX(order_index), 0) as max_order FROM project_sections WHERE project_id = ?',
      [project_id]
    );
    const nextOrder = maxOrder[0].max_order + 1;
    const result = await query(
      'INSERT INTO project_sections (project_id, name, order_index) VALUES (?, ?, ?)',
      [project_id, name.trim(), nextOrder]
    );
    res.status(201).json({ id: result.insertId, project_id, name: name.trim(), order_index: nextOrder });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe una sección con ese nombre en este proyecto.' });
    }
    res.status(500).json({ error: 'Error al crear sección: ' + error.message });
  }
});

// Reordenar secciones
app.put('/api/sections/reorder', async (req, res) => {
  const { sections } = req.body; // [{ id, order_index }]
  if (!Array.isArray(sections)) {
    return res.status(400).json({ error: 'Se esperaba un array de secciones.' });
  }
  try {
    for (const s of sections) {
      await query('UPDATE project_sections SET order_index = ? WHERE id = ?', [s.order_index, s.id]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al reordenar secciones: ' + error.message });
  }
});

// Guardar todos los pesos y avances de secciones a la vez
app.put('/api/sections/save-all', async (req, res) => {
  const { sections } = req.body; // [{ id, weight, progress }]
  if (!Array.isArray(sections)) {
    return res.status(400).json({ error: 'Se esperaba un array de secciones.' });
  }
  try {
    for (const s of sections) {
      await query(
        'UPDATE project_sections SET weight = ?, progress = ? WHERE id = ?',
        [parseFloat(s.weight), parseFloat(s.progress), s.id]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar secciones: ' + error.message });
  }
});

// Actualizar peso y avance de una sección
app.put('/api/sections/:id/progress', async (req, res) => {
  const { id } = req.params;
  const { weight, progress } = req.body;
  if (weight === undefined || progress === undefined) {
    return res.status(400).json({ error: 'Se requieren weight y progress.' });
  }
  try {
    await query(
      'UPDATE project_sections SET weight = ?, progress = ? WHERE id = ?',
      [parseFloat(weight), parseFloat(progress), id]
    );
    res.json({ success: true, message: 'Peso y avance de la sección actualizados.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar sección: ' + error.message });
  }
});

// Renombrar sección
app.put('/api/sections/:id', async (req, res) => {
  const { id } = req.params;
  const { name, project_id } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio.' });
  }
  try {
    // Update section name
    await query('UPDATE project_sections SET name = ? WHERE id = ?', [name.trim(), id]);
    // Also rename any tasks that belong to the old section name in this project
    if (project_id) {
      const sec = await query('SELECT * FROM project_sections WHERE id = ?', [id]);
      if (sec.length > 0) {
        await query(
          'UPDATE tasks SET section = ? WHERE project_id = ? AND section = ?',
          [name.trim(), project_id, sec[0].name]
        );
      }
    }
    res.json({ success: true, message: 'Sección renombrada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al renombrar sección: ' + error.message });
  }
});

// Eliminar sección
app.delete('/api/sections/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM project_sections WHERE id = ?', [id]);
    res.json({ success: true, message: 'Sección eliminada.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar sección: ' + error.message });
  }
});

// ==========================================
// ENDPOINTS - DASHBOARD Y MÉTRICAS
// ==========================================

// Resumen ejecutivo y estadísticas del Dashboard
app.get('/api/dashboard/summary', async (req, res) => {
  const projectId = req.query.projectId || 1;
  try {
    // 1. Conteo de tareas por estatus
    const taskStatusCounts = await query(`
      SELECT status, COUNT(*) as count 
      FROM tasks 
      WHERE project_id = ? 
      GROUP BY status
    `, [projectId]);

    let totalTasks = 0;
    let completedTasks = 0;
    let progressTasks = 0;
    let pendingTasks = 0;
    let cancelTasks = 0;
    let milestoneTasks = 0;

    taskStatusCounts.forEach(row => {
      const status = (row.status || '').toLowerCase().trim();
      const count = row.count;
      if (status === 'completado') completedTasks = count;
      else if (status === 'en progreso') progressTasks = count;
      else if (status === 'pendiente' || status === 'null' || !status) pendingTasks = count;
      else if (status === 'cancelado') cancelTasks = count;
      else if (status === 'hito') milestoneTasks = count;
      
      // No sumamos los cancelados al total activo, o sí? 
      // El Excel suma todas las tareas, excepto hito/cancelado para algunas métricas.
      // Sumemos todas para el total general
      totalTasks += count;
    });

    // 2. Calcular el avance total ponderado del proyecto desde las SECCIONES
    const sectionsData = await query(
      'SELECT weight, progress FROM project_sections WHERE project_id = ?',
      [projectId]
    );
    let totalProgress = 0;
    let totalWeight = 0;
    sectionsData.forEach(sec => {
      totalProgress += parseFloat(sec.weight) * parseFloat(sec.progress);
      totalWeight += parseFloat(sec.weight);
    });

    // Normalizar si los pesos no suman 1
    if (totalWeight > 0) {
      totalProgress = totalProgress / totalWeight;
    }

    // 3. Calcular el avance del MVP Básico
    // Las prioridades MVP tienen estado 'Completado' o 'Pendiente'
    const mvpStats = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN TRIM(LOWER(status)) = 'completado' THEN 1 ELSE 0 END) as completed
      FROM mvp_priorities
      WHERE project_id = ?
    `, [projectId]);
    const mvpTotal = mvpStats[0].total || 0;
    const mvpCompleted = mvpStats[0].completed || 0;
    const mvpProgress = mvpTotal > 0 ? (mvpCompleted / mvpTotal) : 0;

    // 4. Calcular días transcurridos y restantes
    // Obtener fechas dinámicamente desde la tabla projects
    const projectRow = await query('SELECT start_date, end_date FROM projects WHERE id = ?', [projectId]);
    const rawStart = projectRow.length > 0 && projectRow[0].start_date ? projectRow[0].start_date : '2025-12-15';
    const rawEnd   = projectRow.length > 0 && projectRow[0].end_date   ? projectRow[0].end_date   : '2026-02-23';

    const startDateStr = rawStart instanceof Date ? cleanDate(rawStart) : String(rawStart).split('T')[0];
    const endDateStr   = rawEnd   instanceof Date ? cleanDate(rawEnd)   : String(rawEnd).split('T')[0];

    const startDate = new Date(startDateStr);
    const originalEndDate = new Date(endDateStr);
    const today = new Date();

    const diffTimeElapsed = today.getTime() - startDate.getTime();
    const daysElapsed = Math.max(0, Math.floor(diffTimeElapsed / (1000 * 60 * 60 * 24)));

    const diffTimeRemaining = originalEndDate.getTime() - today.getTime();
    const daysRemaining = Math.floor(diffTimeRemaining / (1000 * 60 * 60 * 24));

    res.json({
      totalTasks,
      completedTasks,
      progressTasks,
      pendingTasks,
      cancelTasks,
      milestoneTasks,
      totalProgress: parseFloat(totalProgress.toFixed(4)),
      mvpProgress: parseFloat(mvpProgress.toFixed(4)),
      daysElapsed,
      daysRemaining,
      startDate: startDateStr,
      endDate: endDateStr
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener resumen: ' + error.message });
  }
});

// ==========================================
// ENDPOINTS - COMPONENTES (COMPONENTS)
// ==========================================

// Obtener componentes por proyecto
app.get('/api/components', async (req, res) => {
  const projectId = req.query.projectId || 1;
  try {
    const components = await query(
      'SELECT * FROM components WHERE project_id = ? ORDER BY weight DESC',
      [projectId]
    );
    res.json(components);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener componentes: ' + error.message });
  }
});

// Actualizar un componente (peso y/o avance)
app.put('/api/components/:id', async (req, res) => {
  const { id } = req.params;
  const { weight, progress } = req.body;
  try {
    await query(
      'UPDATE components SET weight = ?, progress = ? WHERE id = ?',
      [weight, progress, id]
    );
    res.json({ success: true, message: 'Componente actualizado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar componente: ' + error.message });
  }
});

// ==========================================
// ENDPOINTS - TAREAS / ACTIVIDADES (TASKS)
// ==========================================

// Obtener todas las tareas de un proyecto con filtros
app.get('/api/tasks', async (req, res) => {
  const projectId = req.query.projectId || 1;
  const { section, status, search } = req.query;
  
  let sql = `
    SELECT 
      id, project_id, section, description, status, tag, 
      DATE_FORMAT(original_estimated_date, '%Y-%m-%d') AS original_estimated_date,
      DATE_FORMAT(real_date, '%Y-%m-%d') AS real_date,
      days,
      DATE_FORMAT(estimated_date, '%Y-%m-%d') AS estimated_date,
      order_index
    FROM tasks 
    WHERE project_id = ?
  `;
  const params = [projectId];

  if (section) {
    sql += ' AND section = ?';
    params.push(section);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (description LIKE ? OR tag LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY order_index ASC';

  try {
    const tasks = await query(sql, params);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tareas: ' + error.message });
  }
});

// Crear una nueva tarea
app.post('/api/tasks', async (req, res) => {
  const {
    project_id, section, description, status, tag,
    original_estimated_date, real_date, days, estimated_date
  } = req.body;

  if (!project_id || !section || !description) {
    return res.status(400).json({ error: 'Los campos project_id, section y description son obligatorios.' });
  }

  try {
    // Calcular el siguiente order_index para colocarla al final
    const maxOrderResult = await query(
      'SELECT COALESCE(MAX(order_index), 0) AS max_order FROM tasks WHERE project_id = ?',
      [project_id]
    );
    const nextOrder = maxOrderResult[0].max_order + 1;

    const result = await query(`
      INSERT INTO tasks (
        project_id, section, description, status, tag,
        original_estimated_date, real_date, days, estimated_date, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      project_id, section, description, status || 'Pendiente', tag || null,
      cleanDate(original_estimated_date), cleanDate(real_date), 
      days !== undefined && days !== null && String(days).trim() !== '' ? parseInt(days) : null, 
      cleanDate(estimated_date), nextOrder
    ]);

    res.status(201).json({
      id: result.insertId,
      project_id, section, description, status: status || 'Pendiente', tag,
      original_estimated_date: cleanDate(original_estimated_date),
      real_date: cleanDate(real_date),
      days: days !== undefined && days !== null && String(days).trim() !== '' ? parseInt(days) : null,
      estimated_date: cleanDate(estimated_date),
      order_index: nextOrder
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la tarea: ' + error.message });
  }
});

// Actualizar el orden de las tareas (Drag and Drop)
app.put('/api/tasks/reorder', async (req, res) => {
  const { tasks } = req.body; // Array de { id, order_index, section }
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Se esperaba un array de tareas.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const t of tasks) {
      if (t.section) {
        await conn.execute(
          'UPDATE tasks SET order_index = ?, section = ? WHERE id = ?',
          [t.order_index, t.section, t.id]
        );
      } else {
        await conn.execute(
          'UPDATE tasks SET order_index = ? WHERE id = ?',
          [t.order_index, t.id]
        );
      }
    }
    await conn.commit();
    res.json({ success: true, message: 'Orden actualizado correctamente.' });
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error('Error al hacer rollback:', rbErr);
    }
    console.error('Error en reorder:', error);
    res.status(500).json({ error: 'Error al reordenar tareas: ' + error.message });
  } finally {
    conn.release();
  }
});

// Actualizar una tarea existente
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const {
    section, description, status, tag,
    original_estimated_date, real_date, days, estimated_date
  } = req.body;

  try {
    // Obtener la tarea actual para hacer fallback en campos no enviados (soporte para actualización parcial)
    const currentTasks = await query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (currentTasks.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada.' });
    }
    const current = currentTasks[0];

    const finalSection = section !== undefined ? section : current.section;
    const finalDescription = description !== undefined ? description : current.description;
    const finalStatus = status !== undefined ? status : current.status;
    const finalTag = tag !== undefined ? tag : current.tag;
    const finalOriginalEstDate = original_estimated_date !== undefined ? original_estimated_date : current.original_estimated_date;
    const finalRealDate = real_date !== undefined ? real_date : current.real_date;
    const finalDays = days !== undefined ? (days !== null && String(days).trim() !== '' ? parseInt(days) : null) : current.days;
    const finalEstDate = estimated_date !== undefined ? estimated_date : current.estimated_date;

    await query(`
      UPDATE tasks SET
        section = ?, description = ?, status = ?, tag = ?,
        original_estimated_date = ?, real_date = ?, days = ?, estimated_date = ?
      WHERE id = ?
    `, [
      finalSection, finalDescription, finalStatus, finalTag || null,
      cleanDate(finalOriginalEstDate), cleanDate(finalRealDate), finalDays,
      cleanDate(finalEstDate), id
    ]);

    res.json({ success: true, message: 'Tarea actualizada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la tarea: ' + error.message });
  }
});

// Eliminar una tarea
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM tasks WHERE id = ?', [id]);
    res.json({ success: true, message: 'Tarea eliminada con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la tarea: ' + error.message });
  }
});

// ==========================================
// ENDPOINTS - BITÁCORA / LÍNEA DE TIEMPO (TIMELINE)
// ==========================================

// Obtener bitácora de ejecución histórica
app.get('/api/timeline', async (req, res) => {
  const projectId = req.query.projectId || 1;
  try {
    const logs = await query(
      'SELECT * FROM executive_timeline WHERE project_id = ? ORDER BY date DESC',
      [projectId]
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener bitácora: ' + error.message });
  }
});

// Agregar registro a la bitácora
app.post('/api/timeline', async (req, res) => {
  const { project_id, date, component, task_description, percentage_logrado, notes } = req.body;
  if (!project_id || !date || !component || !task_description) {
    return res.status(400).json({ error: 'Los campos project_id, date, component y task_description son requeridos.' });
  }

  try {
    const result = await query(`
      INSERT INTO executive_timeline (project_id, date, component, task_description, percentage_logrado, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [project_id, date, component, task_description, percentage_logrado || 1.0000, notes || null]);

    res.status(201).json({
      id: result.insertId,
      project_id, date, component, task_description, percentage_logrado, notes
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar hito: ' + error.message });
  }
});

// ==========================================
// ENDPOINTS - PRIORIDADES MVP (MVP PRIORITIES)
// ==========================================

// Obtener prioridades MVP
app.get('/api/mvp-priorities', async (req, res) => {
  const projectId = req.query.projectId || 1;
  try {
    const priorities = await query(
      'SELECT * FROM mvp_priorities WHERE project_id = ? ORDER BY id ASC',
      [projectId]
    );
    res.json(priorities);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener prioridades MVP: ' + error.message });
  }
});

// Actualizar estado de prioridad MVP
app.put('/api/mvp-priorities/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await query(
      'UPDATE mvp_priorities SET status = ? WHERE id = ?',
      [status, id]
    );
    res.json({ success: true, message: 'Prioridad MVP actualizada.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar prioridad MVP: ' + error.message });
  }
});

// ==========================================
// GENERACIÓN DE REPORTES PDF (PDFKIT)
// ==========================================

app.get('/api/reports/project/:id/pdf', async (req, res) => {
  const projectId = req.params.id;
  try {
    // Obtener detalles del proyecto
    const projectResult = await query('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (projectResult.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    const project = projectResult[0];

    // Obtener datos agregados del dashboard
    const components = await query('SELECT * FROM components WHERE project_id = ? ORDER BY weight DESC', [projectId]);
    const tasks = await query(`
      SELECT 
        id, project_id, section, description, status, tag, 
        DATE_FORMAT(original_estimated_date, '%Y-%m-%d') AS original_estimated_date,
        DATE_FORMAT(real_date, '%Y-%m-%d') AS real_date,
        days,
        DATE_FORMAT(estimated_date, '%Y-%m-%d') AS estimated_date,
        order_index
      FROM tasks 
      WHERE project_id = ?
      ORDER BY order_index ASC
    `, [projectId]);
    const timeline = await query('SELECT * FROM executive_timeline WHERE project_id = ? ORDER BY date DESC', [projectId]);
    const mvp = await query('SELECT * FROM mvp_priorities WHERE project_id = ?', [projectId]);

    // Calcular estadísticas
    let totalProgress = 0;
    components.forEach(c => {
      totalProgress += parseFloat(c.weight) * parseFloat(c.progress);
    });

    const completedTasks = tasks.filter(t => (t.status || '').toLowerCase() === 'completado').length;
    const progressTasks = tasks.filter(t => (t.status || '').toLowerCase() === 'en progreso').length;
    const pendingTasks = tasks.filter(t => (t.status || '').toLowerCase() === 'pendiente' || !t.status).length;
    const canceledTasks = tasks.filter(t => (t.status || '').toLowerCase() === 'cancelado').length;

    // Crear PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Configurar cabeceras de descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Avance_${project.name.replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);

    // Encabezado
    doc.fillColor('#1e293b').fontSize(24).text('Reporte de Avance del Proyecto', { align: 'center' });
    doc.fontSize(16).text(project.name, { align: 'center' });
    doc.moveDown();
    
    // Línea divisoria
    doc.moveTo(50, 110).lineTo(562, 110).strokeColor('#cbd5e1').stroke();
    doc.moveDown(2);

    // Resumen Ejecutivo
    doc.fillColor('#0f172a').fontSize(14).text('1. Resumen Ejecutivo', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#334155');
    doc.text(`Avance Ponderado General: ${(totalProgress * 100).toFixed(2)}%`);
    doc.text(`Total de Actividades: ${tasks.length}`);
    doc.text(`  - Completadas: ${completedTasks}`);
    doc.text(`  - En Progreso: ${progressTasks}`);
    doc.text(`  - Pendientes: ${pendingTasks}`);
    doc.text(`  - Canceladas: ${canceledTasks}`);
    doc.moveDown(1.5);

    // Avance por Componente
    doc.fillColor('#0f172a').fontSize(14).text('2. Avance por Componente', { underline: true });
    doc.moveDown(0.5);
    
    components.forEach(c => {
      const barLength = 150;
      const progressLength = barLength * parseFloat(c.progress);
      
      doc.fillColor('#334155').fontSize(10).text(`${c.name.padEnd(30)} | Peso: ${(c.weight * 100).toFixed(1)}% | Avance: ${(c.progress * 100).toFixed(1)}%`);
      
      // Dibujar barra de progreso sutil
      const y = doc.y;
      doc.rect(380, y - 10, barLength, 8).fill('#e2e8f0');
      if (progressLength > 0) {
        doc.rect(380, y - 10, progressLength, 8).fill('#4a90e2');
      }
      doc.moveDown(0.8);
    });
    
    doc.moveDown(1.5);

    // Prioridades MVP
    doc.fillColor('#0f172a').fontSize(14).text('3. Prioridades del MVP', { underline: true });
    doc.moveDown(0.5);
    mvp.forEach((m, idx) => {
      doc.fillColor('#334155').fontSize(10).text(`${idx + 1}. [${m.priority}] ${m.functionality} - Criticidad: ${m.criticity} - Estatus: ${m.status}`);
      doc.moveDown(0.4);
    });

    doc.addPage();

    // Historial Ejecutivo (Línea de tiempo)
    doc.fillColor('#0f172a').fontSize(14).text('4. Hitos Logrados e Historial Ejecutivo', { underline: true });
    doc.moveDown(0.5);

    timeline.forEach(t => {
      const dateStr = t.date instanceof Date ? t.date.toISOString().split('T')[0] : String(t.date).split('T')[0];
      doc.fillColor('#1e293b').fontSize(11).text(`${dateStr} | ${t.component}`, { bold: true });
      doc.fillColor('#475569').fontSize(10).text(`Hito: ${t.task_description}`);
      if (t.notes) {
        doc.fillColor('#64748b').fontSize(9).text(`Notas: ${t.notes}`);
      }
      doc.moveDown(0.8);
    });

    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar reporte PDF: ' + error.message });
    }
  }
});

// Inicializar Servidor
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` SERVIDOR BACKEND CORRIENDO EN PUERTO: ${PORT}`);
  console.log(`===================================================`);
});
