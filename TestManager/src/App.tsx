import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TestProvider } from './contexts/TestContext';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import TestCasesPage from './pages/TestCasesPage';
import ExecutionPage from './pages/ExecutionPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <TestProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="test-cases" element={<TestCasesPage />} />
            <Route path="execution" element={<ExecutionPage />} />
            <Route path="execution/:testCaseId" element={<ExecutionPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TestProvider>
  );
}

export default App;
