const { getFirebaseAuth, firebaseReady } = require('../firebase');
const StaffUser = require('../models/StaffUser');
const { claimsMatchStaff } = require('../authorization');

async function authenticateStaff(req, res, next) {
  if (!firebaseReady()) {
    return res.status(503).json({ error: 'Firebase authentication is not configured on this server.' });
  }

  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Sign-in required.' });

  try {
    const decoded = await getFirebaseAuth().verifyIdToken(match[1], true);
    if (decoded.email_verified !== true) return res.status(403).json({ error: 'Verify your staff email before signing in.' });
    const staff = await StaffUser.findOne({ firebaseUid: decoded.uid, active: true }).lean();
    if (!staff) return res.status(403).json({ error: 'This account is not provisioned for staff access.' });
    if (!claimsMatchStaff(decoded, staff)) return res.status(403).json({ error: 'Staff role claims are missing or stale. Sign out and back in after an administrator provisions your role.' });
    req.staff = staff;
    req.firebaseUid = decoded.uid;
    next();
  } catch {
    return res.status(401).json({ error: 'Your sign-in is invalid or expired. Please sign in again.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.staff) return res.status(401).json({ error: 'Sign-in required.' });
    if (!roles.includes(req.staff.role)) return res.status(403).json({ error: 'You do not have access to this page.' });
    next();
  };
}

module.exports = { authenticateStaff, requireRole };
