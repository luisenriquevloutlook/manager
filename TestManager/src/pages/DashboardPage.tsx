import { useTest } from '../contexts/TestContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TEST_RESULTS } from '../utils/testResults';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#9ca3af', '#8b5cf6', '#6b7280'];

export default function DashboardPage() {
  const { statistics, loading, executions } = useTest();

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="page-container">
        <h1>Dashboard</h1>
        <p>No hay datos disponibles</p>
      </div>
    );
  }

  // Datos para gráfico de pastel
  const pieData = [
    { name: 'Aprobadas', value: statistics.approved, color: '#10b981' },
    { name: 'Fallas Críticas', value: statistics.criticalFailed, color: '#ef4444' },
    { name: 'Fallas Menores', value: statistics.minorFailed, color: '#f59e0b' },
    { name: 'En Proceso', value: statistics.inProgress, color: '#3b82f6' },
    { name: 'No Aplica', value: statistics.notApplicable, color: '#9ca3af' },
    { name: 'Requiere Actualización', value: statistics.requiresUpdate, color: '#8b5cf6' },
    { name: 'Pendientes', value: statistics.pending, color: '#6b7280' },
  ].filter(item => item.value > 0);

  // Datos para gráfico de barras por módulo
  const moduleData = Object.entries(statistics.moduleStats).map(([module, stats]) => ({
    module,
    ejecutadas: stats.executed,
    aprobadas: stats.approved,
    'fallas críticas': stats.criticalFailed,
    'fallas menores': stats.minorFailed,
    pendientes: stats.total - stats.executed,
  }));

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          📊 Dashboard de Pruebas
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Vista general del estado de las pruebas de MesaGo
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        <StatCard
          title="Total de Pruebas"
          value={statistics.total}
          icon="📋"
          color="var(--primary-color)"
        />
        <StatCard
          title="Ejecutadas"
          value={statistics.executed}
          subtitle={`${((statistics.executed / statistics.total) * 100).toFixed(1)}% del total`}
          icon="▶️"
          color="var(--info-color)"
        />
        <StatCard
          title="Aprobadas"
          value={statistics.approved}
          subtitle={`${statistics.passRate.toFixed(1)}% de aprobación`}
          icon="✓"
          color="#10b981"
        />
        <StatCard
          title="Fallas Críticas"
          value={statistics.criticalFailed}
          icon="✗"
          color="#ef4444"
        />
        <StatCard
          title="Fallas Menores"
          value={statistics.minorFailed}
          icon="△"
          color="#f59e0b"
        />
        <StatCard
          title="En Proceso"
          value={statistics.inProgress}
          icon="⚙"
          color="#3b82f6"
        />
        <StatCard
          title="No Aplica"
          value={statistics.notApplicable}
          icon="⊘"
          color="#9ca3af"
        />
        <StatCard
          title="Requiere Actualización"
          value={statistics.requiresUpdate}
          icon="📝"
          color="#8b5cf6"
        />
      </div>

      {/* Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        {/* Pie Chart */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            Distribución de Resultados
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            Pruebas por Módulo
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={moduleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="module" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="aprobadas" fill="#10b981" name="Aprobadas" />
              <Bar dataKey="fallas críticas" fill="#ef4444" name="Fallas Críticas" />
              <Bar dataKey="fallas menores" fill="#f59e0b" name="Fallas Menores" />
              <Bar dataKey="pendientes" fill="#9ca3af" name="Pendientes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Últimas Ejecuciones
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Código
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Resultado
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Ejecutado por
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody>
              {executions.slice(0, 5).map((exec) => {
                const resultConfig = TEST_RESULTS[exec.result];
                return (
                  <tr key={exec.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                      {exec.testCaseCode}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
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
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                      {exec.executedBy}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                      {new Date(exec.executedAt).toLocaleString('es-GT')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }: {
  title: string;
  value: number;
  subtitle?: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="card" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <div style={{
        fontSize: '3rem',
        width: '80px',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
        background: `${color}15`,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
          {title}
        </div>
        <div style={{ fontSize: '2rem', fontWeight: '700', color }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
