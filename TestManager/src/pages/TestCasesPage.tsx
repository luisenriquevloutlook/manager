import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTest } from '../contexts/TestContext';
import { TEST_RESULTS } from '../utils/testResults';
import type { TestModule, TestPriority, TestCase } from '../types/test.types';

export default function TestCasesPage() {
  const navigate = useNavigate();
  const { testCases, loading, deleteTestCase, addTestCase, updateTestCase, getTestCaseExecutions, modules, projectConfig } = useTest();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<TestPriority | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state para nuevo caso
  const [formData, setFormData] = useState({
    code: '',
    module: '' as TestModule | '',
    name: '',
    description: '',
    preconditions: '',
    steps: [''],
    expectedResult: '',
    priority: 'MEDIA' as TestPriority,
    assignedTo: '',
    estimatedTime: 5,
    tags: '',
  });

  // Obtener todos los módulos disponibles (predeterminados + personalizados)
  const availableModules = modules;

  // Filtrar casos de prueba
  // Cargar tester por defecto al abrir modal de crear
  useEffect(() => {
    if (showCreateModal) {
      const defaultTester = projectConfig.defaultTester;
      if (defaultTester && !formData.assignedTo) {
        setFormData(prev => ({ ...prev, assignedTo: defaultTester }));
      }
    }
  }, [showCreateModal, projectConfig]);

  const filteredCases = testCases.filter(tc => {
    const matchesModule = !selectedModule || tc.module === selectedModule;
    const matchesPriority = !selectedPriority || tc.priority === selectedPriority;
    const matchesSearch = !searchTerm || 
      tc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesModule && matchesPriority && matchesSearch;
  });

  const handleExecute = (testCaseId: string) => {
    navigate(`/execution/${testCaseId}`);
  };

  const handleViewDetails = (testCase: TestCase) => {
    setSelectedTestCase(testCase);
    setShowDetailModal(true);
  };

  const handleDelete = async (id: string, code: string) => {
    if (confirm(`¿Estás seguro de eliminar el caso de prueba ${code}?\n\n⚠️ Esta acción no se puede deshacer.`)) {
      const success = await deleteTestCase(id);
      if (success) {
        alert('✅ Caso de prueba eliminado exitosamente');
      } else {
        alert('❌ Error: No se pudo eliminar el caso de prueba');
      }
    }
  };

  const handleEdit = (testCase: TestCase) => {
    setSelectedTestCase(testCase);
    setFormData({
      code: testCase.code,
      module: testCase.module,
      name: testCase.name,
      description: testCase.description,
      preconditions: testCase.preconditions,
      steps: testCase.steps.length > 0 ? testCase.steps : [''],
      expectedResult: testCase.expectedResult,
      priority: testCase.priority,
      assignedTo: testCase.assignedTo || '',
      estimatedTime: testCase.estimatedTime || 5,
      tags: testCase.tags.join(', '),
    });
    setShowEditModal(true);
  };

  const handleUpdateTestCase = async () => {
    if (!selectedTestCase) return;

    // Validaciones
    if (!formData.code.trim()) {
      alert('El código es requerido');
      return;
    }
    if (!formData.module) {
      alert('El módulo es requerido');
      return;
    }
    if (!formData.name.trim()) {
      alert('El nombre es requerido');
      return;
    }
    if (!formData.expectedResult.trim()) {
      alert('El resultado esperado es requerido');
      return;
    }

    const updates: Partial<TestCase> = {
      code: formData.code.toUpperCase().trim(),
      module: formData.module as TestModule,
      name: formData.name.trim(),
      description: formData.description.trim(),
      preconditions: formData.preconditions.trim(),
      steps: formData.steps.filter(s => s.trim() !== ''),
      expectedResult: formData.expectedResult.trim(),
      priority: formData.priority,
      assignedTo: formData.assignedTo.trim() || undefined,
      estimatedTime: formData.estimatedTime,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== ''),
      updatedAt: new Date().toISOString(),
    };

    const updated = await updateTestCase(selectedTestCase.id, updates);

    if (!updated) {
      alert('❌ Error: No se pudo actualizar el caso de prueba');
      return;
    }

    // Reset form
    setFormData({
      code: '',
      module: '' as TestModule | '',
      name: '',
      description: '',
      preconditions: '',
      steps: [''],
      expectedResult: '',
      priority: 'MEDIA',
      assignedTo: '',
      estimatedTime: 5,
      tags: '',
    });

    setShowEditModal(false);
    setSelectedTestCase(null);
    alert('✅ Caso de prueba actualizado exitosamente');
  };

  const handleCreateTestCase = async () => {
    // Validaciones
    if (!formData.code.trim()) {
      alert('El código es requerido');
      return;
    }
    if (!formData.module) {
      alert('El módulo es requerido');
      return;
    }
    if (!formData.name.trim()) {
      alert('El nombre es requerido');
      return;
    }
    if (!formData.expectedResult.trim()) {
      alert('El resultado esperado es requerido');
      return;
    }

    const newTestCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'projectId'> = {
      code: formData.code.toUpperCase().trim(),
      module: formData.module as TestModule,
      name: formData.name.trim(),
      description: formData.description.trim(),
      preconditions: formData.preconditions.trim(),
      steps: formData.steps.filter(s => s.trim() !== ''),
      expectedResult: formData.expectedResult.trim(),
      priority: formData.priority,
      status: 'PENDIENTE',
      assignedTo: formData.assignedTo.trim() || undefined,
      estimatedTime: formData.estimatedTime,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== ''),
      version: projectConfig.matrixVersion,
    };

    await addTestCase(newTestCase);

    // Reset form
    setFormData({
      code: '',
      module: '' as TestModule | '',
      name: '',
      description: '',
      preconditions: '',
      steps: [''],
      expectedResult: '',
      priority: 'MEDIA',
      assignedTo: '',
      estimatedTime: 5,
      tags: '',
    });

    setShowCreateModal(false);
    alert('✅ Caso de prueba creado exitosamente');
  };

  const addStep = () => {
    setFormData({ ...formData, steps: [...formData.steps, ''] });
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = value;
    setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps.length > 0 ? newSteps : [''] });
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            📋 Casos de Prueba
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {filteredCases.length} de {testCases.length} casos
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          ➕ Nuevo Caso de Prueba
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Código, nombre o descripción..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Módulo
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            >
              <option value="">Todos</option>
              {availableModules.map(module => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Prioridad
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as TestPriority | '')}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            >
              <option value="">Todas</option>
              <option value="CRÍTICA">CRÍTICA</option>
              <option value="ALTA">ALTA</option>
              <option value="MEDIA">MEDIA</option>
              <option value="BAJA">BAJA</option>
            </select>
          </div>
        </div>
      </div>

      {/* Test Cases Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Código
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Nombre
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Módulo
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Prioridad
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Estado
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((tc) => (
                <tr key={tc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '600', fontFamily: 'monospace' }}>
                    {tc.code}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontWeight: '500' }}>{tc.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {tc.description.length > 80 ? tc.description.substring(0, 80) + '...' : tc.description}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span className="badge badge-info">
                      {tc.module}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span className={`badge badge-${
                      tc.priority === 'CRÍTICA' ? 'error' :
                      tc.priority === 'ALTA' ? 'warning' :
                      tc.priority === 'MEDIA' ? 'info' : 'neutral'
                    }`}>
                      {tc.priority}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span 
                      className="badge"
                      style={{
                        backgroundColor: TEST_RESULTS[tc.status]?.bgColor || 'rgba(107, 114, 128, 0.1)',
                        color: TEST_RESULTS[tc.status]?.color || '#6b7280',
                        border: `1px solid ${TEST_RESULTS[tc.status]?.color || '#6b7280'}`,
                      }}
                    >
                      {TEST_RESULTS[tc.status]?.icon || '○'} {TEST_RESULTS[tc.status]?.label || tc.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                        onClick={() => handleExecute(tc.id)}
                      >
                        ▶️ Ejecutar
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                        onClick={() => handleViewDetails(tc)}
                      >
                        👁️ Ver
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                        onClick={() => handleEdit(tc)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', border: '1px solid var(--error-color)' }}
                        onClick={() => handleDelete(tc.id, tc.code)}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCases.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No se encontraron casos de prueba con los filtros seleccionados
          </div>
        )}
      </div>

      {/* Modal Crear Caso de Prueba */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflowY: 'auto',
          padding: '2rem 0',
        }} onClick={() => setShowCreateModal(false)}>
          <div className="card" style={{ 
            maxWidth: '800px', 
            width: '90%', 
            maxHeight: '90vh', 
            overflowY: 'auto',
            margin: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '700' }}>
              ➕ Nuevo Caso de Prueba
            </h2>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Código */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Código * <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(ej: AUTH-001, USR-101)</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="MOD-###"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                />
              </div>

              {/* Módulo y Prioridad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Módulo *
                  </label>
                  <select
                    value={formData.module}
                    onChange={(e) => setFormData({ ...formData, module: e.target.value as TestModule })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {availableModules.map(mod => (
                      <option key={mod} value={mod}>{mod}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Prioridad *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TestPriority })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                    }}
                  >
                    <option value="CRÍTICA">CRÍTICA</option>
                    <option value="ALTA">ALTA</option>
                    <option value="MEDIA">MEDIA</option>
                    <option value="BAJA">BAJA</option>
                  </select>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre descriptivo del caso de prueba"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción detallada del caso de prueba"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Precondiciones */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Precondiciones
                </label>
                <textarea
                  value={formData.preconditions}
                  onChange={(e) => setFormData({ ...formData, preconditions: e.target.value })}
                  placeholder="Condiciones que deben cumplirse antes de ejecutar la prueba"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Pasos */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: '500' }}>
                    Pasos a Ejecutar
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addStep}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    ➕ Agregar Paso
                  </button>
                </div>
                {formData.steps.map((step, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ 
                      padding: '0.75rem', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: '8px',
                      fontWeight: '600',
                      minWidth: '40px',
                      textAlign: 'center',
                    }}>
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => updateStep(index, e.target.value)}
                      placeholder={`Paso ${index + 1}`}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                      }}
                    />
                    {formData.steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        style={{
                          padding: '0.75rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--error-color)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Resultado Esperado */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Resultado Esperado *
                </label>
                <textarea
                  value={formData.expectedResult}
                  onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
                  placeholder="Qué se espera que ocurra al ejecutar esta prueba"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Asignado a y Tiempo estimado */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Asignado a
                  </label>
                  <input
                    type="text"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    placeholder="Nombre del tester"
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
                    Tiempo (min)
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedTime}
                    onChange={(e) => setFormData({ ...formData, estimatedTime: parseInt(e.target.value) || 0 })}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                    }}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Etiquetas <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(separadas por comas)</span>
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateTestCase}
              >
                ✅ Crear Caso de Prueba
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Caso de Prueba */}
      {showEditModal && selectedTestCase && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflowY: 'auto',
          padding: '2rem 0',
        }} onClick={() => setShowEditModal(false)}>
          <div className="card" style={{ 
            maxWidth: '800px', 
            width: '90%', 
            maxHeight: '90vh', 
            overflowY: 'auto',
            margin: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '700' }}>
              ✏️ Editar Caso de Prueba: {selectedTestCase.code}
            </h2>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Código */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Código * <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(ej: AUTH-001, USR-101)</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="MOD-###"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                />
              </div>

              {/* Módulo y Prioridad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Módulo *
                  </label>
                  <select
                    value={formData.module}
                    onChange={(e) => setFormData({ ...formData, module: e.target.value as TestModule })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {availableModules.map(mod => (
                      <option key={mod} value={mod}>{mod}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Prioridad *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TestPriority })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                    }}
                  >
                    <option value="CRÍTICA">CRÍTICA</option>
                    <option value="ALTA">ALTA</option>
                    <option value="MEDIA">MEDIA</option>
                    <option value="BAJA">BAJA</option>
                  </select>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre descriptivo del caso de prueba"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción detallada del caso de prueba"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Precondiciones */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Precondiciones
                </label>
                <textarea
                  value={formData.preconditions}
                  onChange={(e) => setFormData({ ...formData, preconditions: e.target.value })}
                  placeholder="Condiciones que deben cumplirse antes de ejecutar la prueba"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Pasos */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: '500' }}>
                    Pasos a Ejecutar
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addStep}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    ➕ Agregar Paso
                  </button>
                </div>
                {formData.steps.map((step, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ 
                      padding: '0.75rem', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: '8px',
                      fontWeight: '600',
                      minWidth: '40px',
                      textAlign: 'center',
                    }}>
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => updateStep(index, e.target.value)}
                      placeholder={`Paso ${index + 1}`}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                      }}
                    />
                    {formData.steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        style={{
                          padding: '0.75rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--error-color)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Resultado Esperado */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Resultado Esperado *
                </label>
                <textarea
                  value={formData.expectedResult}
                  onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
                  placeholder="Qué se espera que ocurra al ejecutar esta prueba"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Asignado a y Tiempo estimado */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Asignado a
                  </label>
                  <input
                    type="text"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    placeholder="Nombre del tester"
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
                    Tiempo (min)
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedTime}
                    onChange={(e) => setFormData({ ...formData, estimatedTime: parseInt(e.target.value) || 0 })}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                    }}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Etiquetas <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(separadas por comas)</span>
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedTestCase(null);
                }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleUpdateTestCase}
              >
                💾 Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalles */}
      {showDetailModal && selectedTestCase && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {selectedTestCase.code}
                </h2>
                <h3 style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {selectedTestCase.name}
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '500',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
              }}>
                📦 {selectedTestCase.module}
              </span>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '500',
                background: 
                  selectedTestCase.priority === 'CRÍTICA' ? 'rgba(220, 38, 38, 0.1)' :
                  selectedTestCase.priority === 'ALTA' ? 'rgba(234, 88, 12, 0.1)' :
                  selectedTestCase.priority === 'MEDIA' ? 'rgba(202, 138, 4, 0.1)' :
                  'rgba(22, 163, 74, 0.1)',
                color:
                  selectedTestCase.priority === 'CRÍTICA' ? '#dc2626' :
                  selectedTestCase.priority === 'ALTA' ? '#ea580c' :
                  selectedTestCase.priority === 'MEDIA' ? '#ca8a04' :
                  '#16a34a',
              }}>
                {selectedTestCase.priority === 'CRÍTICA' && '🔴'}
                {selectedTestCase.priority === 'ALTA' && '🟠'}
                {selectedTestCase.priority === 'MEDIA' && '🟡'}
                {selectedTestCase.priority === 'BAJA' && '🟢'}
                {' '}{selectedTestCase.priority}
              </span>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '500',
                background: TEST_RESULTS[selectedTestCase.status]?.bgColor || 'rgba(107, 114, 128, 0.1)',
                color: TEST_RESULTS[selectedTestCase.status]?.color || '#6b7280',
              }}>
                {TEST_RESULTS[selectedTestCase.status]?.icon || '○'} {TEST_RESULTS[selectedTestCase.status]?.label || selectedTestCase.status}
              </span>
              {selectedTestCase.tags.map((tag, idx) => (
                <span key={idx} style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  background: 'rgba(139, 92, 246, 0.1)',
                  color: '#8b5cf6',
                }}>
                  #{tag}
                </span>
              ))}
            </div>

            {/* Información */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {selectedTestCase.description && (
                <div>
                  <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    📝 Descripción
                  </h4>
                  <p style={{ lineHeight: '1.6' }}>{selectedTestCase.description}</p>
                </div>
              )}

              {selectedTestCase.preconditions && (
                <div>
                  <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    ⚙️ Precondiciones
                  </h4>
                  <p style={{ lineHeight: '1.6' }}>{selectedTestCase.preconditions}</p>
                </div>
              )}

              {selectedTestCase.steps.length > 0 && (
                <div>
                  <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    📋 Pasos a Ejecutar
                  </h4>
                  <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                    {selectedTestCase.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              <div>
                <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  ✅ Resultado Esperado
                </h4>
                <p style={{ lineHeight: '1.6' }}>{selectedTestCase.expectedResult}</p>
              </div>

              {/* Metadata */}
              <div style={{ 
                padding: '1rem', 
                background: 'var(--bg-secondary)', 
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                fontSize: '0.875rem',
              }}>
                {selectedTestCase.assignedTo && (
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Asignado a</div>
                    <div style={{ fontWeight: '600' }}>👤 {selectedTestCase.assignedTo}</div>
                  </div>
                )}
                {selectedTestCase.estimatedTime && (
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tiempo estimado</div>
                    <div style={{ fontWeight: '600' }}>⏱️ {selectedTestCase.estimatedTime} min</div>
                  </div>
                )}
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Versión</div>
                  <div style={{ fontWeight: '600' }}>📌 {selectedTestCase.version}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Creado</div>
                  <div style={{ fontWeight: '600' }}>
                    {new Date(selectedTestCase.createdAt).toLocaleDateString('es-GT')}
                  </div>
                </div>
              </div>

              {/* Ejecuciones */}
              {(() => {
                const executions = getTestCaseExecutions(selectedTestCase.id);
                if (executions.length > 0) {
                  return (
                    <div>
                      <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                        📊 Historial de Ejecuciones ({executions.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {executions.slice(0, 5).map((exec) => {
                          const resultConfig = TEST_RESULTS[exec.result];
                          return (
                            <div
                              key={exec.id}
                              style={{
                                padding: '0.75rem',
                                background: 'var(--bg-secondary)',
                                borderRadius: '8px',
                                borderLeft: `4px solid ${resultConfig.color}`,
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '1.25rem' }}>{resultConfig.icon}</span>
                                  <span style={{ fontWeight: '600', color: resultConfig.color }}>
                                    {resultConfig.label}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {new Date(exec.executedAt).toLocaleDateString('es-GT')}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                👤 {exec.executedBy} • ⏱️ {exec.duration}s
                                {exec.evidences.length > 0 && ` • 📎 ${exec.evidences.length} evidencia(s)`}
                              </div>
                              {exec.observations && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                  💬 {exec.observations}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {executions.length > 5 && (
                          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            +{executions.length - 5} ejecuciones más • Ver en Historial
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDetailModal(false)}
              >
                Cerrar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowDetailModal(false);
                  handleExecute(selectedTestCase.id);
                }}
              >
                ▶️ Ejecutar Prueba
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
