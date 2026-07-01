import axios from 'axios';
import type { TestCase, TestCaseFilters, TestExecution, TestExecutionFilters, TestProject, TestStatistics } from '../types/test.types';

// Base URL para el backend Express
const API_URL = 'http://localhost:3030/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Servicio de llamadas HTTP para interactuar con el Backend Express
 */
export const apiService = {
  /**
   * Sube un archivo de evidencia (imagen) al servidor backend
   * @param file Archivo a subir
   * @returns Promesa con la URL relativa del archivo y el nombre asignado en disco
   */
  async uploadEvidence(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_URL}/evidences/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data && response.data.success) {
      return {
        url: response.data.url, // Ejemplo: /evidences/evidence-123456.png
        filename: response.data.filename
      };
    }
    
    throw new Error(response.data?.error || 'Error al subir la evidencia.');
  },

  /**
   * Elimina un archivo de evidencia física del servidor backend
   * @param filename Nombre del archivo en el disco
   * @returns Verdadero si se eliminó con éxito
   */
  async deleteEvidence(filename: string): Promise<boolean> {
    const response = await api.delete(`/evidences/${filename}`);
    return response.data && response.data.success;
  },

  // ==========================================
  // METODOS CRUD - CASOS DE PRUEBA
  // ==========================================

  /**
   * Obtiene todos los casos de prueba filtrados del servidor
   */
  async getAllTestCases(filters?: TestCaseFilters): Promise<TestCase[]> {
    const response = await api.get('/test-cases', { params: filters });
    return response.data;
  },

  /**
   * Obtiene un caso de prueba individual por ID
   */
  async getTestCaseById(id: string): Promise<TestCase> {
    const response = await api.get(`/test-cases/${id}`);
    return response.data;
  },

  /**
   * Crea un nuevo caso de prueba en la base de datos
   */
  async createTestCase(testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestCase> {
    const response = await api.post('/test-cases', testCase);
    return response.data;
  },

  /**
   * Actualiza un caso de prueba existente en la base de datos
   */
  async updateTestCase(id: string, updates: Partial<TestCase>): Promise<TestCase> {
    const response = await api.put(`/test-cases/${id}`, updates);
    return response.data;
  },

  /**
   * Elimina un caso de prueba de la base de datos
   */
  async deleteTestCase(id: string): Promise<boolean> {
    const response = await api.delete(`/test-cases/${id}`);
    return response.data && response.data.success;
  },

  // ==========================================
  // METODOS CRUD - EJECUCIONES DE PRUEBA
  // ==========================================

  /**
   * Obtiene todas las ejecuciones de prueba filtradas del servidor
   */
  async getAllExecutions(filters?: TestExecutionFilters): Promise<TestExecution[]> {
    const response = await api.get('/executions', { params: filters });
    return response.data;
  },

  /**
   * Registra una nueva ejecución de prueba con sus evidencias en el servidor
   */
  async createExecution(execution: Omit<TestExecution, 'id'>): Promise<TestExecution> {
    const response = await api.post('/executions', execution);
    return response.data;
  },

  /**
   * Elimina una ejecución de prueba y sus archivos de evidencias del servidor
   */
  async deleteExecution(id: string): Promise<boolean> {
    const response = await api.delete(`/executions/${id}`);
    return response.data && response.data.success;
  },

  // ==========================================
  // METODOS ESTADISTICAS Y PROYECTOS (Fases 4 y 5)
  // ==========================================

  /**
   * Obtiene el resumen de estadísticas de un proyecto desde el backend
   */
  async getStatisticsSummary(projectId: number): Promise<TestStatistics> {
    const response = await api.get('/statistics/summary', { params: { projectId } });
    return response.data;
  },

  /**
   * Obtiene la lista de proyectos desde el backend
   */
  async getProjects(): Promise<TestProject[]> {
    const response = await api.get('/projects');
    return response.data;
  },

  /**
   * Crea un nuevo proyecto en la base de datos
   */
  async createProject(project: Omit<TestProject, 'id'>): Promise<TestProject> {
    const response = await api.post('/projects', project);
    return response.data;
  },

  /**
   * Elimina un proyecto y todos sus datos relacionados del servidor
   */
  async deleteProject(id: number): Promise<boolean> {
    const response = await api.delete(`/projects/${id}`);
    return response.data && response.data.success;
  },

  // ==========================================
  // METODOS - MÓDULOS POR PROYECTO
  // ==========================================

  /**
   * Obtiene la lista de módulos de un proyecto desde el backend
   */
  async getProjectModules(projectId: number): Promise<string[]> {
    const response = await api.get(`/projects/${projectId}/modules`);
    return response.data;
  },

  /**
   * Agrega un nuevo módulo a un proyecto
   */
  async addProjectModule(projectId: number, name: string): Promise<{ name: string }> {
    const response = await api.post(`/projects/${projectId}/modules`, { name });
    return response.data;
  },

  /**
   * Renombra un módulo de un proyecto (y actualiza en cascada los casos de prueba)
   */
  async updateProjectModule(projectId: number, oldName: string, newName: string): Promise<{ oldName: string; name: string }> {
    const response = await api.put(`/projects/${projectId}/modules/${encodeURIComponent(oldName)}`, { name: newName });
    return response.data;
  },

  /**
   * Elimina un módulo de un proyecto
   */
  async deleteProjectModule(projectId: number, name: string): Promise<boolean> {
    const response = await api.delete(`/projects/${projectId}/modules/${encodeURIComponent(name)}`);
    return response.data && response.data.success;
  },

  // ==========================================
  // METODOS - CONFIGURACIÓN POR PROYECTO
  // ==========================================

  /**
   * Obtiene la configuración (defaultTester, matrixVersion) de un proyecto
   */
  async getProjectConfig(projectId: number): Promise<{ defaultTester: string; matrixVersion: string }> {
    const response = await api.get(`/projects/${projectId}/config`);
    return response.data;
  },

  /**
   * Actualiza la configuración de un proyecto
   */
  async updateProjectConfig(projectId: number, config: { defaultTester?: string; matrixVersion?: string }): Promise<{ defaultTester: string; matrixVersion: string }> {
    const response = await api.put(`/projects/${projectId}/config`, config);
    return response.data;
  },
};
