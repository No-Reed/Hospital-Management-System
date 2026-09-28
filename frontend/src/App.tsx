import { useEffect, useState } from 'react';
import HMSDashboard from './components/HMSDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import PublicBookingPage from './components/PublicBookingPage';
import StaffLogin from './components/StaffLogin';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

function navigate(path: string) {
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function Router() {
  const [path, setPath] = useState(window.location.pathname);
  const { user, profile, loading, error, logout } = useAuth();

  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user && profile) {
      const home = profile.role === 'doctor' ? '/doctor' : '/employee';
      if (path === '/' || path === '/doctor/login' || path === '/employee/login') navigate(home);
      else if (path.startsWith('/doctor') && profile.role !== 'doctor') navigate(home);
      else if (path.startsWith('/employee') && profile.role !== 'employee') navigate(home);
    } else if (!user && path.startsWith('/doctor') && path !== '/doctor/login') navigate('/doctor/login');
    else if (!user && path.startsWith('/employee') && path !== '/employee/login') navigate('/employee/login');
  }, [user, profile, loading, path]);

  if (path === '/doctor/login' || path === '/employee/login') {
    if (user && profile && !loading) return <p className="portal-loading">Opening your workspace…</p>;
    return <StaffLogin role={path === '/doctor/login' ? 'doctor' : 'employee'} onNavigate={navigate} />;
  }

  if (path.startsWith('/doctor')) {
    if (loading || !user || !profile) return <p className="portal-loading">{error || 'Verifying doctor access…'}</p>;
    if (profile.role !== 'doctor') return <p className="portal-loading">Opening your authorized workspace…</p>;
    return <DoctorDashboard onLogout={() => void logout()} />;
  }

  if (path.startsWith('/employee')) {
    if (loading || !user || !profile) return <p className="portal-loading">{error || 'Verifying employee access…'}</p>;
    if (profile.role !== 'employee') return <p className="portal-loading">Opening your authorized workspace…</p>;
    return <HMSDashboard />;
  }

  return <PublicBookingPage onNavigate={navigate} />;
}

export default function App() {
  return <AuthProvider><Router /></AuthProvider>;
}
