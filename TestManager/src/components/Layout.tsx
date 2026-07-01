import { Outlet, NavLink } from 'react-router-dom';
import { useTest } from '../contexts/TestContext';

export default function Layout() {
  const { projects, currentProjectId, changeProject } = useTest();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)',
        color: 'white',
        padding: '1.5rem',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}>
            <span style={{ fontSize: '2rem' }}>🧪</span>
            <div>
              <div>Test Manager</div>
              <div style={{ fontSize: '0.75rem', fontWeight: '400', opacity: 0.9 }}>
                Sistema de Gestión de Pruebas
              </div>
            </div>
          </h1>

          {/* Selector de Proyecto */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="project-select" style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: '500' }}>
              Proyecto Activo:
            </label>
            <select
              id="project-select"
              value={currentProjectId}
              onChange={(e) => changeProject(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: '500',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} style={{ color: 'var(--text-primary)', background: 'white' }}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavItem to="/dashboard" icon="📊" label="Dashboard" />
          <NavItem to="/test-cases" icon="📋" label="Casos de Prueba" />
          <NavItem to="/execution" icon="▶️" label="Ejecutar Pruebas" />
          <NavItem to="/history" icon="📜" label="Historial" />
          <NavItem to="/settings" icon="⚙️" label="Configuración" />
        </nav>

        {/* Footer */}
        <div style={{
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.2)',
          fontSize: '0.75rem',
          opacity: 0.8,
        }}>
          <div>Versión 1.0.0</div>
          <div>Puerto: 6180</div>
          <div style={{ marginTop: '0.5rem' }}>
            © 2026 Luis Enrique Vázquez
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: '500',
        color: 'white',
        textDecoration: 'none',
        background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
        transition: 'all 0.2s',
      })}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
      }}
      onMouseLeave={(e) => {
        const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
        e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.15)' : 'transparent';
      }}
    >
      <span style={{ fontSize: '1.25rem' }}>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}
