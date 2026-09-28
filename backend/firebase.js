const { initializeApp, getApps, cert, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

function initializeFirebase() {
  const apps = getApps();
  if (apps.length) return apps[0];
  const projectId = process.env.FIREBASE_PROJECT_ID
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }
  if (projectId && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault(), projectId });
  }
  return null;
}

function firebaseReady() {
  return getApps().length > 0;
}

function getFirebaseAuth() {
  const [app] = getApps();
  if (!app) throw new Error('Firebase Admin is not initialized.');
  return getAuth(app);
}

module.exports = { initializeFirebase, firebaseReady, getFirebaseAuth };
