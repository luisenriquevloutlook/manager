import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { apiService } from '../services/apiService';
import type { ProjectSection } from '../types/project.types';
import { 
  Settings, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  Database,
  Info,
  CalendarDays,
  Pencil,
  Plus,
  Layers
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { 
    projects, 
    refreshData, 
    removeProject,
    currentProject,
    currentProjectId
  } = useProject();
 
  // Component weights state
  const [localLoading, setLocalLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
 
  // Project dates state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateSaving, setDateSaving] = useState(false);
  const [dateSaveSuccess, setDateSaveSuccess] = useState(false);
 
  // Sections state
  const [sections, setSections] = useState<ProjectSection[]>([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [sectionSaving, setSectionSaving] = useState(false);

  // Sync dates from current project
  useEffect(() => {
    if (currentProject) {
      setStartDate(currentProject.start_date || '2025-12-15');
      setEndDate(currentProject.end_date || '2026-02-23');
    }
  }, [currentProject]);

  // Load sections
  const fetchSections = async () => {
    try {
      const data = await apiService.getSections(currentProjectId);
      setSections(data);
    } catch {}
  };

  useEffect(() => {
    if (currentProjectId) fetchSections();
  }, [currentProjectId]);

  const handleSaveDates = async () => {
    if (!startDate || !endDate) {
      alert('Por favor ingresa ambas fechas.');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      alert('La fecha de entrega debe ser posterior a la fecha de inicio.');
      return;
    }
    setDateSaving(true);
    setDateSaveSuccess(false);
    try {
      await apiService.updateProjectDates(currentProjectId, startDate, endDate);
      setDateSaveSuccess(true);
      await refreshData();
      setTimeout(() => setDateSaveSuccess(false), 3000);
    } catch (err) {
      alert('Error al guardar las fechas del proyecto.');
    } finally {
      setDateSaving(false);
    }
  };

  // Section CRUD handlers
  const handleAddSection = async () => {
    const name = newSectionName.trim();
    if (!name) return;
    setSectionSaving(true);
    try {
      await apiService.createSection(currentProjectId, name);
      setNewSectionName('');
      await fetchSections();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al crear la sección.';
      alert(msg);
    } finally {
      setSectionSaving(false);
    }
  };

  const handleStartRename = (sec: ProjectSection) => {
    setEditingSectionId(sec.id);
    setEditingSectionName(sec.name);
  };

  const handleSaveRename = async (sec: ProjectSection) => {
    const name = editingSectionName.trim();
    if (!name || name === sec.name) {
      setEditingSectionId(null);
      return;
    }
    setSectionSaving(true);
    try {
      await apiService.renameSection(sec.id, name, currentProjectId);
      setEditingSectionId(null);
      await fetchSections();
    } catch {
      alert('Error al renombrar la sección.');
    } finally {
      setSectionSaving(false);
    }
  };

  const handleDeleteSection = async (sec: ProjectSection) => {
    if (!confirm(`¿Eliminar la sección "${sec.name}"? Las tareas asignadas a ella NO se borran, pero quedarán sin sección asignada.`)) return;
    setSectionSaving(true);
    try {
      await apiService.deleteSection(sec.id);
      await fetchSections();
    } catch {
      alert('Error al eliminar la sección.');
    } finally {
      setSectionSaving(false);
    }
  };

  // Calcular suma total de pesos desde secciones
  const totalWeight = sections.reduce((sum, s) => sum + Number(s.weight), 0);
  const totalWeightPercent = Math.round(totalWeight * 100);
  const isWeightValid = totalWeightPercent === 100;

  const handleWeightChange = (id: number, val: string) => {
    const numeric = parseFloat(val) / 100;
    setSections(prev => prev.map(s => s.id === id ? { ...s, weight: isNaN(numeric) ? 0 : numeric } : s));
  };

  const handleProgressChange = (id: number, val: string) => {
    const numeric = parseFloat(val) / 100;
    setSections(prev => prev.map(s => s.id === id ? { ...s, progress: isNaN(numeric) ? 0 : numeric } : s));
  };

  const handleSaveWeights = async () => {
    setLocalLoading(true);
    setSaveSuccess(false);
    try {
      await apiService.saveSectionsProgress(
        sections.map(s => ({ id: s.id, weight: s.weight, progress: s.progress }))
      );
      setSaveSuccess(true);
      await refreshData();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Error al guardar los pesos e indicadores.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (id === 1) {
      alert('No se puede eliminar el proyecto base MesaGo.');
      return;
    }
    if (!confirm('¿Estás seguro de que deseas eliminar este proyecto? Se borrarán todas sus tareas, componentes y bitácoras de avance de forma permanente.')) {
      return;
    }
    try {
      await removeProject(id);
      alert('Proyecto eliminado correctamente.');
    } catch (err) {
      alert('Error al eliminar el proyecto.');
    }
  };

  return (
    <div className="page-container space-y-8">

      {/* SECCIÓN 0: FECHAS DEL PROYECTO */}
      <div className="card space-y-5">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-400" />
              Fechas del Proyecto
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configura la fecha de inicio y la fecha estimada de entrega. Estos valores actualizan el Dashboard y el Cronograma.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {dateSaveSuccess && (
              <span className="badge badge-success flex items-center gap-1.5 text-xs py-1.5 px-3">
                <Check className="h-4 w-4" />
                Fechas guardadas
              </span>
            )}
            <button
              onClick={handleSaveDates}
              disabled={dateSaving}
              className="btn btn-primary"
            >
              {dateSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Guardar Fechas
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              📅 Fecha de Inicio del Proyecto
            </label>
            <input
              id="project-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm bg-slate-950/40 border border-slate-800/60 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500">
              Desde esta fecha se calcula el contador de <strong>Tiempo Transcurrido</strong> en el Dashboard.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              🏁 Fecha Estimada de Entrega
            </label>
            <input
              id="project-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm bg-slate-950/40 border border-slate-800/60 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500">
              Hasta esta fecha se calcula los <strong>Días Restantes</strong> (o retraso) en el Dashboard y el rango del Cronograma.
            </p>
          </div>
        </div>

        {/* Preview */}
        {startDate && endDate && (
          <div className="flex gap-4 flex-wrap text-xs text-slate-400 bg-slate-950/20 border border-slate-800/30 rounded-xl p-4">
            <span>📆 Inicio: <strong className="text-indigo-400">{startDate.split('-').reverse().join('/')}</strong></span>
            <span>🏁 Entrega: <strong className="text-emerald-400">{endDate.split('-').reverse().join('/')}</strong></span>
            <span>⏱ Duración total: <strong className="text-amber-400">
              {Math.max(0, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))} días
            </strong></span>
          </div>
        )}
      </div>
      
      {/* SECCIÓN 1B: GESTIÓN DE SECCIONES */}
      <div className="card space-y-4">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              Secciones del Tablero de Tareas
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Personaliza las secciones que aparecen en <strong>Tareas</strong> y en el <strong>Cronograma</strong> para este proyecto.
            </p>
          </div>
        </div>

        {/* Section list */}
        <div className="space-y-2">
          {sections.map((sec) => (
            <div key={sec.id} className="flex items-center gap-3 p-3 bg-slate-950/20 border border-slate-800/30 rounded-xl group">
              {editingSectionId === sec.id ? (
                <input
                  autoFocus
                  value={editingSectionName}
                  onChange={(e) => setEditingSectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(sec);
                    if (e.key === 'Escape') setEditingSectionId(null);
                  }}
                  onBlur={() => handleSaveRename(sec)}
                  className="flex-1 text-sm bg-slate-950/60 border border-indigo-500/60 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              ) : (
                <span className="flex-1 text-sm font-semibold text-slate-300">{sec.name}</span>
              )}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleStartRename(sec)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  title="Renombrar sección"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteSection(sec)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Eliminar sección"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {sections.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No hay secciones definidas. Agrega una abajo.</p>
          )}
        </div>

        {/* Add new section */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-800/30">
          <input
            id="new-section-input"
            type="text"
            placeholder="Nombre de la nueva sección..."
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddSection(); }}
            className="flex-1 text-sm bg-slate-950/40 border border-slate-800/60 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
          />
          <button
            onClick={handleAddSection}
            disabled={sectionSaving || !newSectionName.trim()}
            className="btn btn-primary text-xs shrink-0"
          >
            {sectionSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Agregar
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: PONDERACIÓN Y PESOS POR SECCIÓN */}
      <div className="card space-y-4">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-400" />
              Gestión de Ponderaciones y Avances
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configura el peso (%) y el avance real de cada sección del proyecto activo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isWeightValid && (
              <span className="badge badge-warning flex items-center gap-1.5 text-xs py-1.5 px-3">
                <AlertTriangle className="h-4 w-4" />
                Los pesos suman {totalWeightPercent}% (deben ser 100%)
              </span>
            )}
            {saveSuccess && (
              <span className="badge badge-success flex items-center gap-1.5 text-xs py-1.5 px-3">
                <Check className="h-4 w-4" />
                Guardado con éxito
              </span>
            )}
            <button
              onClick={handleSaveWeights}
              disabled={localLoading}
              className="btn btn-primary"
            >
              {localLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Guardar Cambios
            </button>
          </div>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-700/50 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Sección</th>
                <th className="py-3 px-4 w-40 text-center">Peso Ponderado (%)</th>
                <th className="py-3 px-4 w-40 text-center">Avance Actual (%)</th>
                <th className="py-3 px-4 w-52">Aportación al Avance Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30 text-sm">
              {sections.map(sec => {
                const contribution = (sec.weight || 0) * (sec.progress || 0);
                return (
                  <tr key={sec.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {sec.name}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center bg-slate-950/50 border border-slate-700/40 rounded-lg px-2 py-0.5">
                        <input
                          type="number"
                          value={Math.round((sec.weight || 0) * 100)}
                          onChange={(e) => handleWeightChange(sec.id, e.target.value)}
                          className="w-12 text-center bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-indigo-400"
                          min="0"
                          max="100"
                        />
                        <span className="text-slate-500 text-xs font-semibold select-none">%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center bg-slate-950/50 border border-slate-700/40 rounded-lg px-2 py-0.5">
                        <input
                          type="number"
                          value={Math.round((sec.progress || 0) * 100)}
                          onChange={(e) => handleProgressChange(sec.id, e.target.value)}
                          className="w-12 text-center bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-emerald-400"
                          min="0"
                          max="100"
                        />
                        <span className="text-slate-500 text-xs font-semibold select-none">%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-400">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            style={{ width: `${(sec.progress || 0) * 100}%` }}
                            className="bg-indigo-500 h-1.5 rounded-full"
                          />
                        </div>
                        <span>{(contribution * 100).toFixed(2)}% del proyecto</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sections.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500 text-xs">
                    No hay secciones definidas. Agrega secciones en el panel de arriba.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 2: BASE DE DATOS Y CONEXIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* DB Connection info */}
        <div className="card space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-400" />
            Servidor de Base de Datos
          </h3>
          
          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center p-3 bg-slate-950/30 rounded-xl border border-slate-800/40">
              <span className="text-slate-400 font-semibold">Motor SQL</span>
              <span className="badge badge-info text-[10px]">MySQL / MariaDB</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-950/30 rounded-xl border border-slate-800/40">
              <span className="text-slate-400 font-semibold">Base de Datos</span>
              <span className="font-bold text-slate-200">projectmanager</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-950/30 rounded-xl border border-slate-800/40">
              <span className="text-slate-400 font-semibold">Usuario de Acceso</span>
              <span className="font-mono text-xs bg-slate-950 px-2 py-0.5 rounded text-indigo-400">manager@localhost</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-950/30 rounded-xl border border-slate-800/40">
              <span className="text-slate-400 font-semibold">Puerto Conexión</span>
              <span className="font-bold text-slate-200">3306</span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="card bg-indigo-950/15 border-indigo-900/30 flex flex-col justify-between p-6">
          <div className="space-y-3">
            <h4 className="font-bold text-slate-200 flex items-center gap-2">
              <Info className="h-5 w-5 text-indigo-400" />
              Sincronización Ponderada
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              El avance general del proyecto en el dashboard principal se calcula dinámicamente multiplicando el 
              <strong> Avance</strong> de cada componente por su respectivo <strong>Peso</strong> de aportación. 
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cualquier cambio guardado aquí modificará la barra de progreso general en tiempo real, manteniendo al 
              equipo alineado en los entregables clave de MesaGo.
            </p>
          </div>
          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            MesaGo ProjectManager v1.0.0
          </div>
        </div>

      </div>

      {/* SECCIÓN 3: ELIMINACIÓN DE PROYECTOS MÚLTIPLES */}
      <div className="card space-y-4 border-red-500/20">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-400" />
            Zona de Peligro: Gestión de Proyectos
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Elimina proyectos secundarios creados en el selector. El proyecto base MesaGo no se puede eliminar.
          </p>
        </div>

        <div className="divide-y divide-slate-850 text-sm">
          {projects.map(proj => (
            <div key={proj.id} className="flex justify-between items-center py-3.5">
              <div>
                <span className="font-bold text-slate-200 block">{proj.name}</span>
                <span className="text-xs text-slate-500">{proj.description || 'Sin descripción descriptiva.'}</span>
              </div>
              <button 
                onClick={() => handleDeleteProject(proj.id)}
                disabled={proj.id === 1}
                className="btn btn-error !py-1.5 !px-3 text-xs flex items-center gap-1.5 disabled:opacity-20"
                title={proj.id === 1 ? 'El proyecto base no puede ser borrado' : 'Eliminar Proyecto'}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
