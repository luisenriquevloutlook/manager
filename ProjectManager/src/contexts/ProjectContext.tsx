import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import type { Project, ComponentProgress, DashboardSummary } from '../types/project.types';

interface ProjectContextType {
  projects: Project[];
  currentProjectId: number;
  currentProject: Project | null;
  summary: DashboardSummary | null;
  components: ComponentProgress[];
  loading: boolean;
  refreshData: () => Promise<void>;
  changeProject: (id: number) => void;
  addProject: (name: string, description: string) => Promise<void>;
  removeProject: (id: number) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number>(() => {
    const saved = localStorage.getItem('projectmanager_current_project_id');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [components, setComponents] = useState<ComponentProgress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch projects
      const projs = await apiService.getProjects();
      setProjects(projs);

      // Find current project
      let activeProj = projs.find(p => p.id === currentProjectId);
      if (!activeProj && projs.length > 0) {
        // Fallback to first project
        activeProj = projs[0];
        setCurrentProjectId(activeProj.id);
        localStorage.setItem('projectmanager_current_project_id', activeProj.id.toString());
      }
      setCurrentProject(activeProj || null);

      if (activeProj) {
        const [sum, comps] = await Promise.all([
          apiService.getDashboardSummary(activeProj.id),
          apiService.getComponents(activeProj.id)
        ]);
        setSummary(sum);
        setComponents(comps);
      } else {
        setSummary(null);
        setComponents([]);
      }
    } catch (error) {
      console.error('Error refreshing project context:', error);
    } finally {
      setLoading(false);
    }
  }, [currentProjectId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const changeProject = (id: number) => {
    setCurrentProjectId(id);
    localStorage.setItem('projectmanager_current_project_id', id.toString());
  };

  const addProject = async (name: string, description: string) => {
    setLoading(true);
    try {
      const newProj = await apiService.createProject(name, description);
      setProjects(prev => [newProj, ...prev]);
      changeProject(newProj.id);
    } catch (error) {
      console.error('Error adding project:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeProject = async (id: number) => {
    setLoading(true);
    try {
      const success = await apiService.deleteProject(id);
      if (success) {
        const remaining = projects.filter(p => p.id !== id);
        setProjects(remaining);
        if (currentProjectId === id) {
          const nextId = remaining.length > 0 ? remaining[0].id : 1;
          changeProject(nextId);
        } else {
          await refreshData();
        }
      }
    } catch (error) {
      console.error('Error removing project:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProjectId,
      currentProject,
      summary,
      components,
      loading,
      refreshData,
      changeProject,
      addProject,
      removeProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
