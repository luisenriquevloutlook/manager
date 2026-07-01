import React, { useEffect, useState, useMemo } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { apiService } from '../services/apiService';
import type { Task, ProjectSection } from '../types/project.types';
import { Layers, Activity } from 'lucide-react';

export const GanttPage: React.FC = () => {
  const { currentProjectId, summary } = useProject();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections, setSections] = useState<ProjectSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'components' | 'tasks'>('components');
  const [selectedSection, setSelectedSection] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await apiService.getTasks(currentProjectId);
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks for Gantt:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const data = await apiService.getSections(currentProjectId);
      setSections(data);
    } catch (err) {
      console.error('Error fetching sections for Gantt:', err);
    }
  };

  useEffect(() => {
    if (currentProjectId) {
      fetchTasks();
      fetchSections();
    }
  }, [currentProjectId]);

  const sectionsList = useMemo(() => sections.map(s => s.name), [sections]);

  // Set default selected section when sections load
  useEffect(() => {
    if (sections.length > 0 && !sections.find(s => s.name === selectedSection)) {
      setSelectedSection(sections[0].name);
    }
  }, [sections]);

  // Determinar límites de fechas globales para escalar el diagrama basado en fechas del proyecto
  const timelineBounds = useMemo(() => {
    // Usar fechas reales del proyecto. Añadir 1 mes de padding al inicio y 1 al final
    const projectStart = summary?.startDate || '2025-12-15';
    const projectEnd   = summary?.endDate   || '2026-06-30';

    // Padding: inicio -15 días, fin +15 días para mostrar contexto
    const rawStart = new Date(projectStart);
    rawStart.setDate(rawStart.getDate() - 15);
    const rawEnd = new Date(projectEnd);
    rawEnd.setDate(rawEnd.getDate() + 15);

    const start = rawStart.getTime();
    const end   = rawEnd.getTime();
    return { start, end, totalDays: (end - start) / (1000 * 60 * 60 * 24), projectStart, projectEnd };
  }, [summary?.startDate, summary?.endDate]);

  // Generar meses dinámicamente entre los límites del proyecto
  const months = useMemo(() => {
    const { start, end, totalDays } = timelineBounds;
    const result: { name: string; pctWidth: number }[] = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const startDate = new Date(start);
    // Start from the 1st of the month containing start
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endDate = new Date(end);

    while (cur <= endDate) {
      const monthStart = cur.getTime();
      const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const monthEnd = Math.min(nextMonth.getTime(), endDate.getTime());
      const daysInRange = (monthEnd - monthStart) / (1000 * 60 * 60 * 24);
      const pctWidth = (daysInRange / totalDays) * 100;
      result.push({
        name: `${monthNames[cur.getMonth()]} ${cur.getFullYear()}`,
        pctWidth: parseFloat(pctWidth.toFixed(2))
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return result;
  }, [timelineBounds]);

  // Calcular barras de componentes
  const componentBars = useMemo(() => {
    const bars: { 
      name: string; 
      minEst: string | null; 
      maxEst: string | null; 
      minReal: string | null; 
      maxReal: string | null;
      completion: number;
    }[] = [];

    sectionsList.forEach(sec => {
      const secTasks = tasks.filter(t => t.section === sec && t.status !== 'CANCELADO');
      if (secTasks.length === 0) return;

      let minEstTime = Infinity;
      let maxEstTime = -Infinity;
      let minRealTime = Infinity;
      let maxRealTime = -Infinity;
      let completedCount = 0;

      secTasks.forEach(t => {
        const estDateStr = t.estimated_date || t.original_estimated_date;
        if (estDateStr) {
          const tTime = new Date(estDateStr).getTime();
          if (tTime < minEstTime) minEstTime = tTime;
          if (tTime > maxEstTime) maxEstTime = tTime;
        }

        if (t.real_date) {
          const rTime = new Date(t.real_date).getTime();
          if (rTime < minRealTime) minRealTime = rTime;
          if (rTime > maxRealTime) maxRealTime = rTime;
        }

        if (t.status === 'Completado') {
          completedCount++;
        }
      });

      bars.push({
        name: sec,
        minEst: minEstTime === Infinity ? null : new Date(minEstTime).toISOString().split('T')[0],
        maxEst: maxEstTime === -Infinity ? null : new Date(maxEstTime).toISOString().split('T')[0],
        minReal: minRealTime === Infinity ? null : new Date(minRealTime).toISOString().split('T')[0],
        maxReal: maxRealTime === -Infinity ? null : new Date(maxRealTime).toISOString().split('T')[0],
        completion: secTasks.length > 0 ? completedCount / secTasks.length : 0
      });
    });

    return bars;
  }, [tasks, sectionsList]);

  // Función para calcular porcentaje de posicionamiento horizontal
  const getHorizontalPos = (dateStr: string | null) => {
    if (!dateStr) return 0;
    const time = new Date(dateStr).getTime();
    const { start, totalDays } = timelineBounds;
    const diffDays = (time - start) / (1000 * 60 * 60 * 24);
    return Math.min(100, Math.max(0, (diffDays / totalDays) * 100));
  };

  const currentSectionTasks = useMemo(() => {
    return tasks.filter(t => t.section === selectedSection && t.status !== 'CANCELADO');
  }, [tasks, selectedSection]);

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      
      {/* HEADER CONTROLS */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setViewMode('components')}
            className={`btn ${viewMode === 'components' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Layers className="h-4 w-4" />
            Vista General (Componentes)
          </button>
          
          <button 
            onClick={() => setViewMode('tasks')}
            className={`btn ${viewMode === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Activity className="h-4 w-4" />
            Vista Detallada (Tareas)
          </button>
        </div>

        {viewMode === 'tasks' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Sección:</span>
            <select 
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold"
            >
              {sectionsList.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* GANTT CONTAINER CARD */}
      <div className="card space-y-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        
        {/* Timeline Months Label Header */}
        <div className="flex border-b border-slate-200 pb-3 text-xs font-bold text-slate-500 uppercase tracking-widest text-center select-none">
          <div className="w-48 text-left pl-2 shrink-0">Línea de Tiempo</div>
          <div className="flex-1 flex justify-between">
            {months.map(m => (
              <div key={m.name} style={{ width: `${m.pctWidth}%` }}>{m.name}</div>
            ))}
          </div>
        </div>

        {/* VIEW 1: GENERAL COMPONENTS VIEW */}
        {viewMode === 'components' && (
          <div className="space-y-5">
            {componentBars.map(bar => {
              const estLeft = getHorizontalPos(bar.minEst || timelineBounds.projectStart);
              const estRight = getHorizontalPos(bar.maxEst || timelineBounds.projectEnd);
              const estWidth = Math.max(2, estRight - estLeft);

              const realLeft = bar.minReal ? getHorizontalPos(bar.minReal) : null;
              const realRight = bar.maxReal ? getHorizontalPos(bar.maxReal) : null;
              const realWidth = (realLeft !== null && realRight !== null) ? Math.max(2, realRight - realLeft) : null;

              return (
                <div key={bar.name} className="flex items-center group relative py-1 hover:bg-slate-50 rounded-lg transition-colors">
                  
                  {/* Left Label */}
                  <div className="w-48 shrink-0 pr-4">
                    <h4 className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                      {bar.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                      Avance: {Math.round(bar.completion * 100)}%
                    </span>
                  </div>

                  {/* Right Timeline Grid */}
                  <div className="flex-1 h-12 relative bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-center gap-1.5 px-1">
                    
                    {/* Grid Column Separators */}
                    <div className="absolute inset-0 flex justify-between pointer-events-none">
                      {months.map((_, i) => (
                        <div key={i} className="h-full border-r border-slate-200/50" />
                      ))}
                    </div>

                    {/* Estimated Gantt Bar (Indigo) */}
                    <div 
                      style={{ left: `${estLeft}%`, width: `${estWidth}%` }}
                      className="h-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-md relative shadow-sm border border-indigo-400/20 flex items-center justify-end px-1"
                      title={`Estimado: ${bar.minEst || '?'} al ${bar.maxEst || '?'}`}
                    >
                      <span className="text-[8px] font-extrabold text-white scale-90">EST</span>
                    </div>

                    {/* Real Gantt Bar (Emerald) */}
                    {realLeft !== null && realWidth !== null ? (
                      <div 
                        style={{ left: `${realLeft}%`, width: `${realWidth}%` }}
                        className="h-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-md relative shadow-sm border border-emerald-400/20 flex items-center justify-end px-1"
                        title={`Real: ${bar.minReal} al ${bar.maxReal}`}
                      >
                        <span className="text-[8px] font-extrabold text-white scale-90">REAL</span>
                      </div>
                    ) : (
                      <div className="h-3.5 text-[9px] text-slate-400 italic px-2 self-start">
                        Sin ejecuciones registradas
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: DETAILED TASKS VIEW */}
        {viewMode === 'tasks' && (
          <div className="space-y-4">
            
            {currentSectionTasks.map(task => {
              const startEst = task.original_estimated_date || timelineBounds.projectStart;
              const endEst = task.estimated_date || startEst;
              
              const estLeft = getHorizontalPos(task.estimated_date);
              
              // Si no tiene días calculamos el ancho estimado en base a la diferencia, o le damos 5 días por defecto
              const durationDays = task.days || 5;
              const { totalDays } = timelineBounds;
              const pctWidth = (durationDays / totalDays) * 100;

              const realLeft = task.real_date ? getHorizontalPos(task.real_date) : null;

              return (
                <div key={task.id} className="flex items-center group py-2 hover:bg-slate-50 rounded-lg transition-colors">
                  
                  {/* Left Label */}
                  <div className="w-48 shrink-0 pr-4">
                    <h4 className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors line-clamp-2" title={task.description}>
                      {task.description}
                    </h4>
                    <span className="text-[9px] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 font-bold uppercase tracking-wider inline-block mt-1">
                      {task.status}
                    </span>
                  </div>

                  {/* Right Timeline Grid */}
                  <div className="flex-1 h-12 relative bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex items-center px-1">
                    
                    {/* Grid Column Separators */}
                    <div className="absolute inset-0 flex justify-between pointer-events-none">
                      {months.map((_, i) => (
                        <div key={i} className="h-full border-r border-slate-200/50" />
                      ))}
                    </div>

                    {/* Gantt Bar representation */}
                    {/* Estimated Date bar (Indigo glow) */}
                    <div 
                      style={{ left: `${estLeft}%`, width: `${Math.max(2, pctWidth)}%` }}
                      className="absolute h-4.5 bg-indigo-600/40 border border-indigo-500/50 rounded flex items-center justify-center"
                      title={`Estimado: ${endEst} (${task.days || '?'} días)`}
                    >
                      <span className="text-[8px] font-bold text-indigo-200">Est</span>
                    </div>

                    {/* Completed Real Date Node (Emerald Checkmark Dot) */}
                    {realLeft !== null && (
                      <div 
                        style={{ left: `${realLeft}%` }}
                        className="absolute h-5 w-5 bg-emerald-500 border border-emerald-300 rounded-full flex items-center justify-center shadow-lg -translate-x-1/2"
                        title={`Completado Real: ${task.real_date}`}
                      >
                        <span className="text-[8px] font-extrabold text-white">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {currentSectionTasks.length === 0 && (
              <div className="py-12 text-center text-slate-400 font-semibold">
                No hay actividades registradas en esta sección.
              </div>
            )}
          </div>
        )}

      </div>

      {/* FOOTER LEGEND CARD */}
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-7 bg-indigo-600 rounded"></div>
          <div>
            <span className="font-semibold text-slate-700 block">Estimación / Planificación</span>
            Intervalo de fecha planificada de inicio a fin.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-4 w-7 bg-emerald-500 rounded"></div>
          <div>
            <span className="font-semibold text-slate-700 block">Ejecución Real</span>
            Fechas y registros de finalización física reportados.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-slate-100 border border-slate-200 rounded flex items-center justify-center font-bold text-slate-500 text-[10px]">
            ✓
          </div>
          <div>
            <span className="font-semibold text-slate-700 block">Hito Completado</span>
            Punto exacto de entrega verificado en servidor.
          </div>
        </div>
      </div>

    </div>
  );
};
