import React from 'react';
import styles from './MonitorCard.module.css';

export type Patient = {
  _id?: string;
  id?: string;
  name?: string;
  doctor?: string;
  time?: string;
  status?: string;
  contactInfo?: string;
  patientId?: string;
};

interface MonitorCardProps {
  title?: string;
  patients?: Patient[];
  onDelete?: (id: string) => void;
}

function statusClass(status?: string) {
  if (status === 'In Progress') return styles.inprog;
  if (status === 'Completed') return styles.done;
  return styles.wait;
}

export default function MonitorCard({ title = 'Department', patients = [], onDelete }: MonitorCardProps) {
  return (
    <section className={styles.card}>
      <div className={styles.title}>{title}<span className="queue-count">{patients.length} {patients.length === 1 ? 'visit' : 'visits'}</span></div>
      {patients.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">✳</span>
          <div className={styles.emptyTitle}>A little breathing room</div>
          <div className={styles.emptyCopy}>There aren’t any visits in the queue just yet. When they’re ready, they’ll appear here.</div>
        </div>
      ) : (
        <div className={styles.grid}>
          {patients.map((patient, index) => {
            const uniqueId = patient._id || patient.id || `p-${index}`;
            const initials = patient.name ? patient.name.split(' ').map((part) => part[0]).slice(0, 2).join('') : 'SC';
            return (
              <div className={styles.item} key={uniqueId}>
                <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <div className={styles.avatar}>{initials}</div>
                  <div className={styles.meta}>
                    <div className={styles.name}>{patient.name || 'New patient'}</div>
                    <div className={styles.note}>{patient.time || 'Time to be confirmed'} <span aria-hidden="true">·</span> {patient.doctor || 'Care team'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span className={`${styles.status} ${statusClass(patient.status)}`}>{patient.status || 'Waiting'}</span>
                  {onDelete && (
                    <button className={styles.deleteBtn} onClick={() => onDelete(uniqueId)} title="Cancel appointment" aria-label={`Cancel appointment for ${patient.name || 'this patient'}`}>Cancel</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
