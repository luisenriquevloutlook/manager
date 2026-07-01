import axios from 'axios';
import type { 
  Project, ProjectSection, ComponentProgress, Task, MvpPriority, TimelineLog, DashboardSummary 
} from '../types/project.types';

// Usar el hostname actual (permite conexiones desde otros dispositivos en la red)
const API_URL = `http://${window.location.hostname}:3040/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Proyectos
  async getProjects(): Promise<Project[]> {
    const response = await api.get('/projects');
    return response.data;
  },

  async createProject(name: string, description: string): Promise<Project> {
    const response = await api.post('/projects', { name, description });
    return response.data;
  },

  async deleteProject(id: number): Promise<boolean> {
    const response = await api.delete(`/projects/${id}`);
    return response.data && response.data.success;
  },

  async updateProjectDates(id: number, start_date: string, end_date: string): Promise<boolean> {
    const response = await api.patch(`/projects/${id}/dates`, { start_date, end_date });
    return response.data && response.data.success;
  },

  // Secciones del proyecto
  async getSections(projectId: number): Promise<ProjectSection[]> {
    const response = await api.get('/sections', { params: { projectId } });
    return response.data;
  },

  async createSection(project_id: number, name: string): Promise<ProjectSection> {
    const response = await api.post('/sections', { project_id, name });
    return response.data;
  },

  async renameSection(id: number, name: string, project_id: number): Promise<boolean> {
    const response = await api.put(`/sections/${id}`, { name, project_id });
    return response.data && response.data.success;
  },

  async deleteSection(id: number): Promise<boolean> {
    const response = await api.delete(`/sections/${id}`);
    return response.data && response.data.success;
  },

  async saveSectionsProgress(sections: { id: number; weight: number; progress: number }[]): Promise<boolean> {
    const response = await api.put('/sections/save-all', { sections });
    return response.data && response.data.success;
  },

  // Dashboard
  async getDashboardSummary(projectId: number): Promise<DashboardSummary> {
    const response = await api.get('/dashboard/summary', { params: { projectId } });
    return response.data;
  },

  // Componentes
  async getComponents(projectId: number): Promise<ComponentProgress[]> {
    const response = await api.get('/components', { params: { projectId } });
    return response.data;
  },

  async updateComponent(id: number, weight: number, progress: number): Promise<boolean> {
    const response = await api.put(`/components/${id}`, { weight, progress });
    return response.data && response.data.success;
  },

  // Tareas
  async getTasks(projectId: number, filters?: { section?: string; status?: string; search?: string }): Promise<Task[]> {
    const response = await api.get('/tasks', { params: { projectId, ...filters } });
    return response.data;
  },

  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    const response = await api.post('/tasks', task);
    return response.data;
  },

  async updateTask(id: number, task: Partial<Task>): Promise<boolean> {
    const response = await api.put(`/tasks/${id}`, task);
    return response.data && response.data.success;
  },

  async deleteTask(id: number): Promise<boolean> {
    const response = await api.delete(`/tasks/${id}`);
    return response.data && response.data.success;
  },

  async reorderTasks(tasks: { id: number; order_index: number; section?: string }[]): Promise<boolean> {
    const response = await api.put('/tasks/reorder', { tasks });
    return response.data && response.data.success;
  },

  // Historial Ejecutivo (Timeline)
  async getTimeline(projectId: number): Promise<TimelineLog[]> {
    const response = await api.get('/timeline', { params: { projectId } });
    return response.data;
  },

  async createTimelineLog(log: Omit<TimelineLog, 'id'>): Promise<TimelineLog> {
    const response = await api.post('/timeline', log);
    return response.data;
  },

  // Prioridades MVP
  async getMvpPriorities(projectId: number): Promise<MvpPriority[]> {
    const response = await api.get('/mvp-priorities', { params: { projectId } });
    return response.data;
  },

  async updateMvpPriority(id: number, status: string): Promise<boolean> {
    const response = await api.put(`/mvp-priorities/${id}`, { status });
    return response.data && response.data.success;
  },

  // PDF Report URL
  getReportPdfUrl(projectId: number): string {
    return `${API_URL}/reports/project/${projectId}/pdf`;
  }
};
