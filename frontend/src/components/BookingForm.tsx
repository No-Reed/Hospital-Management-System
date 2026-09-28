import React, { useState } from 'react';
import styles from './BookingForm.module.css';

export type Doctor = { _id: string; name: string };
export type BookingData = { doctor: string; name: string; time: string; contact: string };
type AvailabilityResult = { available?: boolean; suggestions?: string[] };
type BookingFormProps = {
  doctors?: Doctor[];
  onCheck?: (args: { doctor: string; time: string }) => Promise<AvailabilityResult>;
  onBook?: (args: BookingData) => Promise<boolean | void> | boolean | void;
};

export default function BookingForm({ doctors = [], onCheck, onBook }: BookingFormProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [doctor, setDoctor] = useState('');
  const [time, setTime] = useState('10:00');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const selectedDoctor = doctor || doctors[0]?._id || '';

  async function checkAvailability() {
    if (!onCheck) return;
    try {
      const result = await onCheck({ doctor, time });
      setSuggestions(result.suggestions ?? []);
    } catch (error) {
      console.error('Could not check appointment availability:', error);
    }
  }

  async function book() {
    if (!name.trim()) {
      document.getElementById('patient-name')?.focus();
      return window.alert('Please enter a patient name');
    }
    if (!contact.trim()) {
      document.getElementById('patient-contact')?.focus();
      return window.alert('Please enter an email address or phone number for the clinic to contact you');
    }
    try {
      const succeeded = await onBook?.({ doctor: selectedDoctor, name: name.trim(), time, contact: contact.trim() });
      if (succeeded === false) return;
      setName(''); setContact('');
    } catch {
      window.alert('We could not save this request. Please try again.');
    }
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeading}>
        <span className={styles.panelIcon} aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></span>
        <div><div className={styles.panelTitle}>Make a little room</div><div className={styles.panelSubtitle}>Book a visit with your care team</div></div>
      </div>

      <label className={styles.label} htmlFor="doctor-choice">Care provider</label>
      <select id="doctor-choice" className={styles.input} value={selectedDoctor} onChange={(event) => setDoctor(event.target.value)}>
        {doctors.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
      </select>

      <label className={styles.label} htmlFor="patient-name">Patient name</label>
      <input id="patient-name" className={styles.input} value={name} onChange={(event) => setName(event.target.value)} placeholder="Who are we caring for?" autoComplete="name" />

      <label className={styles.label} htmlFor="patient-contact">Email or phone for confirmation</label>
      <input id="patient-contact" className={styles.input} value={contact} onChange={(event) => setContact(event.target.value)} placeholder="you@example.com or 555-0100" autoComplete="email" />

      <label className={styles.label} htmlFor="preferred-time">Preferred time</label>
      <input id="preferred-time" className={styles.input} value={time} onBlur={() => void checkAvailability()} onChange={(event) => setTime(event.target.value)} placeholder="e.g. 10:00 AM" />

      {suggestions.length > 0 && <div className={styles.suggestion}>That time is full — these may work: {suggestions.join(', ')}</div>}

      <div className={styles.row}>
        <button type="button" className={styles.btnPrimary} onClick={() => void book()} disabled={doctors.length === 0}>Book a visit <span aria-hidden="true">→</span></button>
        <button type="button" className={styles.btnGhost} onClick={() => { setName(''); setTime('10:00'); setSuggestions([]); }}>Reset</button>
      </div>
      <div className={styles.panelFootnote}><span>✳</span> One thoughtful visit at a time.</div>
    </aside>
  );
}
