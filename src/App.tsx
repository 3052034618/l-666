import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from './store/useAuthStore.js';
import { MainLayout } from './components/layout/MainLayout.js';
import { ProtectedRoute } from './components/common/ProtectedRoute.js';

import LoginPage from './pages/Login.js';
import DashboardPage from './pages/Dashboard.js';
import UploadPage from './pages/Upload.js';
import TasksPage from './pages/Tasks.js';
import TaskDetailPage from './pages/TaskDetail.js';
import AlertsPage from './pages/Alerts.js';
import ReportsPage from './pages/Reports.js';
import ExportPage from './pages/Export.js';
import RecommendationsPage from './pages/Recommendations.js';
import ApprovalsPage from './pages/Approvals.js';
import SettingsPage from './pages/Settings.js';

const App = () => {
  const { initializeAuth, user } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#0A2463',
          colorInfo: '#3E92CC',
          colorError: '#D8315B',
          borderRadius: 8,
        },
        components: {
          Button: {
            controlHeight: 40,
          },
          Card: {
            headerBg: 'rgba(10, 36, 99, 0.02)',
          },
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload"
            element={
              <ProtectedRoute allowedRoles={['analyst', 'geologist', 'admin']}>
                <MainLayout>
                  <UploadPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TasksPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tasks/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TaskDetailPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/alerts"
            element={
              <ProtectedRoute allowedRoles={['analyst', 'geologist', 'engineer', 'admin']}>
                <MainLayout>
                  <AlertsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ReportsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/export"
            element={
              <ProtectedRoute allowedRoles={['analyst', 'engineer', 'admin']}>
                <MainLayout>
                  <ExportPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/recommendations"
            element={
              <ProtectedRoute allowedRoles={['analyst', 'director', 'admin']}>
                <MainLayout>
                  <RecommendationsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/approvals"
            element={
              <ProtectedRoute allowedRoles={['engineer', 'director', 'admin']}>
                <MainLayout>
                  <ApprovalsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MainLayout>
                  <SettingsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

export default App;
