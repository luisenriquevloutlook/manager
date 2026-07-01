import type { 
  TestCase, 
  TestExecution, 
  TestCaseFilters,
  TestExecutionFilters,
  TestStatistics
} from '../types/test.types';
import { apiService } from './apiService';

/**
 * Servicio para gestión de casos de prueba
 */
class TestCaseService {
  private testCases: TestCase[] = [];

  /**
   * Cargar casos de prueba desde el backend
   */
  async loadTestCases(projectId?: number): Promise<TestCase[]> {
    try {
      const data = await apiService.getAllTestCases(projectId ? { projectId } : undefined);
      this.testCases = data;
      return this.testCases;
    } catch (error) {
      console.error('Error loading test cases from backend:', error);
      this.testCases = [];
      return this.testCases;
    }
  }

  /**
   * Guardar casos de prueba (Legacy/Fallback, no hace nada)
   */
  async saveTestCases(testCases: TestCase[]): Promise<void> {
    this.testCases = testCases;
    // Ya no se requiere almacenar en localStorage
  }

  /**
   * Obtener todos los casos de prueba filtrados
   */
  async getAllTestCases(filters?: TestCaseFilters): Promise<TestCase[]> {
    try {
      const data = await apiService.getAllTestCases(filters);
      this.testCases = data;
      return this.testCases;
    } catch (error) {
      console.error('Error in getAllTestCases:', error);
      // Fallback al caché en memoria en caso de error de red
      return this.testCases;
    }
  }

  /**
   * Obtener un caso de prueba por ID
   */
  async getTestCaseById(id: string): Promise<TestCase | null> {
    try {
      return await apiService.getTestCaseById(id);
    } catch (error) {
      console.error('Error in getTestCaseById:', error);
      return this.testCases.find(tc => tc.id === id) || null;
    }
  }

  /**
   * Crear nuevo caso de prueba
   */
  async createTestCase(testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestCase> {
    try {
      const newTestCase = await apiService.createTestCase(testCase);
      this.testCases.push(newTestCase);
      console.log('Test case created in backend:', newTestCase.code);
      return newTestCase;
    } catch (error) {
      console.error('Error creating test case:', error);
      throw error;
    }
  }

  /**
   * Actualizar caso de prueba
   */
  async updateTestCase(id: string, updates: Partial<TestCase>): Promise<TestCase | null> {
    try {
      const updated = await apiService.updateTestCase(id, updates);
      if (updated) {
        const index = this.testCases.findIndex(tc => tc.id === id);
        if (index !== -1) {
          this.testCases[index] = updated;
        }
        console.log('Test case updated in backend:', updated.code);
      }
      return updated;
    } catch (error) {
      console.error(`Error updating test case with id ${id}:`, error);
      return null;
    }
  }

  /**
   * Eliminar caso de prueba
   */
  async deleteTestCase(id: string): Promise<boolean> {
    try {
      const success = await apiService.deleteTestCase(id);
      if (success) {
        this.testCases = this.testCases.filter(tc => tc.id !== id);
        console.log('Test case deleted successfully in backend');
      }
      return success;
    } catch (error) {
      console.error(`Error deleting test case with id ${id}:`, error);
      return false;
    }
  }
}

/**
 * Servicio para gestión de ejecuciones de prueba
 */
class TestExecutionService {
  private executions: TestExecution[] = [];

  /**
   * Cargar ejecuciones desde el backend
   */
  async loadExecutions(projectId?: number): Promise<TestExecution[]> {
    try {
      const data = await apiService.getAllExecutions(projectId ? { projectId } : undefined);
      this.executions = data;
      return this.executions;
    } catch (error) {
      console.error('Error loading executions from backend:', error);
      this.executions = [];
      return this.executions;
    }
  }

  /**
   * Guardar ejecuciones (Legacy/Fallback, no hace nada)
   */
  async saveExecutions(): Promise<void> {
    // Ya no se requiere almacenar en localStorage
  }

  /**
   * Obtener todas las ejecuciones
   */
  async getAllExecutions(filters?: TestExecutionFilters): Promise<TestExecution[]> {
    try {
      const data = await apiService.getAllExecutions(filters);
      this.executions = data;
      return this.executions;
    } catch (error) {
      console.error('Error in getAllExecutions:', error);
      return this.executions;
    }
  }

