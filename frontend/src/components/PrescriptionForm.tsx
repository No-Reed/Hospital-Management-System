import React, { useState } from 'react';
import styles from './PrescriptionForm.module.css';

type Medicine = { name: string; dosage: string; duration: string };

export default function PrescriptionForm() {
  const [patientName, setPatientName] = useState('');
  const [doctorName, setDoctorName] = useState('Dr. Smith (Cardiology)');
  const [medicines, setMedicines] = useState<Medicine[]>([{ name: '', dosage: '', duration: '' }]);

  const addRow = () => setMedicines([...medicines, { name: '', dosage: '', duration: '' }]);
  const removeRow = (index: number) => {
    const list = [...medicines];
    list.splice(index, 1);
    setMedicines(list);
  };
  const handleChange = (index: number, field: keyof Medicine, value: string) => {
    const list = [...medicines];
    list[index][field] = value;
    setMedicines(list);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    if (!patientName) return alert('Please enter patient name');
    alert(`Prescription for ${patientName} saved to system!`);
    setPatientName('');
    setMedicines([{ name: '', dosage: '', duration: '' }]);
  };

  return (
    <div className={styles.paper}>
      <header className={styles.header}>
        <div>
          <div className={styles.hospitalName}>StellarCare Hospital</div>
          <div style={{ color: '#829086' }}>123 Health Avenue, Med City</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <select value={doctorName} onChange={(event) => setDoctorName(event.target.value)} style={{ border: 'none', fontWeight: 'bold', fontSize: 14, textAlign: 'right', cursor: 'pointer', background: 'transparent', color: '#40564a' }}>
            <option>Dr. Smith (Cardiology)</option>
            <option>Dr. Lee (General Medicine)</option>
            <option>Dr. Priya (Neurology)</option>
          </select>
          <br />
          <span style={{ color: '#87948a', fontSize: 10 }}>Date: {new Date().toLocaleDateString()}</span>
        </div>
      </header>

      <label htmlFor="prescription-patient" style={{ display: 'block', marginBottom: 6, color: '#718077', fontSize: 10, fontWeight: 700 }}>Patient name</label>
      <input id="prescription-patient" className={styles.input} value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="Enter patient name..." />

      <h4 style={{ marginTop: 27, paddingBottom: 10, borderBottom: '1px solid #e9eee7', color: '#40564a', fontSize: 12 }}>Rx / Medicines</h4>

      {medicines.map((medicine, index) => (
        <div key={index} className={styles.medRow}>
          <input className={styles.input} aria-label={`Medicine ${index + 1} name`} placeholder="Medicine name" value={medicine.name} onChange={(event) => handleChange(index, 'name', event.target.value)} />
          <input className={styles.input} aria-label={`Medicine ${index + 1} dosage`} placeholder="Dosage (e.g. 1-0-1)" value={medicine.dosage} onChange={(event) => handleChange(index, 'dosage', event.target.value)} />
          <input className={styles.input} aria-label={`Medicine ${index + 1} duration`} placeholder="Duration" value={medicine.duration} onChange={(event) => handleChange(index, 'duration', event.target.value)} />
          {medicines.length > 1 && <button aria-label={`Remove medicine ${index + 1}`} onClick={() => removeRow(index)} style={{ color: '#af7665', background: 'none', border: 'none', cursor: 'pointer', fontSize: 19 }}>×</button>}
        </div>
      ))}

      <div className="no-print" style={{ marginTop: 17, display: 'flex', gap: 10 }}>
        <button className={styles.addBtn} onClick={addRow}>+ Add medicine</button>
      </div>

      <div className="no-print" style={{ marginTop: 32, paddingTop: 15, display: 'flex', gap: 12, borderTop: '1px dashed #e7ece5' }}>
        <button className={styles.printBtn} onClick={handlePrint}>Print / Save PDF</button>
        <button className={styles.printBtn} style={{ background: '#fff', color: '#5c8666', borderColor: '#dce9dc' }} onClick={handleSave}>Save record</button>
      </div>
      <style>{`@media print { .no-print, button { display: none !important; } body { background: white; } .paper { box-shadow: none; margin: 0; width: 100%; max-width: 100%; } }`}</style>
    </div>
  );
}
