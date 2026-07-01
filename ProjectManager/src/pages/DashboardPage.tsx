import React, { useEffect, useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { apiService } from '../services/apiService';
import type { MvpPriority, ProjectSection, Task } from '../types/project.types';
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  CalendarDays,
  Star
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  isDelayed?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, isDelayed }) => {
  return (
    <div className={`card flex items-center gap-4.5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md ${isDelayed ? 'border-red-300 ring-2 ring-red-50' : ''}`}>
      <div 
        className="h-[72px] w-[72px] rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: `${color}15`,
          color: color,
        }}
      >
        {icon}
      </div>
      <div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{title}</span>
        <h3 className="text-2xl font-extrabold mt-1 text-slate-800" style={{ color: color }}>
          {value}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const { currentProjectId, summary, refreshData, loading } = useProject();
  const [mvpPriorities, setMvpPriorities] = useState<MvpPriority[]>([]);
  const [sections, setSections] = useState<ProjectSection[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  const fetchMvp = async () => {
    try {
      const data = await apiService.getMvpPriorities(currentProjectId);
      setMvpPriorities(data);
    } catch (err) {
      console.error('Error fetching MVP priorities:', err);
    }
  };

  const fetchSections = async () => {
    try {
      const data = await apiService.getSections(currentProjectId);
      setSections(data);
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const data = await apiService.getTasks(currentProjectId);
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  useEffect(() => {
    if (currentProjectId) {
      fetchMvp();
      fetchSections();
      fetchTasks();
    }
  }, [currentProjectId]);

  const handleToggleMvp = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus.toLowerCase() === 'completado' ? 'Pendiente' : 'Completado';
    setLocalLoading(true);
    try {
      await apiService.updateMvpPriority(id, nextStatus);
      // Actualizar estado local
      setMvpPriorities(prev => prev.map(m => m.id === id ? { ...m, status: nextStatus } : m));
      // Actualizar estadísticas globales
      await refreshData();
    } catch (err) {
      alert('Error al actualizar prioridad MVP.');
    } finally {
      setLocalLoading(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  // Preparar datos para Recharts
  const chartData = sections.map(sec => ({
    name: sec.name,
    weight: (sec.weight || 0) * 100,
    progress: (sec.progress || 0) * 100,
    weightStr: `${((sec.weight || 0) * 100).toFixed(0)}%`,
    progressStr: `${((sec.progress || 0) * 100).toFixed(0)}%`
  }));

  const SECTION_COLORS = [
    '#3b82f6', '#6366f1', '#10b981', '#a855f7', '#d946ef', '#ec4899', 
    '#f43f5e', '#f59e0b', '#eab308', '#14b8a6', '#06b6d4', '#f97316', 
    '#84cc16', '#8b5cf6'
  ];

  const pieData = sections.map((sec, index) => {
    const count = tasks.filter(t => t.section === sec.name).length;
    return {
      name: sec.name,
      value: count,
      color: SECTION_COLORS[index % SECTION_COLORS.length]
    };
  }).filter(item => item.value > 0);

  const assignedCount = pieData.reduce((acc, curr) => acc + curr.value, 0);
  const unassignedCount = tasks.length - assignedCount;
  if (unassignedCount > 0) {
    pieData.push({ name: 'Sin Asignar', value: unassignedCount, color: '#94a3b8' });
  }

   const statusPieData = summary ? [
    { name: 'Completadas', value: summary.completedTasks, color: '#00c875' },
    { name: 'Falla Menor', value: summary.progressTasks, color: '#fdab3d' },
    { name: 'Pendientes', value: summary.pendingTasks, color: '#c4c4c4' },
    { name: 'Hitos', value: summary.milestoneTasks, color: '#579bfc' },
    { name: 'Canceladas', value: summary.cancelTasks, color: '#e2445c' }
  ].filter(item => item.value > 0) : [];

  /* Modificado 24/Jun/2026 - evazquez */
  /*const statusPieData = summary ? [
    { name: 'Completadas', value: summary.completedTasks, color: '#00c875' },
    { name: 'En Progreso', value: summary.progressTasks, color: '#fdab3d' },
    { name: 'Pendientes', value: summary.pendingTasks, color: '#c4c4c4' },
    { name: 'Hitos', value: summary.milestoneTasks, color: '#579bfc' },
    { name: 'Canceladas', value: summary.cancelTasks, color: '#e2445c' }
  ].filter(item => item.value > 0) : [];*/

  const isDelayed = summary ? summary.daysRemaining < 0 : false;
  return (
    <div className="page-container space-y-8 p-6">
      
      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Avance General"
          value={summary ? `${(summary.totalProgress * 100).toFixed(1)}%` : '0.0%'}
          subtitle="Avance ponderado total"
          icon={<TrendingUp className="h-7 w-7" />}
          color="#6366f1"
        />
        <StatCard
          title="Avance MVP"
          value={summary ? `${(summary.mvpProgress * 100).toFixed(0)}%` : '0%'}
          subtitle="Prioridades críticas cumplidas"
          icon={<CheckCircle2 className="h-7 w-7" />}
          color="#10b981"
        />
        <StatCard
          title="Tiempo Transcurrido"
          value={summary ? `${summary.daysElapsed}` : '0'}
          subtitle={summary?.startDate
            ? `Días desde inicio (${summary.startDate.split('-').reverse().join('/')})`
            : 'Días desde inicio del proyecto'
          }
          icon={<Clock className="h-7 w-7" />}
          color="#f59e0b"
        />
        <StatCard
          title={isDelayed ? 'Retraso de Entrega' : 'Días Restantes'}
          value={summary ? `${Math.abs(summary.daysRemaining)}` : '0'}
          subtitle={isDelayed ? 'Días vencidos del plan original' : 'Días al plan estimado'}
          icon={isDelayed ? <AlertTriangle className="h-7 w-7" /> : <CalendarDays className="h-7 w-7" />}
          color={isDelayed ? '#ef4444' : '#3b82f6'}
          isDelayed={isDelayed}
        />
      </div>

      {/* MID SECTION: CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART 1: COMPONENT PROGRESS */}
        <div className="card space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Avance por Sección</h3>
            <p className="text-xs text-slate-500 mt-0.5">Progreso real ponderado vs peso asignado en el plan</p>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="name" type="category" stroke="#64748b" width={140} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any, name: string) => [`${parseFloat(value).toFixed(0)}%`, name === 'progress' ? 'Avance' : 'Peso Sección']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '10px', color: '#1e293b' }}
                />
                <Bar dataKey="progress" fill="#4a90e2" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.progress >= 100 ? '#10b981' : '#4a90e2'} />
                  ))}
                </Bar>
                <Bar dataKey="weight" fill="#6366f1" opacity={0.25} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: TASK STATUS DONUT CHART */}
        <div className="card space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Distribución por Sección</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cantidad de tareas asignadas a cada sección</p>
          </div>
          
          <div className="h-[320px] w-full flex flex-col sm:flex-row items-center justify-around gap-6">
            <div className="h-[220px] w-[220px] relative flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} tareas`]}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-slate-800">{summary?.totalTasks || 0}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tareas</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="space-y-3 flex-1 min-w-[150px] w-full sm:w-auto">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="font-semibold text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-800">
                    {item.value} <span className="text-[10px] text-slate-400 font-normal">({tasks.length > 0 ? `${((item.value / tasks.length) * 100).toFixed(0)}%` : '0%'})</span>
                  </span>
                </div>
              ))}
              {pieData.length === 0 && (
                <div className="text-center text-xs text-slate-400">
                  No hay tareas registradas.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CHART 3: TASK STATUS DONUT CHART */}
        <div className="card space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Estado de Tareas</h3>
            <p className="text-xs text-slate-500 mt-0.5">Distribución porcentual por estatus</p>
          </div>
          
          <div className="h-[320px] w-full flex flex-col sm:flex-row items-center justify-around gap-6">
            <div className="h-[220px] w-[220px] relative flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} tareas`]}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-slate-800">{summary?.totalTasks || 0}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tareas</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="space-y-3 flex-1 min-w-[150px] w-full sm:w-auto">
              {statusPieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="font-semibold text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-800">
                    {item.value} <span className="text-[10px] text-slate-400 font-normal">({summary && summary.totalTasks > 0 ? `${((item.value / summary.totalTasks) * 100).toFixed(0)}%` : '0%'})</span>
                  </span>
                </div>
              ))}
              {statusPieData.length === 0 && (
                <div className="text-center text-xs text-slate-400">
                  No hay tareas registradas.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* LOWER SECTION: MVP DELIVERABLES */}
      <div className="card space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Lista de Prioridades MVP (Mínimo Producto Viable)</h3>
          <p className="text-xs text-slate-500 mt-0.5">Control interactivo de hitos obligatorios para la entrega base</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">Check</th>
                <th className="py-3 px-4 w-32">Prioridad</th>
                <th className="py-3 px-4">Funcionalidad Entregable</th>
                <th className="py-3 px-4 w-32 text-center">Criticidad</th>
                <th className="py-3 px-4 w-36 text-center">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {mvpPriorities.map((item) => {
                const isCompleted = item.status.toLowerCase() === 'completado';
                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-slate-50 transition-colors ${
                      isCompleted ? 'text-slate-400 bg-slate-50/50' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <input 
                        type="checkbox"
                        checked={isCompleted}
                        disabled={localLoading}
                        onChange={() => handleToggleMvp(item.id, item.status)}
                        className="h-4.5 w-4.5 text-indigo-600 rounded bg-white border-slate-300 focus:ring-indigo-500 focus:ring-offset-white cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`badge ${
                        item.priority.toLowerCase() === 'crítico' 
                          ? 'badge-error' 
                          : 'badge-warning'
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 font-semibold ${isCompleted ? 'line-through' : 'text-slate-800'}`}>
                      {item.functionality}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex justify-center text-amber-500 gap-0.5">
                        {item.criticity.split('').map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`badge ${isCompleted ? 'badge-success' : 'badge-neutral'}`}>
                        {isCompleted ? 'Completado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {mvpPriorities.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 font-semibold">
                    No se han registrado entregables MVP para este proyecto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

