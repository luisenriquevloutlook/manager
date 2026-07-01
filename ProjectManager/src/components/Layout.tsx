import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { 
  LayoutDashboard, 
  ListTodo, 
  CalendarDays, 
  History, 
  Settings, 
  Plus, 
  FolderKanban, 
  Download,
  FolderOpen,
  Menu
} from 'lucide-react';
import { apiService } from '../services/apiService';

interface LayoutProps {
  children: React.ReactNode;
}

function NavItem({ to, icon, label, isCollapsed }: { to: string; icon: React.ReactNode; label: string; isCollapsed: boolean }) {
  return (
    <NavLink
      to={to}
      title={isCollapsed ? label : undefined}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: 'white',
        textDecoration: 'none',
        background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
        transition: 'all 0.2s',
      })}
      onMouseEnter={(e) => {
        const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
        e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)';
      }}
      onMouseLeave={(e) => {
        const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
        e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.18)' : 'transparent';
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      {!isCollapsed && <span>{label}</span>}
    </NavLink>
  );
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { 
    projects, 
    currentProjectId, 
    currentProject, 
    changeProject, 
    addProject 
  } = useProject();

  const location = useLocation();
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  
  // Persist sidebar state in localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard de Avance';
      case '/tasks': return 'Plan de Trabajo - Actividades';
      case '/gantt': return 'Cronograma / Diagrama de Gantt';
      case '/timeline': return 'Línea de Tiempo / Bitácora';
      case '/settings': return 'Configuración del Proyecto';
      default: return 'Gestión de Proyectos';
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    try {
      await addProject(newProjName, newProjDesc);
      setNewProjName('');
      setNewProjDesc('');
      setShowAddProject(false);
    } catch (error) {
      alert('Error al crear el proyecto.');
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f6f8fa] text-[#1e293b]">
      
      {/* SIDEBAR NAVIGATION */}
      <aside 
        style={{
          width: isSidebarCollapsed ? '64px' : '260px',
          background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)',
          color: 'white',
          padding: isSidebarCollapsed ? '1.5rem 0.5rem' : '1.5rem',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.3s ease-in-out',
          flexShrink: 0,
        }}
      >
        {/* UPPER PART */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: isSidebarCollapsed ? 'center' : 'stretch' }}>
          
          {/* LOGO AND TOGGLE */}
          <div style={{
            display: 'flex',
            flexDirection: isSidebarCollapsed ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
            marginBottom: '2rem',
            width: '100%',
            gap: isSidebarCollapsed ? '1rem' : '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '0.6rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FolderKanban className="h-5 w-5 text-white" />
              </div>
              {!isSidebarCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h1 style={{
                    fontSize: '1.25rem',
                    fontWeight: '800',
                    color: 'white',
                    lineHeight: '1.1',
                    margin: 0
                  }}>
                    MesaGo
                  </h1>
                  <span style={{
                    fontSize: '0.65rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    ProjectManager
                  </span>
                </div>
              )}
            </div>

            <button 
              onClick={toggleSidebar}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* PROJECT SELECTOR */}
          {!isSidebarCollapsed ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '2rem', width: '100%' }}>
              <label htmlFor="project-select" style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: '600', color: 'white' }}>
                Proyecto Activo:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <select
                    id="project-select"
                    value={currentProjectId}
                    onChange={(e) => changeProject(parseInt(e.target.value, 10))}
                    style={{
                      width: '100%',
                      padding: '0.5rem 2rem 0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none'
                    }}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} style={{ color: 'var(--text-primary)', background: 'white' }}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <FolderOpen className="h-4 w-4" />
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddProject(true)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  title="Crear Nuevo Proyecto"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', width: '100%' }}>
              <button 
                onClick={() => setShowAddProject(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '0.6rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                title="Crear Nuevo Proyecto"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* NAVIGATION */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            <NavItem to="/" icon={<LayoutDashboard className="h-5 w-5" />} label="Dashboard" isCollapsed={isSidebarCollapsed} />
            <NavItem to="/tasks" icon={<ListTodo className="h-5 w-5" />} label="Tareas" isCollapsed={isSidebarCollapsed} />
            <NavItem to="/gantt" icon={<CalendarDays className="h-5 w-5" />} label="Cronograma" isCollapsed={isSidebarCollapsed} />
            <NavItem to="/timeline" icon={<History className="h-5 w-5" />} label="Bitácora" isCollapsed={isSidebarCollapsed} />
            <NavItem to="/settings" icon={<Settings className="h-5 w-5" />} label="Configuración" isCollapsed={isSidebarCollapsed} />
          </nav>
        </div>

        {/* BOTTOM PART / USER PROFILE */}
        <div style={{
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          width: '100%',
          justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
        }}>
          <div 
            style={{
              height: '40px',
              width: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.25)',
              fontWeight: 'bold',
              color: 'white',
              flexShrink: 0
            }}
            title={isSidebarCollapsed ? "Administrador (MesaGo Devs)" : undefined}
          >
            A
          </div>
          {!isSidebarCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white', lineHeight: '1.2' }}>Administrador</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.8, color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>MesaGo Devs</span>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f6f8fa] text-[#1e293b]">
        
        {/* HEADER */}
        <header className="h-20 border-b border-slate-200 px-8 flex justify-between items-center bg-white shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 leading-tight">
              {getPageTitle()}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Contexto: <span className="text-indigo-600 font-semibold">{currentProject?.name || 'MesaGo'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href={apiService.getReportPdfUrl(currentProjectId)}
              download
              className="btn btn-secondary !py-2.5 text-xs flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </a>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* MODAL CREAR PROYECTO */}
      {showAddProject && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="text-lg font-bold mb-4">Crear Nuevo Proyecto</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Nombre del Proyecto
                </label>
                <input 
                  type="text" 
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="Ej. MesaGo App Cocina"
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <textarea 
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Detalles sobre el proyecto..."
                  className="w-full h-24 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddProject(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Crear Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
