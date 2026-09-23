import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ChildFormPage from './pages/ChildFormPage.jsx';
import ChildDetailPage from './pages/ChildDetailPage.jsx';
import ChildHistoryPage from './pages/ChildHistoryPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import SpotifyCallbackPage from './pages/SpotifyCallbackPage.jsx';
import DeleteAccountPage from './pages/DeleteAccountPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/spotify-callback" element={<SpotifyCallbackPage />} />
      <Route path="/suppression-compte" element={<DeleteAccountPage />} />
      <Route path="/confidentialite" element={<PrivacyPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/children/new" element={<ChildFormPage />} />
          <Route path="/children/:id/edit" element={<ChildFormPage />} />
          <Route path="/children/:id" element={<ChildDetailPage />} />
          <Route path="/children/:id/history" element={<ChildHistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
