import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { auth, firebaseConfigured } from '../lib/firebase';
import styles from './PortalPages.module.css';

type Role = 'doctor' | 'employee';
export default function StaffLogin({ role, onNavigate }: { role: Role; onNavigate: (path: string) => void }) {
  const { reloadProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const label = role === 'doctor' ? 'Doctor' : 'Employee';

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (!firebaseConfigured || !auth) throw new Error('Firebase sign-in is not configured yet. Add the VITE_FIREBASE_* values from frontend/.env.example.');
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const profile = await reloadProfile();
      if (profile.role !== role) {
        await auth.signOut();
        throw new Error(`This account is registered as ${profile.role}, not ${role}.`);
      }
      onNavigate(role === 'doctor' ? '/doctor' : '/employee');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '';
      const isActionableStaffError = /registered as|not provisioned|not enabled for staff|role claims are missing or stale|verify your staff email/i.test(message);
      setError(isActionableStaffError ? message : 'Sign-in failed. Check your credentials and staff access, then try again.');
    } finally { setBusy(false); }
  }

  return <main className={styles.authPage}>
    <a className={styles.brand} href="/" onClick={event => { event.preventDefault(); onNavigate('/'); }}><img src="/stellarcare-mark.png" alt=""/><span>StellarCare<small>CARE, MADE CLOSER</small></span></a>
    <section className={styles.authCard}>
      <div className={styles.eyebrow}>STAFF WORKSPACE</div>
      <h1>{label} sign in</h1>
      <p>Use your clinic-issued account. Patient and public visitors can request an appointment without signing in.</p>
      <form onSubmit={event => void submit(event)}>
        <label htmlFor="staff-email">Work email</label>
        <input id="staff-email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} />
        <label htmlFor="staff-password">Password</label>
        <input id="staff-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
        {error && <div className={styles.error} role="alert">{error}</div>}
        <button disabled={busy || !firebaseConfigured}>{busy ? 'Signing in…' : `Sign in as ${label.toLowerCase()}`}</button>
      </form>
      {!firebaseConfigured && <p className={styles.hint}>Set the Firebase web app values in <code>frontend/.env</code>, then restart Vite.</p>}
      <button type="button" className={styles.textButton} onClick={() => onNavigate(role === 'doctor' ? '/employee/login' : '/doctor/login')}>Switch sign-in type</button>
    </section>
    <p className={styles.publicLink}>Need an appointment? <button onClick={() => onNavigate('/')}>Request one without signing in</button></p>
  </main>;
}
