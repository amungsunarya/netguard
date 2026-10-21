import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { Toast } from './components/ui/Toast';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import LoginPage from './pages/Login';
import OverviewPage from './pages/Overview';
import DevicesPage from './pages/Devices';
import AlertsPage from './pages/Alerts';
import LogsPage from './pages/LogExplorer';
import MetricsPage from './pages/Metrics';
import TopologyPage from './pages/Topology';
import RulesPage from './pages/Rules';
import UsersPage from './pages/Users';
import SettingsPage from './pages/Settings';
import SystemHealthPage from './pages/SystemHealth';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0F172A', color: '#F1F5F9' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/devices" element={<DevicesPage />} />
                <Route path="/topology" element={<TopologyPage />} />
                <Route path="/metrics" element={<MetricsPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/rules" element={<RulesPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/health" element={<SystemHealthPage />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}