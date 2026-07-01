import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { TestCase, TestExecution, TestStatistics, TestProject } from '../types/test.types';
import { testCaseService, executionService, statisticsService } from '../services/testService';
import { apiService } from '../services/apiService';

interface ProjectConfig {
  defaultTester: string;
  matrixVersion: string;
}

interface TestContextType {
  testCases: TestCase[];
  executions: TestExecution[];
  statistics: TestStatistics | null;
  projects: TestProject[];
  currentProjectId: number;
  loading: boolean;
  modules: string[];
  projectConfig: ProjectConfig;
  refreshData: (forceStatsRefresh?: boolean) => Promise<void>;
  changeProject: (projectId: number) => Promise<void>;
  addProject: (name: string, description?: string) => Promise<TestProject>;
  deleteProject: (id: number) => Promise<boolean>;
  addModule: (name: string) => Promise<void>;
  updateModule: (oldName: string, newName: string) => Promise<void>;
  deleteModule: (name: string) => Promise<void>;
  updateConfig: (config: Partial<ProjectConfig>) => Promise<void>;
  addTestCase: (testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'projectId'>) => Promise<TestCase>;
  updateTestCase: (id: string, updates: Partial<TestCase>) => Promise<TestCase | null>;
  deleteTestCase: (id: string) => Promise<boolean>;
  addExecution: (execution: Omit<TestExecution, 'id' | 'projectId'>) => Promise<TestExecution>;
  getTestCaseExecutions: (testCaseId: string) => TestExecution[];
}

const TestContext = createContext<TestContextType | undefined>(undefined);

