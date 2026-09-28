/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { apiFetch } from '../lib/api';
import { auth, firebaseConfigured } from '../lib/firebase';

export type StaffProfile = { uid: string; role: 'doctor' | 'employee'; displayName: string; specialty: string | null };
type AuthState = { user: User | null; profile: StaffProfile | null; loading: boolean; error: string | null; logout: () => Promise<void>; reloadProfile: () => Promise<StaffProfile> };
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reloadProfile() {
    const response = await apiFetch('/api/auth/me');
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(payload.error || (response.status === 403 ? 'This Firebase account has not been enabled for staff access.' : 'Could not verify your staff role.'));
    }
    const result = await response.json() as StaffProfile;
    setProfile(result);
    setError(null);
    return result;
  }

  useEffect(() => {
    if (!firebaseConfigured || !auth) { setLoading(false); return; }
    return onAuthStateChanged(auth, async current => {
      setUser(current); setProfile(null); setError(null); setLoading(true);
      if (!current) { setLoading(false); return; }
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL?.replace(/\/$/, '') || (import.meta.env.DEV ? 'http://localhost:4000' : '')}/api/auth/me`, {
          headers: { Authorization: `Bearer ${await current.getIdToken()}` },
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(payload.error || (response.status === 403 ? 'This Firebase account has not been enabled for staff access.' : 'Could not verify your staff role.'));
        }
        setProfile(await response.json() as StaffProfile);
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Staff verification failed.'); }
      finally { setLoading(false); }
    });
  }, []);

  const value = useMemo<AuthState>(() => ({
    user, profile, loading, error,
    logout: async () => { if (auth) await signOut(auth); setProfile(null); },
    reloadProfile,
  }), [user, profile, loading, error]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
