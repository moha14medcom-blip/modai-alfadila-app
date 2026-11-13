import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BootScreen } from './components/BootScreen';
import { Shell } from './components/Shell';
import { Toasts } from './components/Toasts';
import { useApp } from './state/context';
import AdminPage from './pages/AdminPage';
import FocusPage from './pages/FocusPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SocialPage from './pages/SocialPage';
import StorePage from './pages/StorePage';
import TasksPage from './pages/TasksPage';

/** `/admin` is reachable by the Super-Admin only — everyone else is bounced home. */
function AdminRoute() {
  const { isAdmin } = useApp();
  return isAdmin ? <AdminPage /> : <Navigate to="/" replace />;
}

export default function App() {
  const { ready, cloud, user } = useApp();

  return (
    <BrowserRouter>
      <Toasts />

      {!ready ? (
        <BootScreen />
      ) : cloud && !user ? (
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      ) : (
        <Shell>
          <Routes>
            <Route path="/" element={<TasksPage />} />
            <Route path="/focus" element={<FocusPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
      )}
    </BrowserRouter>
  );
}
