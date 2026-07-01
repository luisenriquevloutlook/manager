export interface Project {
  id: number;
  name: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectSection {
  id: number;
  project_id: number;
  name: string;
  order_index: number;
  weight?: number;
  progress?: number;
}

export interface ComponentProgress {
  id: number;
  project_id: number;
  name: string;
  weight: number;      // decimal (e.g. 0.25)
  progress: number;    // decimal (e.g. 0.35)
}

export interface Task {
  id: number;
  project_id: number;
  section: string;
  description: string;
  status: 'Completado' | 'En Progreso' | 'Pendiente' | 'Hito' | 'CANCELADO';
  tag: string | null;
  original_estimated_date: string | null; // YYYY-MM-DD
  real_date: string | null;               // YYYY-MM-DD
  days: number | null;
  estimated_date: string | null;          // YYYY-MM-DD (Fecha Reprogramada)
  order_index?: number;                   // Posición en la lista (para reorden)
}

export interface MvpPriority {
  id: number;
  project_id: number;
  priority: string;
  functionality: string;
  criticity: string;
  status: 'Completado' | 'Pendiente' | 'En Progreso';
}

export interface TimelineLog {
  id: number;
  project_id: number;
  date: string;         // YYYY-MM-DD
  component: string;
  task_description: string;
  percentage_logrado: number;
  notes: string | null;
}

export interface DashboardSummary {
  totalTasks: number;
  completedTasks: number;
  progressTasks: number;
  pendingTasks: number;
  cancelTasks: number;
  milestoneTasks: number;
  totalProgress: number; // decimal (0.0 to 1.0)
  mvpProgress: number;   // decimal (0.0 to 1.0)
  daysElapsed: number;
  daysRemaining: number;
  startDate: string;
  endDate: string;
}
