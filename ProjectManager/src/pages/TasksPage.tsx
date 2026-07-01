import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useProject } from '../contexts/ProjectContext';
import { apiService } from '../services/apiService';
import type { Task, ProjectSection } from '../types/project.types';
import { 
  Search, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  X,
  Calendar,
  Clock,
  ArrowUpDown,
  Trash2,
  FileText
} from 'lucide-react';

export const TasksPage: React.FC = () => {
  const { currentProjectId, refreshData } = useProject();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and Views
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentView, setCurrentView] = useState<'table' | 'kanban'>('table');

  // Drag and Drop State
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<number | null>(null);

  // Collapsed Sections state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Slide-over Drawer State
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Quick Dropdown Active State
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<number | null>(null);

  // Inline Quick Add State per Section
  const [newTaskNames, setNewTaskNames] = useState<Record<string, string>>({});

  // Drawer Form State
  const [formSection, setFormSection] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<Task['status']>('Pendiente');
  const [formOriginalEstDate, setFormOriginalEstDate] = useState('');
  const [formRealDate, setFormRealDate] = useState('');
  const [formDays, setFormDays] = useState<number | ''>('');
  const [formEstDate, setFormEstDate] = useState('');

  // Dynamic sections from API
  const [sections, setSections] = useState<ProjectSection[]>([]);

  const sectionsList = useMemo(() => sections.map(s => s.name), [sections]);

  // Color palette for dynamic sections
  const SECTION_COLORS = [
    'border-l-4 border-blue-500',
    'border-l-4 border-indigo-500',
    'border-l-4 border-emerald-500',
    'border-l-4 border-purple-500',
    'border-l-4 border-fuchsia-500',
    'border-l-4 border-pink-500',
    'border-l-4 border-rose-500',
    'border-l-4 border-amber-500',
    'border-l-4 border-yellow-500',
    'border-l-4 border-teal-500',
    'border-l-4 border-cyan-500',
    'border-l-4 border-orange-500',
    'border-l-4 border-lime-500',
    'border-l-4 border-violet-500',
  ];

  const sectionColors = useMemo(() => {
    const map: Record<string, string> = {};
    sections.forEach((s, i) => {
      map[s.name] = SECTION_COLORS[i % SECTION_COLORS.length];
    });
    return map;
  }, [sections]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await apiService.getTasks(currentProjectId);
      setTasks(data);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const data = await apiService.getSections(currentProjectId);
      setSections(data);
    } catch (err) {
      console.error('Error loading sections:', err);
    }
  };

  useEffect(() => {
    if (currentProjectId) {
      fetchTasks();
      fetchSections();
      setActiveStatusDropdownId(null);
    }
  }, [currentProjectId]);

  // Filtrado
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = 
        task.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  // Agrupar tareas por sección
  const tasksBySection = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    sectionsList.forEach(sec => {
      groups[sec] = [];
    });
    
    filteredTasks.forEach(task => {
      const sec = task.section || 'General';
      if (!groups[sec]) {
        groups[sec] = [];
      }
      groups[sec].push(task);
    });
    return groups;
  }, [filteredTasks, sectionsList]);

  // Agrupar tareas por columna en Kanban
  const kanbanColumnsData = useMemo(() => {
    const cols = {
      Pendiente: [] as Task[],
      'En Proceso': [] as Task[],
      Finalizado: [] as Task[],
      Cancelado: [] as Task[]
    };

    filteredTasks.forEach(task => {
      if (task.status === 'Pendiente' || task.status === 'Hito') {
        cols['Pendiente'].push(task);
      } else if (task.status === 'En Progreso') {
        cols['En Proceso'].push(task);
      } else if (task.status === 'Completado') {
        cols['Finalizado'].push(task);
      } else if (task.status === 'CANCELADO') {
        cols['Cancelado'].push(task);
      }
    });

    return cols;
  }, [filteredTasks]);

  // Alternar colapsado de sección
  const toggleSection = (sec: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sec]: !prev[sec]
    }));
  };

  // Reordenar mediante botones ▲/▼
  const handleMoveTask = async (taskId: number, direction: 'up' | 'down') => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    const task = tasks[taskIndex];

    const sectionTasks = tasks.filter(t => t.section === task.section);
    const indexInSection = sectionTasks.findIndex(t => t.id === taskId);

    if (direction === 'up' && indexInSection === 0) return;
    if (direction === 'down' && indexInSection === sectionTasks.length - 1) return;

    const targetTask = sectionTasks[direction === 'up' ? indexInSection - 1 : indexInSection + 1];

    const newTasks = [...tasks];
    const currentIdx = newTasks.findIndex(t => t.id === taskId);
    const targetIdx = newTasks.findIndex(t => t.id === targetTask.id);

    if (currentIdx === -1 || targetIdx === -1) return;

    const temp = newTasks[currentIdx];
    newTasks[currentIdx] = newTasks[targetIdx];
    newTasks[targetIdx] = temp;

    const reorderedTasks = newTasks.map((t, idx) => ({
      id: t.id,
      order_index: idx + 1,
      section: t.section
    }));

    setTasks(newTasks);

    try {
      await apiService.reorderTasks(reorderedTasks);
      await refreshData();
    } catch (err) {
      console.error('Error saving reorder via button:', err);
      fetchTasks();
    }
  };

  // Obtener estilos de alerta para las fechas según la proximidad al límite/reprogramación
  const getDateAlertStyle = (task: Task): React.CSSProperties | null => {
    if (task.status === 'Completado' || task.status === 'CANCELADO' || task.real_date) {
      return null;
    }

    const dateToCheck = task.estimated_date || task.original_estimated_date;
    if (!dateToCheck) return null;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const parts = dateToCheck.split('-');
      if (parts.length !== 3) return null;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const targetDate = new Date(year, month, day);
      
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Vencida → Rojo
        return {
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          padding: '0.375rem',
        };
      } else if (diffDays <= 3) {
        // Próxima a vencer → Ámbar
        return {
          backgroundColor: '#fffbeb',
          color: '#b45309',
          border: '1px solid #fde68a',
          borderRadius: '0.5rem',
          padding: '0.375rem',
        };
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  // Drag and Drop Handlers (Table View)
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id.toString());
  };

  const handleDragOver = (e: React.DragEvent, task: Task) => {
    e.preventDefault();
    if (draggedTask && draggedTask.id !== task.id) {
      setDragOverTaskId(task.id);
    }
  };

  const handleDragLeave = () => {
    setDragOverTaskId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    setDragOverTaskId(null);
    if (!draggedTask || draggedTask.id === targetTask.id) return;

    // Clonar lista
    const newTasks = [...tasks];
    
    // Buscar índices
    const draggedIdx = newTasks.findIndex(t => t.id === draggedTask.id);
    if (draggedIdx === -1) return;
    
    // Remover tarea arrastrada
    const [movedTask] = newTasks.splice(draggedIdx, 1);
    
    // Si cambia de sección, actualizarla
    movedTask.section = targetTask.section;

    // Buscar el nuevo índice destino
    const targetIdx = newTasks.findIndex(t => t.id === targetTask.id);
    
    // Insertar antes/después del destino
    newTasks.splice(targetIdx, 0, movedTask);

    // Asignar order_index secuenciales
    const reorderedTasks = newTasks.map((t, idx) => ({
      id: t.id,
      order_index: idx + 1,
      section: t.section
    }));

    // Optimistic state update
    setTasks(newTasks);

    try {
      await apiService.reorderTasks(reorderedTasks);
      await refreshData();
    } catch (err) {
      console.error('Error saving reorder:', err);
      fetchTasks();
    } finally {
      setDraggedTask(null);
    }
  };

  // Arrastrar hacia un encabezado de sección vacío
  const handleDropOnSectionHeader = async (e: React.DragEvent, targetSection: string) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.section === targetSection) return;

    const newTasks = [...tasks];
    const draggedIdx = newTasks.findIndex(t => t.id === draggedTask.id);
    if (draggedIdx === -1) return;

    const [movedTask] = newTasks.splice(draggedIdx, 1);
    movedTask.section = targetSection;

    // Insertarla al final de la sección correspondiente
    const lastSecIdx = newTasks.map(t => t.section).lastIndexOf(targetSection);
    if (lastSecIdx !== -1) {
      newTasks.splice(lastSecIdx + 1, 0, movedTask);
    } else {
      newTasks.push(movedTask);
    }

    const reorderedTasks = newTasks.map((t, idx) => ({
      id: t.id,
      order_index: idx + 1,
      section: t.section
    }));

    setTasks(newTasks);

    try {
      await apiService.reorderTasks(reorderedTasks);
      await refreshData();
    } catch (err) {
      console.error('Error dragging to section:', err);
      fetchTasks();
    } finally {
      setDraggedTask(null);
    }
  };

  // Drag and Drop Handlers (Kanban Column)
  const handleDropOnKanbanColumn = async (e: React.DragEvent, targetStatus: Task['status']) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = parseInt(taskIdStr, 10);
    if (isNaN(taskId)) return;

    const dragged = tasks.find(t => t.id === taskId);
    if (!dragged || dragged.status === targetStatus) return;

    // Actualizar de forma optimista
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));

    try {
      await apiService.updateTask(taskId, { status: targetStatus });
      await refreshData();
    } catch (err) {
      console.error('Error updating status via drop:', err);
      fetchTasks();
    } finally {
      setDraggedTask(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverTaskId(null);
  };

  // Open lateral Drawer (Slide-over)
  const openDrawer = (task: Task | null) => {
    try {
      
      const formatDateForInput = (dateStr: string | null | undefined) => {
        if (!dateStr) return '';
        if (typeof dateStr === 'string' && dateStr.includes('T')) {
          return dateStr.split('T')[0];
        }
        return String(dateStr);
      };

      if (task) {
        // Editar
        setEditingTask(task);
        setFormSection(task.section || sectionsList[0] || '');
        setFormDescription(task.description || '');
        setFormStatus(task.status || 'Pendiente');
        setFormOriginalEstDate(formatDateForInput(task.original_estimated_date));
        setFormRealDate(formatDateForInput(task.real_date));
        setFormDays(task.days !== null && task.days !== undefined ? task.days : '');
        setFormEstDate(formatDateForInput(task.estimated_date));
      } else {
        // Crear
        setEditingTask(null);
        setFormSection(sectionsList[0] || '');
        setFormDescription('');
        setFormStatus('Pendiente');
        setFormOriginalEstDate('');
        setFormRealDate('');
        setFormDays('');
        setFormEstDate('');
      }
      setShowDrawer(true);
    } catch (err: any) {
      console.error('Error opening drawer:', err);
      alert('Error al abrir la edición de la tarea: ' + err.message);
    }
  };

  // Form Submit (Drawer)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) return;

    const taskData = {
      project_id: currentProjectId,
      section: formSection,
      description: formDescription,
      status: formStatus,
      tag: null,
      original_estimated_date: formOriginalEstDate || null,
      real_date: formRealDate || null,
      days: formDays !== '' ? Number(formDays) : null,
      estimated_date: formEstDate || null
    };

    try {
      if (editingTask) {
        await apiService.updateTask(editingTask.id, taskData);
      } else {
        await apiService.createTask(taskData);
      }
      setShowDrawer(false);
      await fetchTasks();
      await refreshData();
    } catch (err) {
      console.error('Error saving task:', err);
      alert('Error al guardar la tarea.');
    }
  };

  // Borrar tarea
  const handleDeleteTask = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea permanentemente?')) return;
    try {
      await apiService.deleteTask(id);
      setShowDrawer(false);
      await fetchTasks();
      await refreshData();
    } catch (err) {
      alert('Error al eliminar la tarea.');
    }
  };

  // Cambio rápido de estado inline
  const handleQuickStatusChange = async (id: number, status: Task['status']) => {
    setActiveStatusDropdownId(null);
    
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    let updatedRealDate = task.real_date;
    if (status === 'Completado' && !task.real_date) {
      updatedRealDate = new Date().toISOString().split('T')[0];
    }

    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, real_date: updatedRealDate } : t));
    try {
      await apiService.updateTask(id, { status, real_date: updatedRealDate });
      await refreshData();
    } catch (err) {
      console.error('Error on quick update:', err);
      fetchTasks();
    }
  };

  // Inline Quick Add handlers
  const handleNewTaskNameChange = (section: string, value: string) => {
    setNewTaskNames(prev => ({
      ...prev,
      [section]: value
    }));
  };

  const handleCreateTaskInline = async (section: string) => {
    const taskName = newTaskNames[section];
    if (!taskName || !taskName.trim()) return;

    try {
      await apiService.createTask({
        project_id: currentProjectId,
        section,
        description: taskName.trim(),
        status: 'Pendiente',
        tag: null,
        original_estimated_date: null,
        real_date: null,
        days: null,
        estimated_date: null
      });
      // Clear input
      setNewTaskNames(prev => ({
        ...prev,
        [section]: ''
      }));
      await fetchTasks();
      await refreshData();
    } catch (err) {
      console.error('Error creating task inline:', err);
      alert('Error al agregar la tarea.');
    }
  };

  const getStatusColorClass = (status: Task['status']) => {
    switch (status) {
      case 'Completado': return 'bg-[#00c875]';
      case 'En Progreso': return 'bg-[#fdab3d]';
      case 'Pendiente': return 'bg-[#c4c4c4]';
      case 'Hito': return 'bg-[#579bfc]';
      case 'CANCELADO': return 'bg-[#e2445c]';
      default: return 'bg-[#c4c4c4]';
    }
  };

  return (
    <div className="page-container space-y-6 relative min-h-[calc(100vh-5rem)]">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        
        {/* Search & Status Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 max-w-2xl">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar tareas por descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          </div>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-semibold"
          >
            <option value="">Todos los estados</option>
            <option value="Completado">Completado</option>
            <option value="En Progreso">En Progreso</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Hito">Hito</option>
            <option value="CANCELADO">CANCELADO</option>
          </select>
        </div>

        {/* View Switcher and Add Button */}
        <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-start">
          <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1">
            <button
              onClick={() => setCurrentView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                currentView === 'table'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              📋 Lista
            </button>
            <button
              onClick={() => setCurrentView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                currentView === 'kanban'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              🗂️ Kanban
            </button>
          </div>

          <button 
            onClick={() => openDrawer(null)}
            className="btn btn-primary justify-center text-xs font-semibold shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Agregar Tarea
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE VIEW */}
      {loading ? (
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      ) : currentView === 'kanban' ? (
        /* KANBAN CARD VIEW */
        <div className="flex gap-6 overflow-x-auto pb-6 pt-2 select-none" style={{ minHeight: '60vh' }}>
          <KanbanColumn 
            title="Pendiente" 
            tasks={kanbanColumnsData['Pendiente']} 
            status="Pendiente" 
            color="#64748b" 
            bgColor="#f1f5f9" 
            headerBorderColor="#cbd5e1"
            onDropCard={handleDropOnKanbanColumn}
            onOpenTask={openDrawer}
          />
          <KanbanColumn 
            title="En Proceso" 
            tasks={kanbanColumnsData['En Proceso']} 
            status="En Progreso" 
            color="#fdab3d" 
            bgColor="#fffbeb" 
            headerBorderColor="#fde68a"
            onDropCard={handleDropOnKanbanColumn}
            onOpenTask={openDrawer}
          />
          <KanbanColumn 
            title="Finalizado" 
            tasks={kanbanColumnsData['Finalizado']} 
            status="Completado" 
            color="#00c875" 
            bgColor="#f0fdf4" 
            headerBorderColor="#bbf7d0"
            onDropCard={handleDropOnKanbanColumn}
            onOpenTask={openDrawer}
          />
          <KanbanColumn 
            title="Cancelado" 
            tasks={kanbanColumnsData['Cancelado']} 
            status="CANCELADO" 
            color="#e2445c" 
            bgColor="#fef2f2" 
            headerBorderColor="#fecaca"
            onDropCard={handleDropOnKanbanColumn}
            onOpenTask={openDrawer}
          />
        </div>
      ) : (
        /* MONDAY STYLE BOARD (TABLE VIEW) */
        <div className="space-y-6">
          {sectionsList.map(section => {
            const sectionTasks = tasksBySection[section] || [];
            const isCollapsed = collapsedSections[section];
            const hasTasks = sectionTasks.length > 0;

            return (
              <div 
                key={section} 
                className="space-y-1.5"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnSectionHeader(e, section)}
              >
                
                {/* SECTION ACCORDION HEADER */}
                <div 
                  onClick={() => toggleSection(section)}
                  className={`flex justify-between items-center bg-white border border-slate-200/80 rounded-lg p-3.5 cursor-pointer hover:bg-slate-50 transition-all select-none ${
                    sectionColors[section] || 'border-l-4 border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="h-4.5 w-4.5 text-slate-500" /> : <ChevronDown className="h-4.5 w-4.5 text-slate-500" />}
                    <h3 className="text-xs font-extrabold text-slate-800">{section}</h3>
                    <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                      {sectionTasks.length} {sectionTasks.length === 1 ? 'tarea' : 'tareas'}
                    </span>
                  </div>
                </div>

                {/* TASKS TABLE FOR THE SECTION */}
                {!isCollapsed && (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm">
                    <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">
                          <th className="py-2.5 px-3 w-[5%] text-center border-r border-slate-200"></th>
                          <th className="py-2.5 px-4 w-[38%] border-r border-slate-200 text-left">Tarea / Descripción</th>
                          <th className="py-2.5 px-3 w-[18%] text-center border-r border-slate-200">Estado</th>
                          <th className="py-2.5 px-4 w-[10%] text-center border-r border-slate-200">Duración</th>
                          <th className="py-2.5 px-4 w-[20%] text-left border-r border-slate-200">Cronograma (Fechas)</th>
                          <th className="py-2.5 px-4 w-[9%] text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {sectionTasks.map(task => {
                          const isDragOver = dragOverTaskId === task.id;
                          return (
                            <tr 
                              key={task.id}
                              onDragOver={(e) => handleDragOver(e, task)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, task)}
                              onClick={() => openDrawer(task)}
                              className={`group hover:bg-slate-50 transition-all ${
                                isDragOver ? 'bg-indigo-50 border-t-2 border-indigo-500' : ''
                              }`}
                            >
                              {/* Reorder buttons ▲/▼ and drag handle */}
                              <td 
                                className="py-1 px-1.5 w-[5%] text-center border-r border-slate-200 text-slate-400"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  {/* Drag Handle */}
                                  <div
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, task)}
                                    onDragEnd={handleDragEnd}
                                    className="cursor-grab p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="Arrastrar para ordenar"
                                  >
                                    <ArrowUpDown className="h-3.5 w-3.5" />
                                  </div>
                                  
                                  {/* Up/Down buttons */}
                                  <div className="flex flex-col items-center justify-center gap-0.5 select-none">
                                    <button
                                      type="button"
                                      onClick={() => handleMoveTask(task.id, 'up')}
                                      className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                      title="Mover arriba"
                                    >
                                      <ChevronUp className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveTask(task.id, 'down')}
                                      className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                      title="Mover abajo"
                                    >
                                      <ChevronDown className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </td>

                              {/* Task Description */}
                              <td className="py-2.5 px-4 w-[38%] border-r border-slate-200 font-semibold text-slate-800">
                                <div className="line-clamp-2">{task.description}</div>
                              </td>

                              {/* Solid Status cell with Popover trigger */}
                              <td 
                                className="p-0 w-[18%] border-r border-slate-200 text-center relative" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveStatusDropdownId(activeStatusDropdownId === task.id ? null : task.id);
                                }}
                              >
                                <button 
                                  className={`w-full h-10 border-none font-bold text-white text-xs text-center cursor-pointer transition-all hover:brightness-95 flex items-center justify-center ${getStatusColorClass(task.status)}`}
                                >
                                  {task.status}
                                </button>

                                {/* Simple Dropdown popup for status */}
                                {activeStatusDropdownId === task.id && (
                                  <div className="absolute left-1/2 -translate-x-1/2 top-10 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden text-left">
                                    <button 
                                      onClick={() => handleQuickStatusChange(task.id, 'Pendiente')}
                                      className="w-full px-4 py-2 hover:bg-slate-100 text-xs text-slate-700 font-semibold flex items-center gap-2"
                                    >
                                      <span className="h-2.5 w-2.5 bg-[#c4c4c4] rounded-full"></span>
                                      Pendiente
                                    </button>
                                    <button 
                                      onClick={() => handleQuickStatusChange(task.id, 'En Progreso')}
                                      className="w-full px-4 py-2 hover:bg-slate-100 text-xs text-slate-700 font-semibold flex items-center gap-2"
                                    >
                                      <span className="h-2.5 w-2.5 bg-[#fdab3d] rounded-full"></span>
                                      En Progreso
                                    </button>
                                    <button 
                                      onClick={() => handleQuickStatusChange(task.id, 'Completado')}
                                      className="w-full px-4 py-2 hover:bg-slate-100 text-xs text-slate-700 font-semibold flex items-center gap-2"
                                    >
                                      <span className="h-2.5 w-2.5 bg-[#00c875] rounded-full"></span>
                                      Completado
                                    </button>
                                    <button 
                                      onClick={() => handleQuickStatusChange(task.id, 'Hito')}
                                      className="w-full px-4 py-2 hover:bg-slate-100 text-xs text-slate-700 font-semibold flex items-center gap-2"
                                    >
                                      <span className="h-2.5 w-2.5 bg-[#579bfc] rounded-full"></span>
                                      Hito
                                    </button>
                                    <button 
                                      onClick={() => handleQuickStatusChange(task.id, 'CANCELADO')}
                                      className="w-full px-4 py-2 hover:bg-slate-100 text-xs text-slate-700 font-semibold flex items-center gap-2"
                                    >
                                      <span className="h-2.5 w-2.5 bg-[#e2445c] rounded-full"></span>
                                      CANCELADO
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Days Duration */}
                              <td className="py-2.5 px-4 w-[10%] border-r border-slate-200 text-center font-bold text-slate-700">
                                {task.days !== null ? `${task.days} d` : '-'}
                              </td>

                              {/* Dates: Limit, Reprogrammed, Closure */}
                              <td className="py-1 px-2 w-[20%] border-r border-slate-200 text-[10px] text-slate-500">
                                <div 
                                  className="p-1.5 rounded-lg space-y-0.5"
                                  style={getDateAlertStyle(task) || undefined}
                                >
                                  {task.original_estimated_date && (
                                    <div className="flex items-center gap-1">
                                      <span className="font-bold w-12 shrink-0">Límite:</span>
                                      <span className={getDateAlertStyle(task) ? 'font-semibold' : 'text-slate-700'}>{task.original_estimated_date}</span>
                                    </div>
                                  )}
                                  {task.estimated_date && (
                                    <div className="flex items-center gap-1">
                                      <span className={`font-bold w-12 shrink-0 ${getDateAlertStyle(task) ? '' : 'text-indigo-600'}`}>Reprog:</span>
                                      <span className={getDateAlertStyle(task) ? 'font-semibold' : 'font-semibold text-slate-800'}>{task.estimated_date}</span>
                                    </div>
                                  )}
                                  {task.real_date && (
                                    <div className="flex items-center gap-1">
                                      <span className={`font-bold w-12 shrink-0 ${getDateAlertStyle(task) ? '' : 'text-emerald-600'}`}>Cierre:</span>
                                      <span className={getDateAlertStyle(task) ? 'font-semibold' : 'font-semibold text-slate-800'}>{task.real_date}</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Actions Column */}
                              <td className="py-2.5 px-4 w-[9%] text-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={() => openDrawer(task)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer inline-flex items-center justify-center"
                                  title="Editar Actividad"
                                >
                                  <FileText className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-red-600 transition-colors cursor-pointer inline-flex items-center justify-center"
                                  title="Eliminar Actividad"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Inline Task Adder Row */}
                        <tr className="border-t border-slate-100 bg-slate-50/10 hover:bg-slate-50/50">
                          <td className="py-2 px-3 w-[5%] text-center border-r border-slate-200 text-slate-400">
                            <Plus className="h-3.5 w-3.5 mx-auto" />
                          </td>
                          <td className="py-1 px-4 w-[38%] border-r border-slate-200">
                            <input
                              type="text"
                              placeholder="+ Añadir tarea (Escribe y presiona Enter)..."
                              value={newTaskNames[section] || ''}
                              onChange={(e) => handleNewTaskNameChange(section, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCreateTaskInline(section);
                                }
                              }}
                              className="w-full bg-transparent border-none py-1 px-0 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
                            />
                          </td>
                          <td className="py-2 px-3 w-[18%] border-r border-slate-200 bg-slate-50/30"></td>
                          <td className="py-2 px-4 w-[10%] border-r border-slate-200 bg-slate-50/30"></td>
                          <td className="py-2 px-4 w-[20%] border-r border-slate-200 bg-slate-50/30"></td>
                          <td className="py-2 px-4 w-[9%] bg-slate-50/30"></td>
                        </tr>

                        {!hasTasks && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-400 font-bold italic bg-slate-50/5">
                              No hay tareas en esta sección.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* LATERAL DRAWER EDIT PANEL - rendered via portal to bypass overflow-y:auto ancestors */}
      {showDrawer && createPortal(
        <>
          {/* Backdrop */}
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9999 }}
            onClick={() => setShowDrawer(false)}
          />

          {/* Drawer content sheet */}
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            maxWidth: '460px',
            background: '#fff',
            borderLeft: '1px solid #e2e8f0',
            zIndex: 10000,
            boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            
            {/* Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4f46e5' }}>
                <FileText style={{ width: '1.25rem', height: '1.25rem' }} />
                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', margin: 0 }}>
                  {editingTask ? 'Detalles de la Actividad' : 'Nueva Actividad'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowDrawer(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.375rem', borderRadius: '0.5rem', color: '#94a3b8', display: 'flex' }}
              >
                <X style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveTask} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              
              {/* Scrollable fields */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Sección */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.375rem' }}>
                    Sección del Tablero
                  </label>
                  <select
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    style={{ width: '100%', fontSize: '0.75rem', fontWeight: 600, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}
                  >
                    {sectionsList.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                {/* Descripción */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.375rem' }}>
                    Descripción *
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Detalles sobre lo que se debe hacer..."
                    required
                    style={{ width: '100%', height: '6rem', fontSize: '0.75rem', resize: 'none', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                 {/* Estado */}
                 <div>
                   <label style={{ display: 'block', fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.375rem' }}>
                     Estado Actual
                   </label>
                   <select
                     value={formStatus}
                     onChange={(e) => {
                       const newStatus = e.target.value as Task['status'];
                       setFormStatus(newStatus);
                       if (newStatus === 'Completado' && !formRealDate) {
                         setFormRealDate(new Date().toISOString().split('T')[0]);
                       }
                     }}
                     style={{ width: '100%', fontSize: '0.75rem', fontWeight: 700, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}
                   >
                     <option value="Pendiente">Pendiente</option>
                     <option value="En Progreso">En Progreso</option>
                     <option value="Completado">Completado</option>
                     <option value="Hito">Hito</option>
                     <option value="CANCELADO">CANCELADO</option>
                   </select>
                 </div>
 
                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                     Duración (Días)
                   </label>
                   <div className="relative">
                     <input 
                       type="number" 
                       value={formDays}
                       onChange={(e) => setFormDays(e.target.value !== '' ? parseInt(e.target.value) : '')}
                       placeholder="Ej. 7"
                       className="w-full text-xs pl-8 bg-slate-50 border border-slate-200 text-slate-800 py-2 px-3 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500"
                       min="0"
                     />
                     <Clock className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                   </div>
                 </div>
 
                 <div className="border-t border-slate-100 pt-4 space-y-4">
                   <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     Planificación de Fechas
                   </h4>
 
                   <div>
                     <label className="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                       <Calendar className="h-3.5 w-3.5 text-slate-400" />
                       Fecha Límite:
                     </label>
                     <input 
                       type="date" 
                       value={formOriginalEstDate}
                       onChange={(e) => setFormOriginalEstDate(e.target.value)}
                       className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-800 py-2 px-3 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500"
                     />
                   </div>
 
                   <div>
                     <label className="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                       <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                       Fecha Reprogramada:
                     </label>
                     <div className="flex gap-2 items-center">
                       <input 
                         type="date" 
                         value={formEstDate}
                         onChange={(e) => setFormEstDate(e.target.value)}
                         className="flex-1 text-xs bg-slate-50 border border-slate-200 text-slate-800 py-2 px-3 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500"
                       />
                       {formEstDate && (
                         <button
                           type="button"
                           onClick={() => setFormEstDate('')}
                           className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                           title="Limpiar fecha"
                         >
                           ✕
                         </button>
                       )}
                     </div>
                   </div>
 
                   <div>
                     <label className="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center gap-1.5">
                       <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                       Fecha de Cierre:
                     </label>
                     <div className="flex gap-2 items-center">
                       <input 
                         type="date" 
                         value={formRealDate}
                         onChange={(e) => setFormRealDate(e.target.value)}
                         className="flex-1 text-xs bg-slate-50 border border-slate-200 text-slate-800 py-2 px-3 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500"
                       />
                       {formRealDate && (
                         <button
                           type="button"
                           onClick={() => setFormRealDate('')}
                           className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                           title="Limpiar fecha"
                         >
                           ✕
                         </button>
                       )}
                     </div>
                   </div>
                 </div>

              </div>

              {/* Footer Buttons */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3">
                {editingTask ? (
                  <button 
                    type="button"
                    onClick={() => handleDeleteTask(editingTask.id)}
                    className="btn btn-error text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                ) : (
                  <div />
                )}
                
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowDrawer(false)}
                    className="btn btn-secondary text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-primary text-xs cursor-pointer"
                  >
                    Guardar Tarea
                  </button>
                </div>
              </div>

            </form>

          </div>
        </>,
        document.body
      )}

    </div>
  );
};

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  status: Task['status'];
  color: string;
  bgColor: string;
  headerBorderColor: string;
  onDropCard: (e: React.DragEvent, targetStatus: Task['status']) => void;
  onOpenTask: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  tasks,
  status,
  color,
  bgColor,
  headerBorderColor,
  onDropCard,
  onOpenTask
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    onDropCard(e, status);
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-80 flex-shrink-0 flex flex-col rounded-2xl border transition-all duration-200 ${
        isDragOver 
          ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-100 shadow-md scale-[0.99]' 
          : 'border-slate-200'
      }`}
      style={{ maxHeight: 'calc(100vh - 12rem)', backgroundColor: isDragOver ? undefined : bgColor }}
    >
      {/* Column Header */}
      <div 
        className="p-4 border-b flex justify-between items-center rounded-t-2xl bg-white"
        style={{ borderBottomColor: headerBorderColor }}
      >
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }}></span>
          <h3 className="font-extrabold text-sm text-slate-800">{title}</h3>
          <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Cards container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tasks.map(task => (
          <div
            key={task.id}
            onClick={() => onOpenTask(task)}
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', task.id.toString());
            }}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-grab hover:shadow-md hover:border-indigo-300 hover:scale-[1.01] active:cursor-grabbing transition-all flex flex-col gap-2.5"
          >
            {/* Task Description and Edit Button */}
            <div className="flex justify-between items-start gap-2">
              <div className="font-bold text-xs text-slate-800 leading-tight">
                {task.description}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTask(task);
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                title="Editar Actividad"
              >
                <FileText className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Section Tag */}
            {task.section && (
              <div className="self-start">
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                  {task.section}
                </span>
              </div>
            )}

            {/* Footer metadata */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-1.5 border-t border-slate-50 mt-1">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{task.days !== null ? `${task.days} d` : '-'}</span>
              </div>
              {task.estimated_date && (
                <div className="flex items-center gap-1 text-slate-500">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <span>{task.estimated_date}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold p-4 text-center">
            Arrastra tareas aquí
          </div>
        )}
      </div>
    </div>
  );
};
