import { useEffect, useState } from 'react';
import BookingForm, { type BookingData, type Doctor } from './BookingForm';
import { API_BASE } from '../lib/api';
import styles from './PortalPages.module.css';

type Props = { onNavigate: (path: string) => void };
export default function PublicBookingPage({ onNavigate }: Props) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState('');
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    let live = true;
    fetch(`${API_BASE}/api/public/doctors`).then(async response => {
      if (!response.ok) throw new Error('Provider list is unavailable.');
      return response.json() as Promise<Doctor[]>;
    }).then(result => { if (live) setDoctors(result); })
      .catch(() => { if (live) setRequestError('Online provider selection is not configured yet. Please contact the clinic.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  async function submit(booking: BookingData): Promise<boolean> {
    setRequestError(''); setConfirmation('');
    const doctor = doctors.find(item => item._id === booking.doctor);
    if (!doctor) { setRequestError('Choose a currently available provider.'); return false; }
    try {
      const response = await fetch(`${API_BASE}/api/public/appointments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName: booking.name, contactInfo: booking.contact, doctorId: doctor._id, preferredTime: booking.time }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'We could not submit your request.');
      setConfirmation(payload.message || 'Your appointment request was received. The clinic will follow up to confirm a time.');
      return true;
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'We could not submit your request.');
      return false;
    }
  }

  return <main className={styles.portalPage}>
    <header className={styles.portalTop}>
      <a className={styles.brand} href="/" onClick={event => { event.preventDefault(); onNavigate('/'); }}><img src="/stellarcare-mark.png" alt=""/><span>StellarCare<small>CARE, MADE CLOSER</small></span></a>
      <nav className={styles.staffLinks} aria-label="Staff access"><a href="/doctor/login" onClick={event => { event.preventDefault(); onNavigate('/doctor/login'); }}>Doctor sign in</a><a href="/employee/login" onClick={event => { event.preventDefault(); onNavigate('/employee/login'); }}>Employee sign in</a></nav>
    </header>
    <section className={styles.portalHero}><span className={styles.eyebrow}>A LITTLE MORE HUMAN, EVERY DAY</span><h1>Care that starts<br/><span>with a visit.</span></h1><p>Request an appointment with your care team. No patient account is needed to send a request; the clinic will contact you to confirm the details.</p></section>
    <section className={styles.bookingWrap}>
      <div>
        <BookingForm doctors={doctors} onBook={submit} />
        {loading && <div className={styles.notice} role="status">Loading appointment providers…</div>}
        {requestError && <div className={styles.notice} role="alert">{requestError}</div>}
        {confirmation && <div className={styles.success} role="status"><strong>Request received</strong>{confirmation}</div>}
      </div>
      <aside className={styles.bookingAside}><h2>What happens next?</h2><p>Your preferred time is a request, not a confirmed appointment. A clinic employee will review it and follow up to confirm or suggest another time.</p><ul><li>Choose a provider</li><li>Tell us your name and preferred time</li><li>Wait for confirmation from the clinic</li></ul><p>If you need urgent or emergency help, contact local emergency services rather than using this form.</p></aside>
    </section>
  </main>;
}
