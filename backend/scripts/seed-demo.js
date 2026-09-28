require('dotenv').config();
const mongoose = require('mongoose');
const StaffUser = require('../models/StaffUser');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const DoctorAssignment = require('../models/DoctorAssignment');

async function main() {
  if (process.env.SEED_DEMO_DATA !== 'true') throw new Error('Refusing to seed. Set SEED_DEMO_DATA=true explicitly, use a non-production database, and keep all records fictitious.');
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production.');
  if (!process.env.MONGO_URI || !process.env.SEED_DOCTOR_UID || !process.env.SEED_EMPLOYEE_UID) throw new Error('MONGO_URI, SEED_DOCTOR_UID, and SEED_EMPLOYEE_UID are required.');
  await mongoose.connect(process.env.MONGO_URI);
  const clinicId = process.env.DEFAULT_CLINIC_ID || 'default';
  const doctor = await StaffUser.findOne({ firebaseUid: process.env.SEED_DOCTOR_UID, role: 'doctor', active: true, clinicId });
  const employee = await StaffUser.findOne({ firebaseUid: process.env.SEED_EMPLOYEE_UID, role: 'employee', active: true, clinicId });
  if (!doctor || !employee) throw new Error('Provision both staff UIDs first with scripts/provision-staff.js.');

  const patient = await Patient.findOneAndUpdate(
    { clinicId, name: 'Jordan Sample' },
    { $set: { age: 42, gender: 'Not specified', historySummary: 'Synthetic demo record only. No real patient information.', conditions: ['Demo condition'], allergies: ['No known demo allergies'], visits: 2, lastVisit: new Date(Date.now() - 86400000 * 45), visitHistory: [{ doctorId: doctor._id, visitedAt: new Date(Date.now() - 86400000 * 45), status: 'Completed', summary: 'Synthetic demonstration visit.' }] } },
    { upsert: true, new: true, runValidators: true }
  );
  await DoctorAssignment.findOneAndUpdate({ doctorId: doctor._id, patientId: patient._id }, { $set: { clinicId, active: true } }, { upsert: true, new: true });
  await Appointment.findOneAndUpdate(
    { clinicId, patientName: 'Jordan Sample', doctorId: doctor._id, status: { $in: ['Requested', 'Scheduled', 'Waiting'] } },
    { $set: { patientId: patient._id, doctorId: doctor._id, doctorName: doctor.displayName, preferredTime: '10:30 AM, next weekday', slotTime: '10:30 AM, next weekday', status: 'Scheduled' } },
    { upsert: true, new: true, runValidators: true }
  );
  console.log(`Seeded synthetic patient ${patient._id}; employee ${employee.displayName} and doctor ${doctor.displayName} are ready.`);
  await mongoose.disconnect();
}

main().catch(async error => { console.error(error.message); if (mongoose.connection.readyState) await mongoose.disconnect(); process.exitCode = 1; });
