const AuditEvent = require('./models/AuditEvent');

async function recordAudit(req, action, resourceType, resourceId, metadata = {}) {
  if (!req.staff || !req.firebaseUid) throw new Error('Cannot write a staff audit event without an authenticated identity.');
  const safeMetadata = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)).map(([key, value]) => [key, String(value).slice(0, 120)])
  );
  return AuditEvent.create({
    clinicId: req.staff.clinicId,
    actorStaffId: req.staff._id,
    actorFirebaseUid: req.firebaseUid,
    actorRole: req.staff.role,
    action,
    resourceType,
    resourceId: resourceId ? String(resourceId) : undefined,
    metadata: safeMetadata,
  });
}

module.exports = { recordAudit };
