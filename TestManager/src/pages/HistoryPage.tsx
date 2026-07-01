import { useState } from 'react';
import { useTest } from '../contexts/TestContext';
import { TEST_RESULTS, DEFECT_SEVERITY } from '../utils/testResults';
import type { TestResult, TestExecution } from '../types/test.types';

export default function HistoryPage() {
  const { executions, testCases } = useTest();
  const [selectedResult, setSelectedResult] = useState<TestResult | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExecution, setSelectedExecution] = useState<TestExecution | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const filteredExecutions = executions.filter(exec => {
    const matchesResult = !selectedResult || exec.result === selectedResult;
    const matchesSearch = !searchTerm ||
      exec.testCaseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.executedBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesResult && matchesSearch;
  });

  const getTestCaseName = (testCaseId: string) => {
    return testCases.find(tc => tc.id === testCaseId)?.name || 'Desconocido';
  };

  const handleViewDetails = (execution: TestExecution) => {
    setSelectedExecution(execution);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedExecution(null);
  };

  const formatEnvironment = (env: TestExecution['environment']) => {
    if (!env) return 'No especificado';
    const parts: string[] = [];
    if (env.browser) parts.push(`🌐 ${env.browser}`);
    if (env.os) parts.push(`💻 ${env.os}`);
    if (env.frontendVersion) parts.push(`⚛️ v${env.frontendVersion}`);
    if (env.apiVersion) parts.push(`🔌 API v${env.apiVersion}`);
    return parts.length > 0 ? parts.join(' • ') : 'No especificado';
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          📜 Historial de Ejecuciones
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {filteredExecutions.length} de {executions.length} ejecuciones
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Código o ejecutado por..."
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
              Resultado
            </label>
            <select
              value={selectedResult}
              onChange={(e) => setSelectedResult(e.target.value as TestResult | '')}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            >
              <option value="">Todos</option>
              {(Object.keys(TEST_RESULTS) as TestResult[]).map(result => {
                const config = TEST_RESULTS[result];
                return (
                  <option key={result} value={result}>
                    {config.icon} {config.label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Executions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredExecutions.map((exec) => {
          const resultConfig = TEST_RESULTS[exec.result];
          const severityConfig = exec.severity ? DEFECT_SEVERITY[exec.severity] : null;
          
          return (
            <div key={exec.id} className="card">
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1rem', alignItems: 'start' }}>
                {/* Icon */}
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  background: resultConfig.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                }}>
                  {resultConfig.icon}
                </div>

                {/* Content */}
                <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '700', fontSize: '1.125rem', fontFamily: 'monospace' }}>
                    {exec.testCaseCode}
                  </span>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    background: resultConfig.bgColor,
                    color: resultConfig.color,
                  }}>
                    {resultConfig.icon} {resultConfig.label}
                  </span>
                  {severityConfig && (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      background: severityConfig.bgColor,
                      color: severityConfig.color,
                    }}>
                      {severityConfig.icon} Severidad: {severityConfig.label}
                    </span>
                  )}
                  {exec.retryCount > 0 && (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#f59e0b',
                    }}>
                      Reintento #{exec.retryCount}
                    </span>
                  )}
                </div>

                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  {getTestCaseName(exec.testCaseId)}
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  <span>👤 {exec.executedBy}</span>
                  <span>📅 {new Date(exec.executedAt).toLocaleString('es-GT')}</span>
                  <span>⏱️ {exec.duration}s</span>
                  {exec.evidences.length > 0 && (
                    <span>📎 {exec.evidences.length} evidencia(s)</span>
                  )}
                </div>

                {exec.observations && (
                  <div style={{
                    padding: '0.75rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    marginBottom: '0.5rem',
                  }}>
                    <strong>Observaciones:</strong> {exec.observations}
                  </div>
                )}

                {exec.errorMessage && (
                  <div style={{
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--error-color)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    color: 'var(--error-color)',
                  }}>
                    <strong>Error:</strong> {exec.errorMessage}
                  </div>
                )}

                {exec.evidences.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <strong style={{ fontSize: '0.875rem' }}>Evidencias:</strong>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {exec.evidences.map((evidence) => (
                        <div
                          key={evidence.id}
                          style={{
                            padding: '0.5rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          📸 {evidence.filename}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                  onClick={() => handleViewDetails(exec)}
                >
                  👁️ Ver Detalles
                </button>
              </div>
            </div>
          </div>
          );
        })}

        {filteredExecutions.length === 0 && (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No se encontraron ejecuciones con los filtros seleccionados
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedExecution && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  📋 Detalles de Ejecución
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {selectedExecution.testCaseCode}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: 'var(--text-secondary)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Test Case Info */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Caso de Prueba
              </h3>
              <div className="card" style={{ background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Código
                    </span>
                    <div style={{ fontWeight: '600', fontFamily: 'monospace', fontSize: '1.125rem', marginTop: '0.25rem' }}>
                      {selectedExecution.testCaseCode}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Nombre
                    </span>
                    <div style={{ fontWeight: '500', marginTop: '0.25rem' }}>
                      {getTestCaseName(selectedExecution.testCaseId)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Execution Result */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Resultado
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {(() => {
                  const resultConfig = TEST_RESULTS[selectedExecution.result];
                  return (
                    <div style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      background: resultConfig.bgColor,
                      color: resultConfig.color,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>{resultConfig.icon}</span>
                      {resultConfig.label}
                    </div>
                  );
                })()}
                {selectedExecution.severity && (() => {
                  const severityConfig = DEFECT_SEVERITY[selectedExecution.severity];
                  return (
                    <div style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      background: severityConfig.bgColor,
                      color: severityConfig.color,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>{severityConfig.icon}</span>
                      Severidad: {severityConfig.label}
                    </div>
                  );
                })()}
                {selectedExecution.retryCount > 0 && (
                  <div style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: '#f59e0b',
                  }}>
                    🔄 Reintento #{selectedExecution.retryCount}
                  </div>
                )}
              </div>
            </div>

            {/* Execution Details */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Información de Ejecución
              </h3>
              <div className="card" style={{ background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      👤 Ejecutado por
                    </span>
                    <div style={{ fontWeight: '500', marginTop: '0.25rem' }}>
                      {selectedExecution.executedBy}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📅 Fecha y Hora
                    </span>
                    <div style={{ fontWeight: '500', marginTop: '0.25rem' }}>
                      {new Date(selectedExecution.executedAt).toLocaleString('es-GT')}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      ⏱️ Duración
                    </span>
                    <div style={{ fontWeight: '500', marginTop: '0.25rem' }}>
                      {selectedExecution.duration} segundos
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🖥️ Ambiente
                    </span>
                    <div style={{ fontWeight: '500', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                      {formatEnvironment(selectedExecution.environment)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Observations */}
            {selectedExecution.observations && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  📝 Observaciones
                </h3>
                <div className="card" style={{ background: 'var(--bg-secondary)' }}>
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {selectedExecution.observations}
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {selectedExecution.errorMessage && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--error-color)' }}>
                  ❌ Mensaje de Error
                </h3>
                <div className="card" style={{ 
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--error-color)',
                }}>
                  <p style={{ color: 'var(--error-color)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {selectedExecution.errorMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Evidences */}
            {selectedExecution.evidences.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  📎 Evidencias ({selectedExecution.evidences.length})
                </h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {selectedExecution.evidences.map((evidence) => (
                    <div key={evidence.id} className="card" style={{ background: 'var(--bg-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>📸</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                            {evidence.filename}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {evidence.type}
                          </div>
                        </div>
                      </div>
                      {(evidence.type === 'IMAGE' || evidence.type === 'SCREENSHOT') && (evidence.dataUrl || evidence.path) && (
                        <div style={{
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-color)',
                        }}>
                          <img
                            src={evidence.dataUrl || (evidence.path.startsWith('http') ? evidence.path : `http://localhost:3030${evidence.path}`)}
                            alt={evidence.filename}
                            style={{ width: '100%', display: 'block' }}
                          />
                        </div>
                      )}
                      {evidence.description && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {evidence.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={handleCloseModal}
                className="btn btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
