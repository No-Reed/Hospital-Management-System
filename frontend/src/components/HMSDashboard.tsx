import React, { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import MonitorCard, { type Patient } from './MonitorCard';
import BookingList from './BookingList';
import PatientList from './PatientList';
import PrescriptionForm from './PrescriptionForm';
import StartupScreen from './StartupScreen';
import io from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch, API_BASE } from '../lib/api';
import { auth } from '../lib/firebase';

type AppointmentResponse = {
  _id: string;
  patientName: string;
  doctorName: string;
  slotTime: string;
  preferredTime?: string;
  patientId?: string;
  contactInfo?: string;
  status: string;
};

const pageTitles: Record<string, string> = {
  monitor: 'Overview',
  bookings: 'Appointments',
  patients: 'Patients',
  prescriptions: 'Prescriptions',
};

export default function HMSDashboard() {
  const { profile, user, logout } = useAuth();
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('monitor');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [linkTargets, setLinkTargets] = useState<Array<{ _id: string; name: string }>>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setIsSyncing(true);
    try {
      const response = await apiFetch('/api/employee/appointments');
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data = await response.json() as AppointmentResponse[];
      const formattedData: Patient[] = data.map((appointment) => ({
        _id: appointment._id,
        name: appointment.patientName,
        doctor: appointment.doctorName,
        time: appointment.preferredTime || appointment.slotTime,
        status: appointment.status,
        patientId: appointment.patientId,
        contactInfo: appointment.contactInfo,
      }));
      setPatients(formattedData);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    void apiFetch('/api/employee/patients').then(async response => {
      if (!response.ok) throw new Error('Patient list unavailable');
      const rows = await response.json() as Array<{ _id: string; name: string }>;
      setLinkTargets(rows);
    }).catch(error => console.error('Failed to fetch employee patient list:', error));
  }, []);

  useEffect(() => {
    let active = true;
    void fetchAppointments();
    if (user && auth) {
      void user.getIdToken().then(token => {
        if (!active) return;
        const connection = io(API_BASE, { auth: { token } });
        socketRef.current = connection;
        connection.on('appointment:requested', () => void fetchAppointments());
        connection.on('appointment:updated', () => void fetchAppointments());
      }).catch(error => console.error('Could not authenticate the employee socket:', error));
    }
    return () => { active = false; socketRef.current?.disconnect(); socketRef.current = null; };
  }, [user, fetchAppointments]);

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const response = await apiFetch(`/api/employee/appointments/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Cancellation failed (${response.status})`);
      setPatients((previous) => previous.map((patient) => patient._id === id ? { ...patient, status: 'Cancelled' } : patient));
    } catch (error) {
      console.error('Cancellation failed:', error);
    }
  }

  async function handleLinkAppointment(appointmentId: string, patientId: string) {
    try {
      const response = await apiFetch(`/api/employee/appointments/${appointmentId}/patient`, { method: 'PATCH', body: JSON.stringify({ patientId }) });
      if (!response.ok) throw new Error(`Link request failed (${response.status})`);
      await fetchAppointments();
    } catch (error) {
      console.error('Could not link appointment to patient record:', error);
      window.alert('We could not link this request. Please try again.');
    }
  }

  async function handleConfirmAppointment(appointmentId: string) {
    try {
      const response = await apiFetch(`/api/employee/appointments/${appointmentId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'Scheduled' }) });
      if (!response.ok) throw new Error(`Confirmation failed (${response.status})`);
      await fetchAppointments();
    } catch (error) {
      console.error('Could not confirm appointment:', error);
      window.alert('We could not confirm this request. Refresh the list and try again.');
    }
  }

  if (loading) return <StartupScreen onFinish={() => setLoading(false)} />;

  const today = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  }).format(new Date());
  const waitingCount = patients.filter((patient) => patient.status === 'Waiting').length;
  const inProgressCount = patients.filter((patient) => patient.status === 'In Progress').length;
  const completedCount = patients.filter((patient) => patient.status === 'Completed').length;

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} onNavigate={setActiveTab} displayName={profile?.displayName || 'Employee'} roleLabel="Employee workspace" onLogout={() => void logout()} />
      <main className="main-column">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{pageTitles[activeTab]}</strong></div>
          <div className="topbar-actions">
            <div className="today-label"><span className="today-dot" />{today}</div>
            <button className="sync-button" onClick={() => void fetchAppointments()} disabled={isSyncing}>
              <svg className={isSyncing ? 'sync-icon is-syncing' : 'sync-icon'} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M16.3 8A6.5 6.5 0 0 0 4.9 5.3L3.5 6.7M3.5 6.7V3.9M3.5 6.7h2.8M3.7 12a6.5 6.5 0 0 0 11.4 2.7l1.4-1.4m0 0v2.8m0-2.8h-2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isSyncing ? 'Syncing' : 'Refresh'}
            </button>
          </div>
        </header>

        <div className="page-content">
          {activeTab === 'monitor' && (
            <>
              <section className="welcome-banner">
                <div className="banner-copy">
                  <span className="eyebrow"><span className="eyebrow-sparkle">✦</span> A LITTLE MORE HUMAN, EVERY DAY</span>
                  <h1>Care that runs<br /><span>smoothly.</span></h1>
                  <p>Your clinic at a glance. Make room for what matters most — your patients.</p>
                  <div className="banner-footnote"><span className="banner-footnote-dot" />Here with you, every step of the day</div>
                </div>
                <div className="banner-orbit orbit-one" />
                <div className="banner-orbit orbit-two" />
                <div className="banner-illustration-wrap">
                  <div className="illustration-halo" />
                  <img src="/clinician-illustration.png" alt="A welcoming StellarCare clinician" className="clinician-illustration" />
                  <div className="floating-note"><span className="floating-note-icon">✦</span><span><strong>People first</strong><small>Every visit, every day</small></span></div>
                </div>
                <div className="banner-date">{today}</div>
              </section>

              <section className="stat-grid" aria-label="Today's appointment summary">
                <article className="stat-card stat-card-teal">
                  <div className="stat-top"><span className="stat-label">Today’s appointments</span><span className="stat-icon stat-icon-teal"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="6" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.7"/><path d="M8 4v4m8-4v4M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></span></div>
                  <div className="stat-value">{patients.length}<span className="stat-unit"> {patients.length === 1 ? 'visit' : 'visits'}</span></div>
                  <div className="stat-caption">Your day, one patient at a time</div>
                  <div className="stat-progress"><span style={{ width: patients.length ? `${Math.min(100, patients.length * 9)}%` : '4%' }} /></div>
                </article>
                <article className="stat-card stat-card-peach">
                  <div className="stat-top"><span className="stat-label">Waiting with us</span><span className="stat-icon stat-icon-peach"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7.5v5l3 1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></span></div>
                  <div className="stat-value">{waitingCount}<span className="stat-unit"> {waitingCount === 1 ? 'person' : 'people'}</span></div>
                  <div className="stat-caption">Ready when your team is</div>
                  <div className="stat-progress peach-progress"><span style={{ width: patients.length ? `${Math.max(10, (waitingCount / patients.length) * 100)}%` : '10%' }} /></div>
                </article>
                <article className="stat-card stat-card-lilac">
                  <div className="stat-top"><span className="stat-label">With the care team</span><span className="stat-icon stat-icon-lilac"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20s-7.5-4.5-7.5-10.1A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.5C19.5 15.5 12 20 12 20Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M8 12h2.5l1.2-2.1 1.7 4 1-1.9H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span></div>
                  <div className="stat-value">{inProgressCount}<span className="stat-unit"> in care</span></div>
                  <div className="stat-caption">{completedCount} {completedCount === 1 ? 'visit' : 'visits'} completed with care</div>
                  <div className="stat-progress lilac-progress"><span style={{ width: patients.length ? `${Math.max(8, (completedCount / patients.length) * 100)}%` : '8%' }} /></div>
                </article>
              </section>

              <section className="dashboard-grid">
                <MonitorCard title="Today’s care queue" patients={patients.filter(patient => patient.status !== 'Cancelled')} onDelete={handleDelete} />
                <aside className="employee-action-card"><span className="employee-action-icon">✳</span><h2>Appointment requests</h2><p>Review and coordinate incoming requests with your care team.</p><strong>{patients.filter(patient => patient.status === 'Requested').length} awaiting review</strong><button onClick={() => setActiveTab('bookings')}>Review appointments →</button></aside>
              </section>
              <div className="dashboard-bottomline"><span className="bottomline-mark">✳</span><span>Good care starts with a little more breathing room.</span><span className="bottomline-right">{completedCount} {completedCount === 1 ? 'visit' : 'visits'} wrapped up today</span></div>
            </>
          )}
          {activeTab === 'bookings' && (
            <section className="secondary-page"><div className="section-intro"><span className="eyebrow">YOUR DAY, MADE CLEARER</span><h1>Appointments</h1><p>Every visit, in one calm and easy-to-scan place.</p></div><BookingList bookings={patients} onDelete={handleDelete} patientRecords={linkTargets} onLinkPatient={handleLinkAppointment} onConfirm={handleConfirmAppointment} /></section>
          )}
          {activeTab === 'patients' && (
            <section className="secondary-page"><div className="section-intro"><span className="eyebrow">PEOPLE AT THE HEART OF IT</span><h1>Patients</h1><p>Thoughtful care begins with remembering the person.</p></div><PatientList /></section>
          )}
          {activeTab === 'prescriptions' && (
            <section className="secondary-page"><div className="section-intro"><span className="eyebrow">CLEAR NOTES, CONTINUED CARE</span><h1>Prescriptions</h1><p>Prepare a clear medication plan for every patient.</p></div><PrescriptionForm /></section>
          )}
        </div>
      </main>
    </div>
  );
}
