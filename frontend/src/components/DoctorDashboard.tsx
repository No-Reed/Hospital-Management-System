import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import styles from './PortalPages.module.css';

type PatientRow = { _id: string; name: string; visits: number; lastVisit?: string };
type Visit = { _id: string; visitedAt?: string; status?: string; summary?: string };
type PatientDetail = { _id: string; name: string; age?: number; gender?: string; historySummary: string; conditions: string[]; allergies: string[]; visitHistory: Visit[] };
type Appointment = { _id: string; patientId?: string; patientName: string; doctorName: string; preferredTime: string; status: string; createdAt?: string };
type Props = { onLogout: () => void };

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload as T;
}

export default function DoctorDashboard({ onLogout }: Props) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'appointments' | 'patients'>('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [selected, setSelected] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [appointmentsData, patientsData] = await Promise.all([
        readJson<Appointment[]>('/api/doctor/appointments'),
        readJson<PatientRow[]>('/api/doctor/patients'),
      ]);
      setAppointments(appointmentsData); setPatients(patientsData);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load the doctor workspace.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function openPatient(patientId: string) {
    setSelected(null); setWorking(patientId); setError('');
    try { setSelected(await readJson<PatientDetail>(`/api/doctor/patients/${patientId}`)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not open this patient record.'); }
    finally { setWorking(''); }
  }

  async function updateStatus(appointment: Appointment) {
    const nextStatus = appointment.status === 'In Progress' ? 'Completed' : 'In Progress';
    setWorking(appointment._id); setError('');
    try {
      const updated = await readJson<Appointment>(`/api/doctor/appointments/${appointment._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
      setAppointments(previous => previous.map(item => item._id === updated._id ? updated : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update appointment.'); }
    finally { setWorking(''); }
  }

  return <main className={styles.staffPage}>
    <header className={styles.staffHeader}>
      <a className={styles.brand} href="/doctor"><img src="/stellarcare-mark.png" alt=""/><span>StellarCare<small>DOCTOR WORKSPACE</small></span></a>
      <div className={styles.staffHeaderActions}><span>{profile?.displayName}{profile?.specialty ? ` · ${profile.specialty}` : ''}</span><button onClick={() => void refresh()} disabled={loading}>Refresh</button><button onClick={onLogout}>Sign out</button></div>
    </header>
    <section className={styles.staffIntro}><div className={styles.eyebrow}>CARE TEAM WORKSPACE</div><h1>Your patients, in your care.</h1><p>Review assigned patient records and update visit progress.</p></section>
    <nav className={styles.tabs} aria-label="Doctor workspace pages"><button className={tab === 'appointments' ? styles.activeTab : ''} onClick={() => { setTab('appointments'); setSelected(null); }}>Appointments <span>{appointments.length}</span></button><button className={tab === 'patients' ? styles.activeTab : ''} onClick={() => { setTab('patients'); setSelected(null); }}>Assigned patients <span>{patients.length}</span></button></nav>
    {error && <div className={styles.notice} role="alert">{error}</div>}
    {loading ? <div className={styles.panel}>Loading your assigned work…</div> : tab === 'appointments' ? <section className={styles.panel}>
      <h2>Appointment requests and visits</h2>
      {appointments.length === 0 ? <p className={styles.muted}>No appointments are assigned to you yet.</p> : <div className={styles.list}>{appointments.map(item => <article className={styles.row} key={item._id}><div><strong>{item.patientName}</strong><p>{item.preferredTime} · Requested for {item.doctorName}</p><span className={styles.badge}>{item.status}</span></div><div className={styles.rowActions}>{item.patientId && <button onClick={() => { setTab('patients'); void openPatient(item.patientId!); }}>Patient record</button>}{item.status !== 'Completed' && item.status !== 'Cancelled' && <button disabled={working === item._id} onClick={() => void updateStatus(item)}>{working === item._id ? 'Saving…' : item.status === 'In Progress' ? 'Mark completed' : 'Start visit'}</button>}</div></article>)}</div>}
    </section> : <div className={styles.doctorGrid}><section className={styles.panel}><h2>Assigned patients</h2>{patients.length === 0 ? <p className={styles.muted}>No patients are assigned to your account. Ask an employee to link a booking to a record.</p> : <div className={styles.list}>{patients.map(patient => <button className={styles.patientButton} key={patient._id} onClick={() => void openPatient(patient._id)}><span><strong>{patient.name}</strong><small>{patient.visits} previous visits{patient.lastVisit ? ` · Last visit ${new Date(patient.lastVisit).toLocaleDateString()}` : ''}</small></span><span>{working === patient._id ? 'Loading…' : 'View record →'}</span></button>)}</div>}</section>
      <section className={styles.panel}><h2>{selected ? selected.name : 'Patient record'}</h2>{!selected ? <p className={styles.muted}>Select an assigned patient to view authorized clinical information and visit history.</p> : <div className={styles.record}><p>{[selected.age !== undefined ? `${selected.age} years` : '', selected.gender || ''].filter(Boolean).join(' · ') || 'Demographics not provided'}</p><h3>Clinical summary</h3><p>{selected.historySummary || 'No summary recorded.'}</p><h3>Conditions</h3><div className={styles.chips}>{selected.conditions.length ? selected.conditions.map(value => <span key={value}>{value}</span>) : <span>None listed</span>}</div><h3>Allergies</h3><div className={styles.chips}>{selected.allergies.length ? selected.allergies.map(value => <span key={value}>{value}</span>) : <span>None listed</span>}</div><h3>Visit history</h3>{selected.visitHistory.length ? selected.visitHistory.map(visit => <article className={styles.history} key={visit._id}><strong>{visit.visitedAt ? new Date(visit.visitedAt).toLocaleDateString() : 'Date not recorded'} · {visit.status || 'Visit'}</strong><p>{visit.summary || 'No visit summary recorded.'}</p></article>) : <p className={styles.muted}>No past visits recorded.</p>}</div>}</section></div>}
    <footer className={styles.footer}>Patient details are limited to your active clinic assignments. Follow clinic policy when documenting or updating care.</footer>
  </main>;
}
