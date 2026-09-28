require('dotenv').config();
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const StaffUser = require('../models/StaffUser');

async function main() {
  if (process.env.CONFIRM_LEGACY_MIGRATION !== 'YES') throw new Error('Review a backup first, then set CONFIRM_LEGACY_MIGRATION=YES to proceed.');
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_MIGRATION !== 'YES') throw new Error('Production migration is blocked unless ALLOW_PRODUCTION_MIGRATION=YES is explicitly set.');
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
  await mongoose.connect(process.env.MONGO_URI);
  const clinicId = process.env.DEFAULT_CLINIC_ID || 'default';
  const patientsResult = await Patient.updateMany({ clinicId: { $exists: false } }, { $set: { clinicId } });
  const appointmentsResult = await Appointment.updateMany({ clinicId: { $exists: false } }, { $set: { clinicId } });

  let doctorLinks = 0;
  const doctors = await StaffUser.find({ role: 'doctor', active: true, clinicId }).select('_id displayName').lean();
  for (const doctor of doctors) {
    const matched = await Appointment.updateMany(
      { clinicId, doctorId: { $exists: false }, doctorName: doctor.displayName },
      { $set: { doctorId: doctor._id } }
    );
    doctorLinks += matched.modifiedCount;
  }
  const candidates = await Appointment.aggregate([
    { $match: { clinicId, patientId: { $exists: false }, doctorId: { $exists: true } } },
    { $group: { _id: '$patientName', doctorIds: { $addToSet: '$doctorId' }, appointmentIds: { $push: '$_id' } } },
  ]);
  console.log(JSON.stringify({ clinicId, patientsClinicScoped: patientsResult.modifiedCount, appointmentsClinicScoped: appointmentsResult.modifiedCount, doctorNameLinks: doctorLinks, patientLinkCandidatesForManualReview: candidates.length, note: 'Patient names were not auto-linked. Review each candidate and create current DoctorAssignment records explicitly.' }, null, 2));
  await mongoose.disconnect();
}

main().catch(async error => { console.error(error.message); if (mongoose.connection.readyState) await mongoose.disconnect(); process.exitCode = 1; });
