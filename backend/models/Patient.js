const mongoose = require('mongoose');

const VisitSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffUser' },
  visitedAt: { type: Date },
  status: { type: String, enum: ['Scheduled', 'Waiting', 'In Progress', 'Completed', 'Cancelled'] },
  summary: { type: String, trim: true, maxlength: 5000 },
}, { _id: true });

const PatientSchema = new mongoose.Schema({
  clinicId: { type: String, required: true, default: 'default', index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  age: { type: Number, min: 0, max: 130 },
  dateOfBirth: { type: Date },
  gender: { type: String, trim: true, maxlength: 80 },
  historySummary: { type: String, trim: true, maxlength: 10000 },
  // Retained for migration compatibility with the original patient schema.
  history: { type: String, trim: true, maxlength: 10000 },
  conditions: { type: [String], default: [] },
  allergies: { type: [String], default: [] },
  visitHistory: { type: [VisitSchema], default: [] },
  visits: { type: Number, default: 0, min: 0 },
  lastVisit: { type: Date },
}, { timestamps: true, strict: 'throw' });

PatientSchema.index({ clinicId: 1, name: 1 });
module.exports = mongoose.model('Patient', PatientSchema);
