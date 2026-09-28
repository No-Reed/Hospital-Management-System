require('dotenv').config();
const mongoose = require('mongoose');
const StaffUser = require('../models/StaffUser');
const { initializeFirebase, firebaseReady, getFirebaseAuth } = require('../firebase');

async function main() {
  const [firebaseUid, role, displayName, specialtyArg = ''] = process.argv.slice(2);
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
  if (!firebaseUid || !['doctor', 'employee'].includes(role) || !displayName) {
    throw new Error('Usage: node scripts/provision-staff.js <firebase-uid> <doctor|employee> <display-name> [specialty]');
  }

  initializeFirebase();
  if (!firebaseReady()) throw new Error('Firebase Admin credentials are required to provision custom claims.');
  const auth = getFirebaseAuth();
  const firebaseUser = await auth.getUser(firebaseUid);
  if (firebaseUser.disabled) throw new Error('Cannot provision a disabled Firebase account.');
  if (!firebaseUser.emailVerified) throw new Error('Verify this Firebase staff email before provisioning it.');

  const clinicId = process.env.DEFAULT_CLINIC_ID || 'default';
  const claims = {
    ...(firebaseUser.customClaims || {}),
    stellarcareRole: role,
    stellarcareClinicId: clinicId,
  };
  // Claims are assigned only by this trusted server-side CLI, never by the browser.
  await auth.setCustomUserClaims(firebaseUid, claims);
  await mongoose.connect(process.env.MONGO_URI);

  const values = {
    firebaseUid, role, displayName: displayName.trim(), clinicId, active: true,
    ...(role === 'doctor' ? { specialty: specialtyArg || undefined, publicBookingEnabled: process.env.SEED_DOCTOR_PUBLIC_BOOKING === 'true' } : {}),
  };
  const staff = await StaffUser.findOneAndUpdate({ firebaseUid }, { $set: values }, { upsert: true, new: true, runValidators: true });
  console.log(`Provisioned ${staff.role}: ${staff.displayName} (${staff.firebaseUid}) in clinic ${staff.clinicId}`);
  console.log('Role and clinic claims are set. The staff member must sign out and sign back in (or force-refresh their ID token).');
  await mongoose.disconnect();
}

main().catch(async error => {
  console.error(error.message);
  if (mongoose.connection.readyState) await mongoose.disconnect();
  process.exitCode = 1;
});
