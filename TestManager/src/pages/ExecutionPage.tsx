import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTest } from '../contexts/TestContext';
import { apiService } from '../services/apiService';
import { 
  TEST_RESULTS, 
  DEFECT_SEVERITY, 
  requiresSeverity, 
  requiresErrorMessage 
} from '../utils/testResults';
import type { TestCase, TestResult, DefectSeverity } from '../types/test.types';

export default function ExecutionPage() {
  const { testCaseId } = useParams();
  const navigate = useNavigate();
  const { testCases, addExecution, getTestCaseExecutions, projectConfig } = useTest();
  
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [executedBy, setExecutedBy] = useState('');
  const [result, setResult] = useState<TestResult>('PENDIENTE');
  const [severity, setSeverity] = useState<DefectSeverity | undefined>(undefined);
  const [observations, setObservations] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [executing, setExecuting] = useState(false);

  // Cargar tester por defecto al montar/cambiar config
  useEffect(() => {
    const defaultTester = projectConfig.defaultTester;
    if (defaultTester) {
      setExecutedBy(defaultTester);
    }
  }, [projectConfig]);

  useEffect(() => {
    if (testCaseId) {
      const testCase = testCases.find(tc => tc.id === testCaseId);
      setSelectedTestCase(testCase || null);
    }
  }, [testCaseId, testCases]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const MAX_EVIDENCES = 3;
      
      if (files.length > MAX_EVIDENCES) {
        alert(
          `⚠️ Límite de evidencias excedido\n\n` +
          `Máximo: ${MAX_EVIDENCES} archivos\n` +
          `Seleccionados: ${files.length}\n\n` +
          `Por favor selecciona máximo ${MAX_EVIDENCES} imágenes para evitar problemas de almacenamiento.`
        );
        return;
      }
      
      setEvidenceFiles(files);
    }
  };

  const handleExecute = async () => {
    if (!selectedTestCase || !executedBy || result === 'PENDIENTE') {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    // Validar severidad si es una falla
    if (requiresSeverity(result) && !severity) {
      alert('Por favor selecciona la severidad del defecto');
      return;
    }

    // Validar mensaje de error si es requerido
    if (requiresErrorMessage(result) && !errorMessage.trim()) {
      alert('Por favor describe el error encontrado');
      return;
    }

    setExecuting(true);

    try {
      // Obtener ejecuciones previas para determinar retryCount
      const previousExecutions = getTestCaseExecutions(selectedTestCase.id);
      const failedExecutions = previousExecutions.filter(
        e => e.result === 'FALLA_CRITICA' || e.result === 'FALLA_MENOR'
      );
      const retryCount = failedExecutions.length;

      // Subir archivos de evidencias al backend Express
      const evidencesWithData = await Promise.all(
        evidenceFiles.map(async (file, index) => {
          const uploadResult = await apiService.uploadEvidence(file);
          return {
            id: `evid-${Date.now()}-${index}`,
            executionId: '', // Se asignará después
            type: 'IMAGE' as const,
            filename: uploadResult.filename,
            path: uploadResult.url, // URL relativa servida por el backend (ej: /evidences/filename.jpg)
            uploadedAt: new Date().toISOString(),
            size: file.size,
          };
        })
      );

      await addExecution({
        testCaseId: selectedTestCase.id,
        testCaseCode: selectedTestCase.code,
        executedBy,
        executedAt: new Date().toISOString(),
        duration: Math.floor(Math.random() * 60) + 10, // Simular duración
        result,
        severity: requiresSeverity(result) ? severity : undefined,
        observations,
        errorMessage: requiresErrorMessage(result) ? errorMessage : undefined,
        evidences: evidencesWithData,
        environment: {
          browser: navigator.userAgent,
          os: navigator.platform,
          frontendVersion: '1.0.0',
          apiVersion: '1.0.0',
        },
        retryCount,
        parentExecutionId: retryCount > 0 ? previousExecutions[0]?.id : undefined,
      });

      const resultLabel = TEST_RESULTS[result].label;
      alert(`✅ Ejecución registrada exitosamente\n\nCódigo: ${selectedTestCase.code}\nResultado: ${resultLabel}`);
      
      // Limpiar formulario
      setResult('PENDIENTE');
      setSeverity(undefined);
      setObservations('');
      setErrorMessage('');
      setEvidenceFiles([]);
      setSelectedTestCase(null);
      navigate('/history');
    } catch (error) {
      console.error('Error al ejecutar prueba:', error);
      
      // Mostrar error detallado
      let errorMsg = 'Error desconocido';
      let isQuotaError = false;
      
      if (error instanceof Error) {
        errorMsg = error.message;
        isQuotaError = error.name === 'QuotaExceededError' || errorMsg.includes('quota');
      } else if (typeof error === 'string') {
        errorMsg = error;
        isQuotaError = errorMsg.toLowerCase().includes('quota');
      }
      
      if (isQuotaError) {
        alert(
          `💾 Almacenamiento lleno (localStorage agotado)\n\n` +
          `El navegador tiene un límite de ~5-10MB para almacenar datos.\n` +
          `Las imágenes ocupan mucho espacio incluso comprimidas.\n\n` +
          `SOLUCIONES:\n` +
          `1. Ve a Configuración → "Limpiar Solo Ejecuciones"\n` +
          `2. Exporta tus datos antes de limpiar\n` +
          `3. Usa menos evidencias por ejecución (máx 2-3)\n` +
          `4. Reduce el tamaño de las imágenes antes de subirlas\n\n` +
          `Nota: Las imágenes ya se comprimen automáticamente,\n` +
          `pero el espacio es limitado.`
        );
      } else {
        alert(
          `❌ Error al registrar la ejecución\n\n` +
          `Detalles: ${errorMsg}\n\n` +
          `Revisa la consola del navegador (F12) para más información.`
        );
      }
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          ▶️ Ejecutar Prueba
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Registra la ejecución de un caso de prueba y sus resultados
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Selección de caso de prueba */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            Caso de Prueba
          </h2>

          {!selectedTestCase ? (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Seleccionar Caso *
              </label>
              <select
                onChange={(e) => {
                  const tc = testCases.find(t => t.id === e.target.value);
                  setSelectedTestCase(tc || null);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              >
                <option value="">-- Seleccionar --</option>
                {testCases.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.code} - {tc.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {selectedTestCase.code}
                </div>
                <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                  {selectedTestCase.name}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {selectedTestCase.description}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <strong>Precondiciones:</strong>
                <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                  {selectedTestCase.preconditions}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <strong>Pasos:</strong>
                <ol style={{ marginTop: '0.5rem', marginLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                  {selectedTestCase.steps.map((step, index) => (
                    <li key={index} style={{ marginBottom: '0.25rem' }}>{step}</li>
                  ))}
                </ol>
              </div>

              <div>
                <strong>Resultado Esperado:</strong>
                <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                  {selectedTestCase.expectedResult}
                </div>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => setSelectedTestCase(null)}
                style={{ marginTop: '1rem', width: '100%' }}
              >
                Cambiar Caso de Prueba
              </button>
            </div>
          )}
        </div>

        {/* Formulario de ejecución */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            Resultados de Ejecución
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Ejecutado por *
            </label>
            <input
              type="text"
              value={executedBy}
              onChange={(e) => setExecutedBy(e.target.value)}
              placeholder="Nombre del tester"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            />
            {projectConfig.defaultTester && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                💡 Auto-completado desde Configuración
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Resultado *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {(Object.keys(TEST_RESULTS) as TestResult[])
                .filter(r => r !== 'PENDIENTE') // Excluir PENDIENTE de las opciones
                .map((r) => {
                const config = TEST_RESULTS[r];
                return (
                  <button
                    key={r}
                    onClick={() => {
                      setResult(r);
                      // Limpiar severidad si no es una falla
                      if (!requiresSeverity(r)) {
                        setSeverity(undefined);
                      }
                      // Limpiar mensaje de error si no es requerido
                      if (!requiresErrorMessage(r)) {
                        setErrorMessage('');
                      }
                    }}
                    style={{
                      padding: '0.75rem',
                      border: `2px solid ${result === r ? config.color : 'var(--border-color)'}`,
                      borderRadius: '8px',
                      background: result === r ? config.bgColor : 'white',
                      color: result === r ? config.color : 'var(--text-primary)',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {config.icon} {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campo de severidad (solo para fallas) */}
          {requiresSeverity(result) && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Severidad del Defecto *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {(Object.keys(DEFECT_SEVERITY) as DefectSeverity[]).map((s) => {
                  const config = DEFECT_SEVERITY[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setSeverity(s)}
                      style={{
                        padding: '0.75rem',
                        border: `2px solid ${severity === s ? config.color : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        background: severity === s ? config.bgColor : 'white',
                        color: severity === s ? config.color : 'var(--text-primary)',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left',
                      }}
                    >
                      <div>{config.icon} {config.label}</div>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8 }}>
                        {config.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Observaciones
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notas, comentarios, detalles de la ejecución..."
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '1rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          {requiresErrorMessage(result) && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Descripción del Error/Defecto *
              </label>
              <textarea
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                placeholder="Describe el error encontrado..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--error-color)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Evidencias (Imágenes)
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            />
            {evidenceFiles.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {evidenceFiles.length} archivo(s) seleccionado(s)
              </div>
            )}
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '0.75rem', 
              background: 'rgba(59, 130, 246, 0.1)', 
              borderRadius: '6px', 
              fontSize: '0.75rem',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <strong>ℹ️ Optimizaciones automáticas:</strong>
              <div style={{ marginTop: '0.25rem' }}>
                • Máximo 3 evidencias por ejecución (límite forzado)
                <br />
                • Imágenes redimensionadas a 600px máximo
                <br />
                • Compresión automática al 50% (JPEG)
                <br />
                • Ahorra ~60-80% de espacio por imagen
              </div>
            </div>
          </div>

          <button
            className="btn btn-success"
            onClick={handleExecute}
            disabled={!selectedTestCase || !executedBy || result === 'PENDIENTE' || executing}
            style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
          >
            {executing ? '⏳ Registrando...' : '✅ Registrar Ejecución'}
          </button>
        </div>
      </div>
    </div>
  );
}
