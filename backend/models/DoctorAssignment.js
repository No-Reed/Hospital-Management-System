const mongoose = require('mongoose');

const DoctorAssignmentSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffUser', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  clinicId: { type: String, required: true, default: 'default', index: true },
  active: { type: Boolean, default: true, index: true },
  assignedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
}, { timestamps: true, strict: 'throw' });

DoctorAssignmentSchema.index({ doctorId: 1, patientId: 1 }, { unique: true });
module.exports = mongoose.model('DoctorAssignment', DoctorAssignmentSchema);
