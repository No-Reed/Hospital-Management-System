const mongoose = require('mongoose');

const AuditEventSchema = new mongoose.Schema({
  clinicId: { type: String, required: true, index: true },
  actorStaffId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  actorFirebaseUid: { type: String, required: true },
  actorRole: { type: String, enum: ['doctor', 'employee'], required: true },
  action: { type: String, required: true, maxlength: 80 },
  resourceType: { type: String, enum: ['appointment', 'patient', 'staff'], required: true },
  resourceId: { type: String, maxlength: 64 },
  result: { type: String, enum: ['success', 'denied'], default: 'success' },
  metadata: { type: Map, of: String, default: undefined },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false, strict: 'throw' });

AuditEventSchema.index({ clinicId: 1, createdAt: -1 });
module.exports = mongoose.model('AuditEvent', AuditEventSchema);
