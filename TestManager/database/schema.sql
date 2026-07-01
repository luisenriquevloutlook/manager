-- ==========================================
-- Esquema de Base de Datos - TestManager
-- ==========================================

-- Tabla de control de versiones de migraciones
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de proyectos
CREATE TABLE IF NOT EXISTS test_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de casos de prueba
CREATE TABLE IF NOT EXISTS test_cases (
  id VARCHAR(50) PRIMARY KEY,
  project_id INT NOT NULL,
  code VARCHAR(50) NOT NULL,
  module VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  preconditions TEXT,
  steps JSON NOT NULL, -- Array de strings
  expectedResult TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  assignedTo VARCHAR(100),
  estimatedTime INT, -- en minutos
  tags JSON, -- Array de strings
  createdAt VARCHAR(50) NOT NULL,
  updatedAt VARCHAR(50) NOT NULL,
  version VARCHAR(20) DEFAULT '1.0',
  FOREIGN KEY (project_id) REFERENCES test_projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_code_project (project_id, code)
);

-- Tabla de ejecuciones de prueba
CREATE TABLE IF NOT EXISTS test_executions (
  id VARCHAR(50) PRIMARY KEY,
  project_id INT NOT NULL,
  testCaseId VARCHAR(50) NOT NULL,
  testCaseCode VARCHAR(50) NOT NULL,
  executedBy VARCHAR(100) NOT NULL,
  executedAt VARCHAR(50) NOT NULL,
  duration INT NOT NULL, -- en segundos
  result VARCHAR(50) NOT NULL,
  severity VARCHAR(20),
  observations TEXT,
  errorMessage TEXT,
  environment JSON, -- Detalles de navegador, OS, etc.
  retryCount INT NOT NULL DEFAULT 0,
  parentExecutionId VARCHAR(50),
  FOREIGN KEY (project_id) REFERENCES test_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (testCaseId) REFERENCES test_cases(id) ON DELETE CASCADE
);

-- Tabla de evidencias de prueba
CREATE TABLE IF NOT EXISTS test_evidences (
  id VARCHAR(50) PRIMARY KEY,
  executionId VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL, -- IMAGE, SCREENSHOT, etc.
  filename VARCHAR(255) NOT NULL,
  path VARCHAR(255) NOT NULL, -- Ruta o URL en el backend
  description TEXT,
  uploadedAt VARCHAR(50) NOT NULL,
  size INT NOT NULL, -- tamaño en bytes
  FOREIGN KEY (executionId) REFERENCES test_executions(id) ON DELETE CASCADE
);

-- Tabla de módulos personalizados (si aplica por proyecto)
CREATE TABLE IF NOT EXISTS custom_modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  FOREIGN KEY (project_id) REFERENCES test_projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_module_project (project_id, name)
);

-- Tabla de configuraciones por proyecto
CREATE TABLE IF NOT EXISTS config (
  project_id INT PRIMARY KEY,
  defaultTester VARCHAR(100),
  matrixVersion VARCHAR(50),
  FOREIGN KEY (project_id) REFERENCES test_projects(id) ON DELETE CASCADE
);

-- ==========================================
-- Inicialización de Datos Base
-- ==========================================

-- Insertar el proyecto por defecto (ID = 1)
INSERT INTO test_projects (id, name, description)
VALUES (1, 'Proyecto Default MesaGo', 'Proyecto por defecto creado durante la migración del almacenamiento localStorage')
ON DUPLICATE KEY UPDATE name=name;

-- Registrar la primera versión en schema_migrations
INSERT INTO schema_migrations (version)
VALUES ('1.0.0-initial-schema')
ON DUPLICATE KEY UPDATE version=version;
