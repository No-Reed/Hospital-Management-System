import React, { useState } from 'react';
import styles from './BookingList.module.css';
import { type Patient } from './MonitorCard';

interface PatientRecordOption { _id: string; name: string }
interface BookingListProps {
  bookings: Patient[];
  onDelete: (id: string) => void;
  patientRecords?: PatientRecordOption[];
  onLinkPatient?: (appointmentId: string, patientId: string) => Promise<void> | void;
  onConfirm?: (appointmentId: string) => Promise<void> | void;
}

export default function BookingList({ bookings, onDelete, patientRecords = [], onLinkPatient, onConfirm }: BookingListProps) {
  const [selectedPatient, setSelectedPatient] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState('');
  async function link(appointmentId: string) {
    const patientId = selectedPatient[appointmentId];
    if (!patientId || !onLinkPatient) return;
    setSaving(appointmentId);
    try { await onLinkPatient(appointmentId, patientId); }
    finally { setSaving(''); }
  }

  return <div className={styles.container}>
    <div className={styles.header}><div className={styles.title}>Appointment requests</div><div style={{ color: '#98a0b3', fontSize: 13 }}>Total: {bookings.length}</div></div>
    <table className={styles.table}>
      <thead><tr><th className={styles.th}>Patient/requester</th><th className={styles.th}>Doctor</th><th className={styles.th}>Preferred time</th><th className={styles.th}>Status</th><th className={styles.th}>Actions / record link</th></tr></thead>
      <tbody>{bookings.map((booking, index) => {
        const id = booking._id || booking.id || `row-${index}`;
        return <tr key={id} className={styles.row}>
          <td className={styles.td} style={{ fontWeight: 600 }}>{booking.name || 'New request'}{booking.contactInfo && <small className="booking-contact">{booking.contactInfo}</small>}</td>
          <td className={styles.td}>{booking.doctor || 'Care team'}</td>
          <td className={styles.td}>{booking.time || 'To be confirmed'}</td>
          <td className={styles.td}><span className={`${styles.status} ${booking.status === 'Completed' ? styles.done : styles.wait}`}>{booking.status || 'Requested'}</span></td>
          <td className={styles.td}><div className="booking-actions">
            {booking.status === 'Requested' && onConfirm && <button className="confirm-request" onClick={() => void onConfirm(id)}>Confirm request</button>}
            {booking.patientId ? <span className="record-linked">Linked to patient record</span> : <div className="record-linker"><select aria-label={`Existing patient for ${booking.name || 'request'}`} value={selectedPatient[id] || ''} onChange={event => setSelectedPatient(previous => ({ ...previous, [id]: event.target.value }))}><option value="">Link existing record…</option>{patientRecords.map(patient => <option value={patient._id} key={patient._id}>{patient.name}</option>)}</select><button disabled={!selectedPatient[id] || saving === id} onClick={() => void link(id)}>{saving === id ? 'Linking…' : 'Link'}</button></div>}
            {booking.status !== 'Completed' && booking.status !== 'Cancelled' && <button className={styles.cancelBtn} onClick={() => onDelete(id)}>Cancel</button>}
          </div></td>
        </tr>;
      })}
      {bookings.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No appointment requests yet.</td></tr>}</tbody>
    </table>
  </div>;
}
