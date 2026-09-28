import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { io } from 'socket.io-client';

for (const path of ['.env.local', '.env']) {
  if (existsSync(path)) loadEnvFile(path);
}

const expectDeny = process.argv.includes('--expect-deny');
let token = process.env.STELLAR_ID_TOKEN;
let testAuth = null;
const url = process.env.STELLAR_SOCKET_URL || 'http://localhost:4000';

if (!token && !expectDeny && process.env.STELLAR_TEST_EMAIL && process.env.STELLAR_TEST_PASSWORD) {
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
  try {
    testAuth = getAuth(initializeApp(config, 'stellarcare-socket-smoke'));
    const credential = await signInWithEmailAndPassword(testAuth, process.env.STELLAR_TEST_EMAIL, process.env.STELLAR_TEST_PASSWORD);
    token = await credential.user.getIdToken(true);
  } catch {
    console.error('Could not sign in the configured local Firebase test account. No credential details are printed.');
    process.exit(2);
  }
}

if (!token && !expectDeny) {
  console.error('Set STELLAR_TEST_EMAIL and STELLAR_TEST_PASSWORD in frontend/.env.local, or pass STELLAR_ID_TOKEN locally. Never paste a token into source files or chat.');
  process.exit(2);
}

const socket = io(url, {
  ...(token ? { auth: { token } } : {}),
  reconnection: false,
  timeout: 5000,
});
const timer = setTimeout(() => {
  console.error('Timed out before the Socket.IO handshake completed. Check the API URL and server logs.');
  void finish(1);
}, 7000);

async function finish(exitCode) {
  clearTimeout(timer);
  socket.disconnect();
  if (testAuth) await signOut(testAuth).catch(() => {});
  process.exit(exitCode);
}

socket.once('connect', () => {
  if (expectDeny) {
    console.error('Unexpectedly connected; this invalid-token test should have been denied.');
    void finish(1);
    return;
  }
  console.log('Socket.IO handshake accepted. The server chose staff rooms from the verified UID/role/clinic; this client cannot request room names.');
  void finish(0);
});

socket.once('connect_error', error => {
  if (expectDeny) {
    if (/unauthorized|authentication_not_configured|email_not_verified|role_claims_mismatch/i.test(error.message)) {
      console.log(`Expected server handshake denial received (${error.message}).`);
      void finish(0);
    } else {
      console.error(`Expected a server authorization rejection, but got a connection error (${error.message}). Is the API running at ${url}?`);
      void finish(1);
    }
    return;
  }
  console.error(`Socket.IO handshake rejected (${error.message}). Check token freshness, email verification, role/clinic claims, staff provisioning, and Firebase Admin configuration.`);
  void finish(1);
});
