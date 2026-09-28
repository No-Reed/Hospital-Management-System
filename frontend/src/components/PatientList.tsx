import React, { useEffect, useState, type FormEvent } from 'react';
import styles from './PatientList.module.css';
import { apiFetch } from '../lib/api';

interface PatientData { _id: string; name: string; visits: number; lastVisit?: string }
interface DoctorOption { _id: string; name: string; specialty?: string }

export default function PatientList() {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [assignmentChoice, setAssignmentChoice] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [patientResponse, doctorResponse] = await Promise.all([apiFetch('/api/employee/patients'), apiFetch('/api/employee/doctors')]);
      if (!patientResponse.ok || !doctorResponse.ok) throw new Error('Unable to load clinic records.');
      setPatients(await patientResponse.json() as PatientData[]);
      setDoctors(await doctorResponse.json() as DoctorOption[]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load clinic records.'); }
  }

  useEffect(() => { void load(); }, []);

  async function createPatient(event: FormEvent) {
    event.preventDefault(); setError(''); setSaving(true);
    try {
      const response = await apiFetch('/api/employee/patients', { method: 'POST', body: JSON.stringify({ name: name.trim(), doctorId }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not create patient record.');
      setName('');
      setPatients(previous => [payload as PatientData, ...previous]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create patient record.'); }
    finally { setSaving(false); }
  }

  async function assignPatient(patientId: string) {
    const selectedDoctor = assignmentChoice[patientId];
    if (!selectedDoctor) return;
    setError(''); setAssigning(patientId);
    try {
      const response = await apiFetch(`/api/employee/patients/${patientId}/assign`, { method: 'POST', body: JSON.stringify({ doctorId: selectedDoctor }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not assign patient.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not assign patient.'); }
    finally { setAssigning(''); }
  }

  const filtered = patients.filter(patient => patient.name.toLowerCase().includes(search.toLowerCase()));
  return <div className={styles.container}>
    <form className={styles.createForm} onSubmit={event => void createPatient(event)}>
      <div><strong>Create a patient record</strong><span>Records are assigned to a doctor in your clinic.</span></div>
      <input aria-label="Patient name" value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={160} placeholder="Patient name" />
      <select aria-label="Assigned doctor" value={doctorId} onChange={event => setDoctorId(event.target.value)} required><option value="">Assign to doctor…</option>{doctors.map(doctor => <option key={doctor._id} value={doctor._id}>{doctor.name}{doctor.specialty ? ` · ${doctor.specialty}` : ''}</option>)}</select>
      <button disabled={saving || doctors.length === 0}>{saving ? 'Saving…' : 'Create record'}</button>
    </form>
    {error && <div className={styles.error} role="alert">{error}</div>}
    <div className={styles.header}><h3 style={{ margin: 0 }}>Patient Registry ({patients.length})</h3><input className={styles.search} placeholder="Search patient name…" value={search} onChange={event => setSearch(event.target.value)} /></div>
    <div className={styles.cardGrid}>{filtered.map(patient => <article key={patient._id} className={styles.patientCard}><div className={styles.name}>{patient.name}</div><div className={styles.info}>Visits: <strong>{patient.visits}</strong></div><div className={styles.info}>Last visit: {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'Not yet recorded'}</div><div className={styles.tag}>Patient record</div><div className={styles.assignRow}><select aria-label={`Assign ${patient.name} to doctor`} value={assignmentChoice[patient._id] || ''} onChange={event => setAssignmentChoice(previous => ({ ...previous, [patient._id]: event.target.value }))}><option value="">Assign to doctor…</option>{doctors.map(doctor => <option key={doctor._id} value={doctor._id}>{doctor.name}</option>)}</select><button disabled={!assignmentChoice[patient._id] || assigning === patient._id} onClick={() => void assignPatient(patient._id)}>{assigning === patient._id ? 'Assigning…' : 'Assign'}</button></div></article>)}
    {filtered.length === 0 && <div className={styles.empty}>No records found.</div>}</div>
  </div>;
}
