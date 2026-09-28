const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  clinicId: { type: String, required: true, default: 'default', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true },
  patientName: { type: String, required: true, trim: true, maxlength: 160 },
  contactInfo: { type: String, trim: true, maxlength: 190 },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffUser', index: true },
  doctorName: { type: String, trim: true, maxlength: 160 },
  preferredTime: { type: String, required: true, trim: true, maxlength: 100 },
  // Read-only compatibility for legacy appointment rows during migration.
  slotTime: { type: String, trim: true, maxlength: 100 },
  createdAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['Requested', 'Scheduled', 'Waiting', 'In Progress', 'Completed', 'Cancelled'], default: 'Requested', index: true },
}, { timestamps: true, strict: 'throw' });

AppointmentSchema.index({ clinicId: 1, createdAt: -1 });
module.exports = mongoose.model('Appointment', AppointmentSchema);
