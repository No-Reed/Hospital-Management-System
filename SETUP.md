# StellarCare setup: Firebase + MongoDB Atlas

This version has three paths:

For step-by-step custom Firebase claims, Atlas schema details, and local API/Socket.IO security tests, see [LOCAL_AUTH_ATLAS_TESTING.md](./LOCAL_AUTH_ATLAS_TESTING.md).

- **Public visitor:** can request an appointment without a sign-in; can only see providers opted into public booking. This creates a `Requested` appointment and does not create a clinical patient record.
- **Doctor:** signs in with Firebase Authentication, then sees only their own appointment requests and patients with an active `DoctorAssignment`.
- **Employee:** signs in with Firebase Authentication, then uses the existing operations workspace. Only employees can see booking contact details, list clinic patients, cancel requests, or link a request to an existing patient record.

The backend is fail-closed: protected staff APIs return unavailable when Firebase Admin is not configured; MongoDB is required before the server starts. No credentials are included in this repository.

Protected list/detail reads and sensitive staff changes write a clinic-scoped `AuditEvent` with the staff UID/role, action, timestamp, resource ID, and limited metadata. The audit record deliberately omits names, phone/email, and clinical text. This starter does not expose audit-log browsing to staff; secure MongoDB access, retention/expiry, monitoring, and operational review still need to be configured for the clinic's policy.

## 1. Create the MongoDB Atlas connection

1. In MongoDB Atlas, create or choose a cluster.
2. Create a **database user** with access limited to the application database. This is separate from your Atlas website login.
3. Add the backend host's outbound address to the Atlas project **IP access list**. For local development, add your current IP; for a hosted backend, use that host's stable outbound IP/network guidance. Avoid opening `0.0.0.0/0` for production.
4. In **Connect → Drivers**, copy the application `mongodb+srv://` URI and replace the password/database placeholders. URL-encode reserved URI characters in the database password.
5. Store the URI in `MONGO_URI` on the backend only. Do not put it in a `VITE_*` variable, commit it, or expose it to the browser.

Official: [MongoDB Atlas application connection](https://www.mongodb.com/docs/atlas/driver-connection/).

## 2. Configure Firebase Authentication

1. Create a Firebase project and a **Web app** in its project settings.
2. In Firebase Authentication, enable Email/Password sign-in. Create doctor and employee accounts administratively; this app has no public staff registration or client-selected role. Add the local development host (`localhost`) and each actual deployed hostname under Authentication **Settings → Authorized domains**.
3. Require verified work email accounts and configure MFA for staff in the Firebase project where your plan/policy supports it.
4. Copy the Web app's `apiKey`, `authDomain`, `projectId`, and `appId` into the frontend variables below. These are Firebase client configuration values, not Admin service-account credentials.
5. Generate or select a Firebase Admin service account for the backend. Put its `project_id`, `client_email`, and `private_key` into the backend environment. Restrict access to the private key and rotate it if exposed.
6. For every staff member, copy their Firebase **UID** and provision their role on the server. The trusted CLI sets the ID-token claims `stellarcareRole` and `stellarcareClinicId` and writes the matching Mongo staff profile; each request checks both the verified claims and the active profile. The browser cannot choose a role.

Official: [Verify Firebase ID tokens on a custom backend](https://firebase.google.com/docs/auth/admin/verify-id-tokens). The backend uses the Firebase Admin SDK's `verifyIdToken` and revocation check, then looks up an active MongoDB staff profile.

## 3. Local run without Docker

In one terminal, configure and start the API:

```bash
cd backend
cp .env.example .env
# Edit backend/.env: set MONGO_URI and Firebase Admin values.
npm ci
npm run dev
```

In another terminal, configure and start the client:

```bash
cd frontend
cp .env.example .env
# Edit frontend/.env with Firebase Web app settings; keep VITE_API_URL=http://localhost:4000.
npm ci
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). Public appointment requests require at least one active, provisioned doctor with `publicBookingEnabled=true`.

### Staff role provisioning

First create the user in Firebase Authentication, verify the email, and copy the UID. Then run from `backend/` with the same `.env` and `MONGO_URI`:

```bash
npm run provision:staff -- <FIREBASE_UID> employee "Front Desk Employee"
npm run provision:staff -- <FIREBASE_UID> doctor "Dr. Example" "Family Medicine"
```

Provisioning updates an existing UID or creates a staff profile. It requires an existing Firebase account with a verified email, and updates only named StellarCare keys while preserving unrelated claims. Never let the public client call this command or set its own role. Assign a clinic consistently using `DEFAULT_CLINIC_ID`. After a role/clinic change, the user must sign out and sign in again or force-refresh their ID token; old claims are intentionally rejected.

The optional `SEED_DOCTOR_PUBLIC_BOOKING=true` setting enables a provisioned doctor to appear on the public request form. Otherwise the doctor remains staff-only.

## 4. Link requests to clinical records

Public requests are intentionally not matched to patient records by name. This avoids merging the wrong people. An employee signs in and uses **Appointments → Link existing record** to choose an existing patient record. The assigned doctor can then open that patient’s detail/history view.

Before migration, back up existing data. The guarded migration adds a clinic scope and matches legacy doctor names only when there is a provisioned doctor with an exact display-name match. It does **not** link patient records by name:

```bash
cd backend
CONFIRM_LEGACY_MIGRATION=YES npm run migrate:legacy
```

For a production migration, additionally review and deliberately set `ALLOW_PRODUCTION_MIGRATION=YES`, run against a recent backup/staging copy first, and reconcile the emitted manual patient-link candidates. This data migration changes existing records; do not run it casually.

## 5. Synthetic demonstration data (optional)

Only use a non-production database and fictitious data. Provision both Firebase UIDs first, then:

```bash
cd backend
NODE_ENV=development SEED_DEMO_DATA=true npm run seed:demo
```

The script refuses production mode or missing opt-in. The sample name is **Jordan Sample** and contains explicitly synthetic notes. Do not use real patient data in demos or automated tests.

## 6. Docker Compose

The backend container uses Node 22 to satisfy the Firebase Admin 14 and Mongoose 9 runtime requirements.

For a local Compose run, create a root `.env` based on `.env.example`, provide all required values, and run:

```bash
docker compose up --build
```

The frontend is served on port 5173; Nginx proxies `/api/` and `/socket.io/` to the backend, which is private to the Compose network. Check health at `http://localhost:5173/api/health`. Set `CLIENT_ORIGINS` to the exact browser origin that users will visit. Rebuild the frontend after changing `VITE_FIREBASE_*` values because Vite embeds these public Firebase web settings at build time. Never pass Firebase Admin private key values as frontend build arguments.

## 7. Production checklist

- Confirm Mongo Atlas IP access, least-privilege database user, backups, and TLS.
- Set Firebase authorized domains and exact production `CLIENT_ORIGINS`.
- Provision each staff UID through an administrator; disable stale accounts in both Firebase and Mongo.
- Review existing patient data and migration plans before making it available to doctors.
- Test cross-role access denials, Firebase token revocation, clinic isolation, and Socket.IO authentication in a private staging environment.
- Keep Firebase Admin private keys and `MONGO_URI` in a secrets manager/platform environment, not in Git, frontend variables, or client downloads.
- Review applicable privacy/health-data requirements and retention/audit policy with qualified owners before production use.
