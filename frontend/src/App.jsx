import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Events from './pages/Events.jsx';
import Analytics from './pages/Analytics.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import IncidentIntelligence from './pages/IncidentIntelligence.jsx';
import AskAtmos from './pages/AskAtmos.jsx';
import Login from './pages/Login.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-400 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?return=${encodeURIComponent('/admin')}`} replace />;
  }

  // The API enforces this with 403 as well; the guard only hides the UI.
  if (user?.role !== 'admin') {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold text-white">Administrator access required</h1>
        <p className="text-sm text-gray-400">
          The admin panel is restricted to administrators. Your current role is "{user?.role}".
        </p>
      </div>
    );
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <Dashboard />
          </Layout>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <Layout>
            <Dashboard />
          </Layout>
        }
      />
      <Route
        path="/ask-atmos"
        element={
          <Layout>
            <AskAtmos />
          </Layout>
        }
      />
      <Route
        path="/events"
        element={
          <Layout>
            <Events />
          </Layout>
        }
      />
      <Route
        path="/analytics"
        element={
          <Layout>
            <Analytics />
          </Layout>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Layout>
              <AdminPanel />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/events/:eventId/intelligence"
        element={
          <Layout>
            <IncidentIntelligence />
          </Layout>
        }
      />
      {/* Legacy home path redirects into the public platform. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
