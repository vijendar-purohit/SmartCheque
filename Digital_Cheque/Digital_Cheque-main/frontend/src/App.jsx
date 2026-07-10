/**
 * App root.
 *
 * Wraps the router in <ErrorBoundary> and <AuthProvider>.
 * Routes are protected by guards that read from useAuth().
 * Role-based root redirect: BANK_OFFICER → /official/*, others → /customer/*.
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import Spinner from './components/Spinner';

import LoginPage from './pages/LoginPage';

// Customer layout
import CustomerLayout from './layouts/CustomerLayout';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import IssueCheque from './pages/customer/IssueCheque';
import MyCheques from './pages/customer/MyCheques';
import ChequeDetail from './pages/ChequeDetail';
import VerifyCheque from './pages/customer/VerifyCheque';
import SettingsPage from './pages/SettingsPage';

// Official layout
import OfficialLayout from './layouts/OfficialLayout';
import OfficialDashboard from './pages/official/OfficialDashboard';
import ReviewQueue from './pages/official/ReviewQueue';
import FraudDetail from './pages/official/FraudDetail';
import ClearingHouse from './pages/official/ClearingHouse';
import AuditLog from './pages/official/AuditLog';

const CustomerRoute = ({ children }) => {
  const { user, bootstrapping } = useAuth();
  if (bootstrapping) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'BANK_OFFICER') return <Navigate to="/official/dashboard" replace />;
  return children;
};

const OfficialRoute = ({ children }) => {
  const { user, bootstrapping } = useAuth();
  if (bootstrapping) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'BANK_OFFICER') return <Navigate to="/customer/dashboard" replace />;
  return children;
};

const FullPageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f7fafd]">
    <div className="text-center">
      <Spinner size="lg" />
      <p className="text-sm text-gray-400 mt-3">Loading SmartCheque…</p>
    </div>
  </div>
);

const RootRedirect = () => {
  const { user, bootstrapping } = useAuth();
  if (bootstrapping) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'BANK_OFFICER') return <Navigate to="/official/dashboard" replace />;
  return <Navigate to="/customer/dashboard" replace />;
};

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/login" element={<LoginPage />} />

    {/* Customer Routes */}
    <Route
      path="/customer"
      element={
        <CustomerRoute>
          <CustomerLayout />
        </CustomerRoute>
      }
    >
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<CustomerDashboard />} />
      <Route path="issue" element={<IssueCheque />} />
      <Route path="cheques" element={<MyCheques />} />
      <Route path="received" element={<MyCheques received />} />
      <Route path="cheque/:id" element={<ChequeDetail />} />
      <Route path="verify" element={<VerifyCheque />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>

    {/* Official Routes */}
    <Route
      path="/official"
      element={
        <OfficialRoute>
          <OfficialLayout />
        </OfficialRoute>
      }
    >
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<OfficialDashboard />} />
      <Route path="review" element={<ReviewQueue />} />
      <Route path="cheque/:id" element={<ChequeDetail officialView />} />
      <Route path="fraud" element={<FraudDetail />} />
      <Route path="fraud/:id" element={<FraudDetail />} />
      <Route path="clearing" element={<ClearingHouse />} />
      <Route path="audit" element={<AuditLog />} />
      <Route path="settings" element={<SettingsPage officialView />} />
    </Route>

    {/* Root redirect */}
    <Route path="/" element={<RootRedirect />} />

    {/* 404 */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;