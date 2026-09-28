import React from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  displayName: string;
  roleLabel: string;
  onLogout: () => void;
}

const navItems = [
  { id: 'monitor', label: 'Overview', icon: 'overview' },
  { id: 'bookings', label: 'Appointments', icon: 'calendar' },
  { id: 'patients', label: 'Patients', icon: 'people' },
  { id: 'prescriptions', label: 'Prescriptions', icon: 'prescription' },
];

function NavIcon({ name }: { name: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'calendar') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><rect x="4" y="5.5" width="16" height="15" rx="3"/><path d="M8 3.5v4m8-4v4M4 10h16m-11 4h.01M12 14h.01M15 14h.01M8.99 17h.01"/></svg>;
  if (name === 'people') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20m6-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6-6.6a3.5 3.5 0 0 1 0 6.8M20 20v-1.5a3.5 3.5 0 0 0-2.7-3.4"/></svg>;
  if (name === 'prescription') return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M8 4h8l3 3v13H5V4h3Zm0 0v4h8V4M8 13h8m-8 3h5"/><path d="M17.5 10.5v4m-2-2h4"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/></svg>;
}

export default function Sidebar({ activeTab, onNavigate, displayName, roleLabel, onLogout }: SidebarProps) {
  const initials = displayName.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  return <aside className={styles.container}>
    <div className={styles.brand}><span className={styles.logoWrap}><img src="/stellarcare-mark.png" alt="" /></span><span className={styles.brandText}>stellar<span>care</span><small>CARE, MADE CLOSER</small></span></div>
    <div className={styles.workspaceLabel}>WORKSPACE</div>
    <nav className={styles.nav} aria-label="Main navigation">{navItems.map(item => <button key={item.id} type="button" onClick={() => onNavigate(item.id)} aria-current={activeTab === item.id ? 'page' : undefined} className={`${styles.button} ${activeTab === item.id ? styles.buttonActive : ''}`}><span className={styles.icon}><NavIcon name={item.icon} /></span><span>{item.label}</span>{activeTab === item.id && <span className={styles.activeDot} />}</button>)}</nav>
    <div className={styles['sidebar-note']}><span className={styles['note-icon']}>✳</span><strong>People before paperwork.</strong><span>A little care goes a long way.</span></div>
    <div className={styles.profile}><div className={styles['profile-avatar']}>{initials}</div><div className={styles['profile-copy']}><strong>{displayName}</strong><span>{roleLabel}</span></div><button className="sidebar-signout" onClick={onLogout} aria-label="Sign out">↗</button></div>
  </aside>;
}
