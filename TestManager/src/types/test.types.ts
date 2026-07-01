/**
 * Sistema de tipos para Test Manager
 */

/**
 * Prioridad del caso de prueba
 */
export type TestPriority = 'ALTA' | 'MEDIA' | 'BAJA' | 'CRÍTICA';

/**
 * Estado del caso de prueba
 * Ahora los estados coinciden con los resultados de ejecución para evitar confusión
 */
export type TestStatus = 
  | 'PENDIENTE'              // ○ Pendiente (caso sin ejecutar)
  | 'APROBADO'               // ✓ Aprobado
  | 'FALLA_CRITICA'          // ✗ Falla crítica
  | 'FALLA_MENOR'            // △ Falla menor / Advertencia
  | 'EN_PROCESO'             // ⚙ En proceso
  | 'NO_APLICA'              // ⊘ No aplica
  | 'ACTUALIZAR';            // 📝 Requiere actualización

/**
 * Resultado de la ejecución (basado en Leyenda de Estados)
 */
export type TestResult = 
  | 'APROBADO'                // ✓ Aprobado
  | 'FALLA_CRITICA'           // ✗ Falla crítica
  | 'FALLA_MENOR'             // △ Falla menor / Advertencia
  | 'EN_PROCESO'              // ⚙ En proceso
  | 'PENDIENTE'               // ○ Pendiente
  | 'NO_APLICA'               // ⊘ No aplica
  | 'ACTUALIZAR';             // 📝 Requiere actualización

/**
 * Severidad de defectos
 */
export type DefectSeverity = 
  | 'CRITICA'  // 🔴 Bloquea funcionalidad principal
  | 'ALTA'     // 🟠 Afecta funcionalidad importante
  | 'MEDIA'    // 🟡 Afecta funcionalidad menor
  | 'BAJA';    // 🟢 Cosmético o mejora

/**
 * Módulo del sistema
 */
export type TestModule = 
  | 'AUTH' 
  | 'USUARIOS' 
  | 'ROLES' 
  | 'ESTABLECIMIENTOS'
  | 'MESAS'
  | 'CATEGORIAS'
  | 'PRODUCTOS'
  | 'ORDENES'
  | 'INVENTARIO'
  | 'REPORTES'
  | 'CONFIGURACION'
  | 'GENERAL';

/**
 * Caso de prueba
 */
export interface TestCase {
  id: string;
  projectId: number;
  code: string; // Ej: AUTH-001, USR-101
  module: TestModule;
  name: string;
  description: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  priority: TestPriority;
  status: TestStatus;
  assignedTo?: string;
  estimatedTime?: number; // minutos
  tags: string[];
  createdAt: string;
  updatedAt: string;
  version: string; // Ej: "1.1"
}

/**
 * Evidencia de prueba
 */
export interface TestEvidence {
  id: string;
  executionId: string;
  type: 'IMAGE' | 'VIDEO' | 'LOG' | 'SCREENSHOT';
  filename: string;
  path: string;
  dataUrl?: string; // Contenido de la imagen en base64 (para imágenes)
  description?: string;
  uploadedAt: string;
  size: number; // bytes
}

/**
 * Ejecución de prueba
 */
export interface TestExecution {
  id: string;
  projectId: number;
  testCaseId: string;
  testCaseCode: string;
  executedBy: string;
  executedAt: string;
  duration: number; // segundos
  result: TestResult;
  severity?: DefectSeverity; // Severidad del defecto (solo aplica para fallas)
  observations: string;
  errorMessage?: string;
  evidences: TestEvidence[];
  environment: {
    browser?: string;
    os?: string;
    apiVersion?: string;
    frontendVersion?: string;
  };
  retryCount: number; // Número de reintento (0 = primera ejecución)
  parentExecutionId?: string; // ID de la ejecución original si es un reintento
}

/**
 * Resumen de estadísticas
 */
export interface TestStatistics {
  total: number;
  executed: number;
  pending: number;
  approved: number;         // APROBADO
  criticalFailed: number;   // FALLA_CRITICA
  minorFailed: number;      // FALLA_MENOR
  inProgress: number;       // EN_PROCESO
  notApplicable: number;    // NO_APLICA
  requiresUpdate: number;   // ACTUALIZAR
  passRate: number; // Porcentaje
  moduleStats: Record<TestModule, {
    total: number;
    executed: number;
    approved: number;
    criticalFailed: number;
    minorFailed: number;
  }>;
  priorityStats: Record<TestPriority, {
    total: number;
    executed: number;
    approved: number;
  }>;
  severityStats: Record<DefectSeverity, number>; // Conteo de defectos por severidad
}

/**
 * Filtros para casos de prueba
 */
export interface TestCaseFilters {
  projectId?: number;
  module?: TestModule;
  priority?: TestPriority;
  status?: TestStatus;
  assignedTo?: string;
  search?: string;
  tags?: string[];
}

/**
 * Filtros para ejecuciones
 */
export interface TestExecutionFilters {
  projectId?: number;
  testCaseId?: string;
  module?: TestModule;
  result?: TestResult;
  executedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  includeRetries?: boolean;
}

/**
 * Configuración del sistema de pruebas
 */
export interface TestConfig {
  version: string;
  lastUpdate: string;
  matrixVersion: string; // Versión de la matriz Excel
  defaultAssignee: string;
  retryLimit: number;
  evidenceMaxSize: number; // MB
  allowedEvidenceTypes: string[];
}

/**
 * Datos de la matriz de pruebas (import desde Excel)
 */
export interface MatrixImportData {
  testCases: TestCase[];
  version: string;
  importedAt: string;
  sourceFile: string;
}

/**
 * Proyecto de pruebas
 */
export interface TestProject {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  caseCount?: number;
}