export function TestProvider({ children }: { children: ReactNode }) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [statistics, setStatistics] = useState<TestStatistics | null>(null);
  const [projects, setProjects] = useState<TestProject[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({ defaultTester: '', matrixVersion: '1.1' });
  const [currentProjectId, setCurrentProjectId] = useState<number>(() => {
    const saved = localStorage.getItem('testmanager_current_project_id');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [loading, setLoading] = useState(true);

  // Cargar proyectos iniciales
  const loadProjects = async () => {
    try {
      const projList = await apiService.getProjects();
      setProjects(projList);
      
      // Validar si el proyecto activo existe en la lista
      if (projList.length > 0 && !projList.some(p => p.id === currentProjectId)) {
        const defaultId = projList[0].id;
        setCurrentProjectId(defaultId);
        localStorage.setItem('testmanager_current_project_id', defaultId.toString());
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const refreshData = async (forceStatsRefresh = false) => {
    setLoading(true);
    try {
      // 1. Cargar proyectos
      await loadProjects();

      // 2. Cargar casos y ejecuciones del proyecto activo
      const [cases, execs] = await Promise.all([
        testCaseService.loadTestCases(currentProjectId),
        executionService.loadExecutions(currentProjectId),
      ]);

      // Sincronizar estado de casos con sus ejecuciones más recientes
      const syncedCases = await syncTestCaseStatuses(cases, execs);

      setTestCases(syncedCases);
      setExecutions(execs);

      // 3. Obtener estadísticas del backend
      const stats = await statisticsService.getStatistics(currentProjectId, forceStatsRefresh);
      setStatistics(stats);

      // 4. Cargar módulos y configuración del proyecto desde MySQL
      const [mods, cfg] = await Promise.all([
        apiService.getProjectModules(currentProjectId),
        apiService.getProjectConfig(currentProjectId),
      ]);
      setModules(mods);
      setProjectConfig(cfg);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar estados de casos basado en sus ejecuciones (corrección retroactiva)
  const syncTestCaseStatuses = async (
    cases: TestCase[],
    execs: TestExecution[]
  ): Promise<TestCase[]> => {
    const updates: TestCase[] = [];

    for (const tc of cases) {
      // Obtener última ejecución del caso
      const tcExecs = execs
        .filter(e => e.testCaseId === tc.id)
        .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());

      if (tcExecs.length === 0) continue;

      const lastExec = tcExecs[0];
      // El estado del caso ahora coincide directamente con el resultado de la ejecución
      const expectedStatus: TestCase['status'] = lastExec.result as TestCase['status'];

      if (expectedStatus !== tc.status) {
        const updated = await testCaseService.updateTestCase(tc.id, { status: expectedStatus });
        if (updated) updates.push(updated);
      }
    }

    if (updates.length > 0) {
      console.log(`Sincronizados ${updates.length} caso(s) de prueba con sus ejecuciones`);
      statisticsService.invalidateCache(currentProjectId);
      return await testCaseService.loadTestCases(currentProjectId);
    }

    return cases;
  };

  const changeProject = async (projectId: number) => {
    setCurrentProjectId(projectId);
    localStorage.setItem('testmanager_current_project_id', projectId.toString());
  };

  const addProject = async (name: string, description?: string) => {
    const newProj = await apiService.createProject({ name, description });
    await loadProjects();
    setCurrentProjectId(newProj.id);
    localStorage.setItem('testmanager_current_project_id', newProj.id.toString());
    return newProj;
  };

  const deleteProject = async (id: number) => {
    if (id === 1) {
      alert('No se puede eliminar el proyecto por defecto.');
      return false;
    }
    const success = await apiService.deleteProject(id);
    if (success) {
      await loadProjects();
      // Si eliminamos el proyecto activo, cambiar al default (1)
      if (currentProjectId === id) {
        setCurrentProjectId(1);
        localStorage.setItem('testmanager_current_project_id', '1');
      }
    }
    return success;
  };

  // ---- Gestión de módulos por proyecto ----

  const addModule = async (name: string) => {
    await apiService.addProjectModule(currentProjectId, name);
    const mods = await apiService.getProjectModules(currentProjectId);
    setModules(mods);
  };

  const updateModule = async (oldName: string, newName: string) => {
    await apiService.updateProjectModule(currentProjectId, oldName, newName);
    const [mods, cases] = await Promise.all([
      apiService.getProjectModules(currentProjectId),
      testCaseService.loadTestCases(currentProjectId),
    ]);
    setModules(mods);
    setTestCases(cases);
  };

  const deleteModule = async (name: string) => {
    await apiService.deleteProjectModule(currentProjectId, name);
    const mods = await apiService.getProjectModules(currentProjectId);
    setModules(mods);
  };

  // ---- Gestión de configuración por proyecto ----

  const updateConfig = async (config: Partial<ProjectConfig>) => {
    const updated = await apiService.updateProjectConfig(currentProjectId, config);
    setProjectConfig(updated);
  };

  const addTestCase = async (testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'projectId'>) => {
    const newCase = await testCaseService.createTestCase({
      ...testCase,
      projectId: currentProjectId
    });
    statisticsService.invalidateCache(currentProjectId);
    await refreshData(true);
    return newCase;
  };

  const updateTestCase = async (id: string, updates: Partial<TestCase>) => {
    const updated = await testCaseService.updateTestCase(id, updates);
    statisticsService.invalidateCache(currentProjectId);
    await refreshData(true);
    return updated;
  };

  const deleteTestCase = async (id: string) => {
    const deleted = await testCaseService.deleteTestCase(id);
    if (deleted) {
      statisticsService.invalidateCache(currentProjectId);
      await refreshData(true);
    }
    return deleted;
  };

  const addExecution = async (execution: Omit<TestExecution, 'id' | 'projectId'>) => {
    const newExecution = await executionService.createExecution({
      ...execution,
      projectId: currentProjectId
    });
    
    // Actualizar estado del test case basado en el resultado de la ejecución
    const testCase = testCases.find(tc => tc.id === execution.testCaseId);
    if (testCase) {
      const newStatus: TestCase['status'] = execution.result as TestCase['status'];
      if (newStatus !== testCase.status) {
        await testCaseService.updateTestCase(testCase.id, { status: newStatus });
      }
    }
    
    statisticsService.invalidateCache(currentProjectId);
    await refreshData(true);
    return newExecution;
  };

  const getTestCaseExecutions = (testCaseId: string) => {
    return executions.filter(e => e.testCaseId === testCaseId)
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
  };

  // Recargar datos cuando cambia el proyecto activo
  useEffect(() => {
    refreshData();
  }, [currentProjectId]);

  return (
    <TestContext.Provider
      value={{
        testCases,
        executions,
        statistics,
        projects,
        currentProjectId,
        loading,
        modules,
        projectConfig,
        refreshData,
        changeProject,
        addProject,
        deleteProject,
        addModule,
        updateModule,
        deleteModule,
        updateConfig,
        addTestCase,
        updateTestCase,
        deleteTestCase,
        addExecution,
        getTestCaseExecutions,
      }}
    >
      {children}
    </TestContext.Provider>
  );
}

export function useTest() {
  const context = useContext(TestContext);
  if (!context) {
    throw new Error('useTest must be used within TestProvider');
  }
  return context;
}

