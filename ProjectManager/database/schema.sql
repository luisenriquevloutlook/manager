-- ==========================================
-- Esquema de Base de Datos - ProjectManager
-- ==========================================

-- Tabla de proyectos
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE DEFAULT NULL,  -- Fecha de inicio del proyecto (editable)
  end_date DATE DEFAULT NULL,    -- Fecha estimada de entrega (editable)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de componentes (para pesos y avances ponderados)
CREATE TABLE IF NOT EXISTS components (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  weight DECIMAL(5,4) NOT NULL,    -- Peso porcentual (ej. 0.2500 para 25%)
  progress DECIMAL(5,4) DEFAULT 0.0000, -- Avance del componente (ej. 0.3500 para 35%)
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_component_project (project_id, name)
);

-- Tabla de tareas (actividades del plan de trabajo)
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  section VARCHAR(100) NOT NULL,   -- Sección / Categoría del Excel (ej. Planeación, Backend)
  description TEXT NOT NULL,       -- Descripción de la actividad
  status VARCHAR(50),              -- Completado, En Progreso, Pendiente, Hito, CANCELADO
  tag VARCHAR(50),                 -- Etiqueta del Excel
  original_estimated_date DATE,    -- Fecha estimada original (YYYY-MM-DD)
  real_date DATE,                  -- Fecha real de ejecución (YYYY-MM-DD)
  days INT,                        -- Días estimados de duración
  estimated_date DATE,             -- Fecha estimada actual (YYYY-MM-DD)
  order_index INT NOT NULL DEFAULT 0, -- Orden de las tareas para arrastrar y soltar
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Tabla de prioridades del MVP
CREATE TABLE IF NOT EXISTS mvp_priorities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  priority VARCHAR(50) NOT NULL,   -- CRÍTICO, IMPORTANTE, etc.
  functionality TEXT NOT NULL,     -- Nombre o descripción del entregable
  criticity VARCHAR(20) NOT NULL,  -- Criticidad expresada en estrellas (⭐⭐⭐)
  status VARCHAR(50) NOT NULL,     -- Pendiente, Completado, etc.
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Tabla de historial ejecutivo (Registro de fechas de ejecución)
CREATE TABLE IF NOT EXISTS executive_timeline (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  date DATE NOT NULL,              -- Fecha del registro
  component VARCHAR(100) NOT NULL, -- Componente relacionado (ej. Planeación, Backend)
  task_description TEXT NOT NULL,  -- Descripción corta del hito alcanzado
  percentage_logrado DECIMAL(5,4) DEFAULT 1.0000, -- Porcentaje de logro (ej. 1.0000 para 100%)
  notes TEXT,                      -- Observaciones adicionales
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Registrar el proyecto base de MesaGo (ID = 1)
INSERT INTO projects (id, name, description)
VALUES (1, 'MesaGo', 'Proyecto de desarrollo para el sistema de restaurantes MesaGo v6.0-6.2')
ON DUPLICATE KEY UPDATE name=name;
