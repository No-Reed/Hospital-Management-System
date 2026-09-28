import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

for (const path of ['.env.local', '.env']) {
  if (existsSync(path)) loadEnvFile(path);
}

const role = process.argv[2];
if (!['doctor', 'employee'].includes(role)) {
  console.error('Usage: npm run test:rbac -- doctor|employee');
  process.exit(2);
}
const email = process.env.STELLAR_TEST_EMAIL;
const password = process.env.STELLAR_TEST_PASSWORD;
if (!email || !password) {
  console.error('Set STELLAR_TEST_EMAIL and STELLAR_TEST_PASSWORD in ignored frontend/.env.local.');
  process.exit(2);
}
const api = process.env.STELLAR_API_URL || 'http://localhost:4000';
const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};
if (Object.values(config).some(value => !value)) {
  console.error('Provide the VITE_FIREBASE_* settings in frontend/.env before using a Firebase test account.');
  process.exit(2);
}

const auth = getAuth(initializeApp(config, `stellarcare-rbac-${role}`));
try {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const token = await credential.user.getIdToken(true);
  const headers = { Authorization: `Bearer ${token}` };

  const anonymous = await fetch(`${api}/api/auth/me`);
  if (anonymous.status !== 401) throw new Error(`Unauthenticated request expected 401; received ${anonymous.status}.`);

  const profileResponse = await fetch(`${api}/api/auth/me`, { headers });
  if (!profileResponse.ok) throw new Error(`Authenticated profile request failed (${profileResponse.status}); check verified email, custom role/clinic claims, Mongo staff profile, and clinic setting.`);
  const profile = await profileResponse.json();
  if (profile.role !== role) throw new Error(`Signed-in account has role '${profile.role}', not expected '${role}'.`);

  const ownPath = role === 'doctor' ? '/api/doctor/patients' : '/api/employee/appointments';
  const deniedPath = role === 'doctor' ? '/api/employee/appointments' : '/api/doctor/patients';
  const ownResponse = await fetch(`${api}${ownPath}`, { headers });
  if (!ownResponse.ok) throw new Error(`Own-role read failed (${ownResponse.status}) at ${ownPath}.`);
  const deniedResponse = await fetch(`${api}${deniedPath}`, { headers });
  if (deniedResponse.status !== 403) throw new Error(`Cross-role request expected 403; received ${deniedResponse.status} at ${deniedPath}.`);

  console.log(`PASS: unauthenticated=401; ${role} profile=200; own scoped route=200; cross-role route=403.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'RBAC check failed. No credential details are printed.');
  process.exitCode = 1;
} finally {
  await signOut(auth).catch(() => {});
}
