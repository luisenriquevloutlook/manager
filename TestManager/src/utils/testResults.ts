/**
 * Utilidades para resultados de pruebas y severidad de defectos
 */

import type { TestResult, DefectSeverity } from '../types/test.types';

/**
 * Configuración de resultados de pruebas según la Leyenda de Estados
 */
export const TEST_RESULTS: Record<TestResult, { icon: string; label: string; color: string; bgColor: string }> = {
  APROBADO: {
    icon: '✓',
    label: 'Aprobado',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)'
  },
  FALLA_CRITICA: {
    icon: '✗',
    label: 'Falla crítica',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)'
  },
  FALLA_MENOR: {
    icon: '△',
    label: 'Falla menor / Advertencia',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)'
  },
  EN_PROCESO: {
    icon: '⚙',
    label: 'En proceso',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)'
  },
  PENDIENTE: {
    icon: '○',
    label: 'Pendiente',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)'
  },
  NO_APLICA: {
    icon: '⊘',
    label: 'No aplica',
    color: '#9ca3af',
    bgColor: 'rgba(156, 163, 175, 0.1)'
  },
  ACTUALIZAR: {
    icon: '📝',
    label: 'Requiere actualización',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)'
  }
};

/**
 * Configuración de severidad de defectos
 */
export const DEFECT_SEVERITY: Record<DefectSeverity, { icon: string; label: string; description: string; color: string; bgColor: string }> = {
  CRITICA: {
    icon: '🔴',
    label: 'Crítica',
    description: 'Bloquea funcionalidad principal',
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.1)'
  },
  ALTA: {
    icon: '🟠',
    label: 'Alta',
    description: 'Afecta funcionalidad importante',
    color: '#ea580c',
    bgColor: 'rgba(234, 88, 12, 0.1)'
  },
  MEDIA: {
    icon: '🟡',
    label: 'Media',
    description: 'Afecta funcionalidad menor',
    color: '#ca8a04',
    bgColor: 'rgba(202, 138, 4, 0.1)'
  },
  BAJA: {
    icon: '🟢',
    label: 'Baja',
    description: 'Cosmético o mejora',
    color: '#16a34a',
    bgColor: 'rgba(22, 163, 74, 0.1)'
  }
};

/**
 * Obtiene el icono de un resultado
 */
export function getResultIcon(result: TestResult): string {
  return TEST_RESULTS[result].icon;
}

/**
 * Obtiene el label de un resultado
 */
export function getResultLabel(result: TestResult): string {
  return TEST_RESULTS[result].label;
}

/**
 * Obtiene el color de un resultado
 */
export function getResultColor(result: TestResult): string {
  return TEST_RESULTS[result].color;
}

/**
 * Obtiene el color de fondo de un resultado
 */
export function getResultBgColor(result: TestResult): string {
  return TEST_RESULTS[result].bgColor;
}

/**
 * Obtiene el icono de severidad
 */
export function getSeverityIcon(severity: DefectSeverity): string {
  return DEFECT_SEVERITY[severity].icon;
}

/**
 * Obtiene el label de severidad
 */
export function getSeverityLabel(severity: DefectSeverity): string {
  return DEFECT_SEVERITY[severity].label;
}

/**
 * Obtiene la descripción de severidad
 */
export function getSeverityDescription(severity: DefectSeverity): string {
  return DEFECT_SEVERITY[severity].description;
}

/**
 * Obtiene el color de severidad
 */
export function getSeverityColor(severity: DefectSeverity): string {
  return DEFECT_SEVERITY[severity].color;
}

/**
 * Determina si un resultado requiere severidad
 */
export function requiresSeverity(result: TestResult): boolean {
  return result === 'FALLA_CRITICA' || result === 'FALLA_MENOR';
}

/**
 * Determina si un resultado requiere mensaje de error
 */
export function requiresErrorMessage(result: TestResult): boolean {
  return result === 'FALLA_CRITICA' || result === 'FALLA_MENOR';
}

/**
 * Determina si un resultado cuenta como "ejecutado"
 */
export function isExecutedResult(result: TestResult): boolean {
  return result !== 'PENDIENTE';
}

/**
 * Determina si un resultado es exitoso
 */
export function isSuccessResult(result: TestResult): boolean {
  return result === 'APROBADO';
}

/**
 * Determina si un resultado es una falla
 */
export function isFailureResult(result: TestResult): boolean {
  return result === 'FALLA_CRITICA' || result === 'FALLA_MENOR';
}
