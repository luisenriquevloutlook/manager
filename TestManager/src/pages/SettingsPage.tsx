import { useState, useEffect } from 'react';
import { useTest } from '../contexts/TestContext';

export default function SettingsPage() {
  const { 
    testCases, 
    executions, 
    statistics, 
    projects, 
    currentProjectId, 
    addProject, 
    deleteProject,
    modules,
    projectConfig,
    addModule,
    updateModule,
    deleteModule,
    updateConfig,
  } = useTest();

  const [newModuleName, setNewModuleName] = useState('');
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editModuleName, setEditModuleName] = useState('');
  
  // Estados para configuración general (controlados localmente, sincronizados con context)
  const [defaultTester, setDefaultTester] = useState('');
  const [matrixVersion, setMatrixVersion] = useState('1.1');

  // Estados para creación de proyecto
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Sincronizar campos de config con el context cuando cambia el proyecto activo
  useEffect(() => {
    setDefaultTester(projectConfig.defaultTester);
    setMatrixVersion(projectConfig.matrixVersion);
  }, [projectConfig]);

  // Guardar tester por defecto cuando cambia
  const handleDefaultTesterChange = (value: string) => {
    setDefaultTester(value);
    updateConfig({ defaultTester: value });
  };

  // Guardar versión de matriz cuando cambia
  const handleMatrixVersionChange = (value: string) => {
    setMatrixVersion(value);
    updateConfig({ matrixVersion: value });
  };

  // Agregar nuevo módulo
  const handleAddModule = async () => {
    const trimmedName = newModuleName.trim().toUpperCase();
    
    if (!trimmedName) {
      alert('⚠️ El nombre del módulo no puede estar vacío');
      return;
    }

    if (modules.includes(trimmedName)) {
      alert('⚠️ Este módulo ya existe en este proyecto');
      return;
    }

    if (trimmedName.length > 20) {
      alert('⚠️ El nombre del módulo no puede exceder 20 caracteres');
      return;
    }

    if (!/^[A-Z0-9_]+$/.test(trimmedName)) {
      alert('⚠️ El nombre del módulo solo puede contener letras mayúsculas, números y guiones bajos');
      return;
    }

    try {
      await addModule(trimmedName);
      setNewModuleName('');
      alert(`✅ Módulo "${trimmedName}" agregado exitosamente`);
    } catch (err: any) {
      alert(`❌ Error: ${err?.response?.data?.error || 'No se pudo agregar el módulo'}`);
    }
  };

  // Eliminar módulo
  const handleDeleteModule = async (moduleName: string) => {
    // Verificar si hay casos de prueba usando este módulo
    const casesUsingModule = testCases.filter(tc => tc.module === moduleName);
    
    if (casesUsingModule.length > 0) {
      const confirmText = `⚠️ ADVERTENCIA\n\nHay ${casesUsingModule.length} caso(s) de prueba usando el módulo "${moduleName}".\n\nSi eliminas este módulo, esos casos quedarán con un módulo inválido.\n\n¿Deseas continuar?`;
      if (!confirm(confirmText)) return;
    }

    try {
      await deleteModule(moduleName);
      alert(`🗑️ Módulo "${moduleName}" eliminado`);
    } catch (err: any) {
      alert(`❌ Error: ${err?.response?.data?.error || 'No se pudo eliminar el módulo'}`);
    }
  };

  // Iniciar edición de módulo
  const handleEditModule = (oldName: string) => {
    setEditingModule(oldName);
    setEditModuleName(oldName);
  };

  const handleSaveEdit = async () => {
    if (!editingModule) return;

    const trimmedName = editModuleName.trim().toUpperCase();
    
    if (!trimmedName) {
      alert('⚠️ El nombre del módulo no puede estar vacío');
      return;
    }

    if (trimmedName === editingModule) {
      setEditingModule(null);
      return;
    }

    if (modules.includes(trimmedName)) {
      alert('⚠️ Este nombre ya existe en los módulos del proyecto');
      return;
    }

    if (!/^[A-Z0-9_]+$/.test(trimmedName)) {
      alert('⚠️ El nombre del módulo solo puede contener letras mayúsculas, números y guiones bajos');
      return;
    }

    try {
      await updateModule(editingModule, trimmedName);
      setEditingModule(null);
      setEditModuleName('');
      alert(`✅ Módulo actualizado: "${editingModule}" → "${trimmedName}"`);
    } catch (err: any) {
      alert(`❌ Error: ${err?.response?.data?.error || 'No se pudo actualizar el módulo'}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingModule(null);
    setEditModuleName('');
  };

  // Crear nuevo proyecto
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      alert('⚠️ El nombre del proyecto es obligatorio');
      return;
    }
    setIsCreatingProject(true);
    try {
      await addProject(newProjectName.trim(), newProjectDesc.trim());
      setNewProjectName('');
      setNewProjectDesc('');
      alert('✅ Proyecto creado con éxito y establecido como activo.');
    } catch (error) {
      console.error(error);
      alert('❌ Error al crear el proyecto en el servidor.');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Eliminar proyecto
  const handleDeleteProject = async (id: number, name: string) => {
    if (id === 1) {
      alert('⚠️ No se puede eliminar el proyecto por defecto.');
      return;
    }
    const confirmDelete = confirm(
      `⚠️ ¿Estás seguro de eliminar el proyecto "${name}"?\n\n` +
      `Se eliminarán permanentemente todos sus casos de prueba, ejecuciones e imágenes de evidencias en el servidor.\n\n` +
      `ESTA ACCIÓN ES IRREVERSIBLE.`
    );
    if (confirmDelete) {
      try {
        const success = await deleteProject(id);
        if (success) {
          alert('🗑️ Proyecto y todos sus datos relacionados eliminados.');
        } else {
          alert('❌ No se pudo eliminar el proyecto.');
        }
      } catch (error) {
        console.error(error);
        alert('❌ Error al eliminar el proyecto.');
      }
    }
  };

  // Descargar reporte en PDF
  const handleDownloadPDFReport = () => {
    window.open(`http://localhost:3030/api/reports/project/${currentProjectId}/pdf`, '_blank');
  };

  // Exportar casos de prueba a JSON
  const handleExportJSON = () => {
    const data = {
      testCases,
      executions,
      statistics,
      exportedAt: new Date().toISOString(),
      version: '1.1',
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mesago-test-data-project-${currentProjectId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('✅ Datos del proyecto activo exportados exitosamente');
  };



  // Obtener el nombre del proyecto activo
  const activeProjectName = projects.find(p => p.id === currentProjectId)?.name || 'Cargando...';

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          ⚙️ Configuración
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Ajustes, gestión de proyectos y reportes del sistema de pruebas
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        
        {/* Gestión de Proyectos */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📁 Gestión de Proyectos
          </h2>
          
          {/* Formulario Nuevo Proyecto */}
          <form onSubmit={handleCreateProject} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem' }}>➕ Crear Nuevo Proyecto</h3>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <input
                type="text"
                placeholder="Nombre del proyecto"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                required
                style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.875rem' }}
              />
              <input
                type="text"
                placeholder="Descripción del proyecto"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.875rem' }}
              />
              <button type="submit" disabled={isCreatingProject} className="btn btn-primary" style={{ padding: '0.6rem' }}>
                {isCreatingProject ? 'Creando...' : 'Crear Proyecto'}
              </button>
            </div>
          </form>

          {/* Listado de Proyectos */}
          <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem' }}>Proyectos Registrados</h3>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {projects.map((proj) => (
              <div
                key={proj.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: proj.id === currentProjectId ? 'rgba(30, 58, 138, 0.05)' : 'transparent',
                  borderRadius: '8px',
                  border: proj.id === currentProjectId ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                }}
              >
                <div>
                  <strong style={{ color: proj.id === currentProjectId ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                    {proj.name} {proj.id === currentProjectId && '📍 (Activo)'}
                  </strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {proj.description || 'Sin descripción.'} — {proj.caseCount ?? 0} Casos de prueba
                  </div>
                </div>
                {proj.id !== 1 && (
                  <button
                    className="btn btn-error"
                    onClick={() => handleDeleteProject(proj.id, proj.name)}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    🗑️ Eliminar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* General */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            Ajustes de Prueba
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Versión de Matriz
              </label>
              <input
                type="text"
                value={matrixVersion}
                onChange={(e) => handleMatrixVersionChange(e.target.value)}
                placeholder="Ej: 1.1, 2.0"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Tester por Defecto
              </label>
              <input
                type="text"
                value={defaultTester}
                onChange={(e) => handleDefaultTesterChange(e.target.value)}
                placeholder="Nombre del tester"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                }}
              />
            </div>
          </div>
        </div>

        {/* MySQL Database Info */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            🗄️ Base de Datos Centralizada (MySQL)
          </h2>
          <div style={{ 
            padding: '1rem', 
            background: 'rgba(34, 197, 94, 0.1)', 
            borderRadius: '8px',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}>
            <div style={{ fontSize: '0.875rem', display: 'grid', gap: '0.5rem' }}>
              <div>🟢 <strong>Estado:</strong> Conectado a MySQL (localhost:3306)</div>
              <div>📂 <strong>Base de datos:</strong> <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: '4px' }}>testmanager</code></div>
              <div>📁 <strong>Proyecto Activo:</strong> {activeProjectName} (ID: {currentProjectId})</div>
              <div>📋 <strong>Casos en Proyecto:</strong> {testCases.length} casos de prueba</div>
              <div>▶️ <strong>Ejecuciones en Proyecto:</strong> {executions.length} ejecuciones</div>
            </div>
          </div>
        </div>

        {/* Reportes y Exportación */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            📄 Generación de Reportes y Descargas
          </h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleDownloadPDFReport} style={{ background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', border: 'none', fontWeight: '600' }}>
              📕 Descargar Reporte PDF (Proyecto Activo)
            </button>
            <button className="btn btn-secondary" onClick={handleExportJSON}>
              💾 Exportar Datos del Proyecto (JSON)
            </button>
          </div>
        </div>

        {/* Gestión de Módulos */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            📦 Gestión de Módulos
          </h2>
          


          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
              Módulos del Proyecto ({modules.length})
            </h3>
            
            {modules.length > 0 ? (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {modules.map(module => (
                  <div
                    key={module}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {editingModule === module ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                        <input
                          type="text"
                          value={editModuleName}
                          onChange={(e) => setEditModuleName(e.target.value.toUpperCase())}
                          placeholder="NOMBRE_MODULO"
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: '1px solid var(--primary-color)',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                          }}
                          autoFocus
                        />
                        <button
                          className="btn btn-success"
                          onClick={handleSaveEdit}
                          style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                        >
                          ✅ Guardar
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={handleCancelEdit}
                          style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                        >
                          ❌ Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="badge badge-success" style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                          {module}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleEditModule(module)}
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="btn btn-error"
                            onClick={() => handleDeleteModule(module)}
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                No hay módulos personalizados. Agrega uno usando el formulario a continuación.
              </p>
            )}
          </div>

          <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
              ➕ Agregar Nuevo Módulo
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value.toUpperCase())}
                placeholder="NOMBRE_MODULO"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddModule();
                  }
                }}
              />
              <button
                className="btn btn-primary"
                onClick={handleAddModule}
                disabled={!newModuleName.trim()}
                style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem' }}
              >
                ➕ Agregar
              </button>
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              💡 Solo letras mayúsculas, números y guiones bajos. Máximo 20 caracteres.
            </p>
          </div>
        </div>

        {/* Acerca de */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'white' }}>
            📖 Acerca de
          </h2>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Test Manager</strong> es un sistema profesional de gestión de pruebas
            diseñado para facilitar la ejecución, seguimiento y documentación de casos de prueba.
          </p>
          <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            Desarrollado en React + TypeScript + Vite con base de datos en MySQL y backend en Express.
          </p>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
            © 2026 Luis Enrique Vázquez - Todos los derechos reservados
          </div>
        </div>
      </div>
    </div>
  );
}
