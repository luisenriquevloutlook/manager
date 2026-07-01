import React, { useEffect, useState, useMemo } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { apiService } from '../services/apiService';
import type { TimelineLog } from '../types/project.types';
import { Plus, X, MessageSquare, ClipboardCheck } from 'lucide-react';

export const TimelinePage: React.FC = () => {
  const { currentProjectId, refreshData } = useProject();
  const [logs, setLogs] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formComponent, setFormComponent] = useState('Planeación');
  const [formTask, setFormTask] = useState('');
  const [formPercentage, setFormPercentage] = useState(100);
  const [formNotes, setFormNotes] = useState('');

  const componentsList = useMemo(() => {
    return [
      'Planeación',
      'Backend API',
      'Panel WEB',
      'PWA Cliente',
      'App Mesero',
      'Pantalla Cocina',
      'DevOps',
      'Infraestructura',
      'General'
    ];
  }, []);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const data = await apiService.getTimeline(currentProjectId);
      setLogs(data);
    } catch (err) {
      console.error('Error loading timeline logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentProjectId) {
      fetchTimeline();
    }
  }, [currentProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTask.trim()) return;

    const logData = {
      project_id: currentProjectId,
      date: formDate,
      component: formComponent,
      task_description: formTask,
      percentage_logrado: Number(formPercentage) / 100,
      notes: formNotes.trim() || null
    };

    try {
      await apiService.createTimelineLog(logData);
      setShowModal(false);
      setFormTask('');
      setFormNotes('');
      setFormPercentage(100);
      await fetchTimeline();
      await refreshData();
    } catch (err) {
      alert('Error al guardar el registro histórico.');
    }
  };

  return (
    <div className="page-container space-y-6">
      
      {/* TIMELINE ACTION PANEL */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-slate-500">Historial cronológico de avances de desarrollo y entregas</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4" />
          Registrar Hito
        </button>
      </div>

      {/* VERTICAL TIMELINE LIST */}
      <div className="card bg-white border border-slate-200 rounded-xl shadow-sm">
        {loading ? (
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-semibold">
            No se han registrado hitos históricos en la bitácora de este proyecto.
          </div>
        ) : (
          <div className="relative border-l border-slate-200 ml-4 md:ml-32 pl-6 md:pl-8 space-y-8 py-4">
            
            {logs.map(log => {
              const dateStr = String(log.date).split('T')[0];
              // Format date nicely: YYYY-MM-DD to DD/MM/YYYY
              const formattedDate = dateStr.split('-').reverse().join('/');

              return (
                <div key={log.id} className="relative group">
                  
                  {/* Left Floating Date Column (Visible on Md screens) */}
                  <div className="hidden md:block absolute -left-[160px] top-1 w-28 text-right text-xs font-bold text-slate-500">
                    <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                      {formattedDate}
                    </span>
                  </div>

                  {/* Bullet Node on the vertical axis line */}
                  <span className="absolute -left-[31px] md:-left-[39px] top-1.5 h-4 w-4 bg-white border-2 border-indigo-500 rounded-full group-hover:bg-indigo-500 transition-colors shadow shadow-indigo-500/30"></span>

                  {/* Log Content Card */}
                  <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 hover:border-indigo-500/40 transition-colors space-y-3">
                    
                    {/* Log Meta Header */}
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold border border-indigo-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {log.component}
                        </span>
                        {/* Mobile visible date badge */}
                        <span className="md:hidden ml-2 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 border border-slate-200 rounded">
                          {formattedDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                        <ClipboardCheck className="h-4 w-4" />
                        Logro: {Math.round(log.percentage_logrado * 100)}%
                      </div>
                    </div>

                    {/* Task Description */}
                    <h3 className="text-slate-800 font-bold text-sm leading-snug">
                      {log.task_description}
                    </h3>

                    {/* Notes */}
                    {log.notes && (
                      <div className="flex gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                        <MessageSquare className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                        <p className="leading-relaxed italic">{log.notes}</p>
                      </div>
                    )}

                  </div>
                </div>
              );
            })}

          </div>
        )}
      </div>

      {/* CREATE HISTORICAL ENTRY MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content text-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-850">Registrar Hito de Avance</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Fecha del Registro
                  </label>
                  <input 
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Componente Relacionado
                  </label>
                  <select 
                    value={formComponent}
                    onChange={(e) => setFormComponent(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white"
                  >
                    {componentsList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Hito Logrado / Tarea Ejecutada
                </label>
                <input 
                  type="text"
                  value={formTask}
                  onChange={(e) => setFormTask(e.target.value)}
                  placeholder="Ej. Sincronización base local terminada con éxito"
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Porcentaje de Logro ({formPercentage}%)
                  </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={formPercentage}
                    onChange={(e) => setFormPercentage(Number(e.target.value))}
                    className="flex-1 accent-indigo-500 bg-slate-200 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="font-bold text-slate-700 text-sm w-12 text-right">{formPercentage}%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Notas / Observaciones
                </label>
                <textarea 
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Añade detalles o bitácoras técnicas adicionales..."
                  className="w-full h-24 text-xs resize-none bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Registrar Hito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
