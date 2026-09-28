const mongoose = require('mongoose');

const StaffUserSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true, index: true },
  role: { type: String, enum: ['doctor', 'employee'], required: true, index: true },
  displayName: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  specialty: { type: String, trim: true },
  clinicId: { type: String, required: true, default: 'default', index: true },
  active: { type: Boolean, default: true, index: true },
  publicBookingEnabled: { type: Boolean, default: false },
}, { timestamps: true, strict: 'throw' });

module.exports = mongoose.model('StaffUser', StaffUserSchema);