  /**
   * Obtener ejecuciones de un caso de prueba
   */
  async getExecutionsByTestCase(testCaseId: string): Promise<TestExecution[]> {
    try {
      return await apiService.getAllExecutions({ testCaseId });
    } catch (error) {
      console.error(`Error in getExecutionsByTestCase for case ${testCaseId}:`, error);
      return this.executions.filter(e => e.testCaseId === testCaseId);
    }
  }

  /**
   * Crear nueva ejecución de prueba
   */
  async createExecution(execution: Omit<TestExecution, 'id'>): Promise<TestExecution> {
    try {
      const newExecution = await apiService.createExecution(execution);
      this.executions.push(newExecution);
      console.log('Execution recorded in backend:', newExecution.id);
      return newExecution;
    } catch (error) {
      console.error('Error creating execution:', error);
      throw error;
    }
  }

  /**
   * Actualizar ejecución (Fallback local)
   */
  async updateExecution(id: string, updates: Partial<TestExecution>): Promise<TestExecution | null> {
    const index = this.executions.findIndex(e => e.id === id);
    if (index === -1) return null;

    this.executions[index] = {
      ...this.executions[index],
      ...updates,
    };
    return this.executions[index];
  }

  /**
   * Eliminar ejecuciones más viejas que X días
   */
  async deleteOldExecutions(daysOld: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffISO = cutoffDate.toISOString();

      const toDelete = this.executions.filter(e => e.executedAt < cutoffISO);
      let deletedCount = 0;

      for (const exec of toDelete) {
        const success = await apiService.deleteExecution(exec.id);
        if (success) {
          deletedCount++;
        }
      }

      await this.loadExecutions();
      return deletedCount;
    } catch (error) {
      console.error('Error deleting old executions:', error);
      return 0;
    }
  }

  /**
   * Obtener estadísticas de almacenamiento
   */
  getStorageStats(): {
    totalExecutions: number;
    totalEvidences: number;
    estimatedSizeKB: number;
    oldestExecution: string | null;
    newestExecution: string | null;
  } {
    if (this.executions.length === 0) {
      return {
        totalExecutions: 0,
        totalEvidences: 0,
        estimatedSizeKB: 0,
        oldestExecution: null,
        newestExecution: null,
      };
    }

    const totalEvidences = this.executions.reduce((sum, exec) => sum + (exec.evidences?.length || 0), 0);
    
    let estimatedSizeKB = 0;
    this.executions.forEach(exec => {
      exec.evidences?.forEach(ev => {
        if (ev.dataUrl) {
          estimatedSizeKB += ev.dataUrl.length / 1024;
        }
      });
    });

    const sorted = [...this.executions].sort((a, b) => 
      new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime()
    );

    return {
      totalExecutions: this.executions.length,
      totalEvidences,
      estimatedSizeKB,
      oldestExecution: sorted[0]?.executedAt || null,
      newestExecution: sorted[sorted.length - 1]?.executedAt || null,
    };
  }
}

/**
 * Servicio para cálculo y obtención de estadísticas
 */
class StatisticsService {
  private cache: {
    [projectId: number]: {
      data: TestStatistics;
      timestamp: number;
    }
  } = {};

  /**
   * Obtiene estadísticas optimizadas desde el backend con caché de 5 minutos
   */
  async getStatistics(projectId: number, forceRefresh = false): Promise<TestStatistics> {
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    const now = Date.now();
    
    if (!forceRefresh && this.cache[projectId] && (now - this.cache[projectId].timestamp < CACHE_DURATION)) {
      console.log('Obteniendo estadísticas desde caché para proyecto:', projectId);
      return this.cache[projectId].data;
    }

    try {
      const stats = await apiService.getStatisticsSummary(projectId);
      this.cache[projectId] = {
        data: stats,
        timestamp: now
      };
      return stats;
    } catch (error) {
      console.error('Error fetching statistics from backend:', error);
      throw error;
    }
  }

  /**
   * Invalida el caché de estadísticas para un proyecto específico
   */
  invalidateCache(projectId: number) {
    if (this.cache[projectId]) {
      delete this.cache[projectId];
      console.log('Caché de estadísticas invalidado para proyecto:', projectId);
    }
  }

  /**
   * Mantiene compatibilidad con la firma anterior calculando o trayendo estadísticas
   */
  async calculateStatistics(
    _testCases: TestCase[],
    _executions: TestExecution[],
    projectId = 1
  ): Promise<TestStatistics> {
    return this.getStatistics(projectId);
  }
}

// Exportar instancias únicas (singleton)
export const testCaseService = new TestCaseService();
export const executionService = new TestExecutionService();
export const statisticsService = new StatisticsService();
