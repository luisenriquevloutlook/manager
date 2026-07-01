import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProjectProvider } from './contexts/ProjectContext';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { GanttPage } from './pages/GanttPage';
import { TimelinePage } from './pages/TimelinePage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <ProjectProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/gantt" element={<GanttPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ProjectProvider>
  );
}

export default App;
