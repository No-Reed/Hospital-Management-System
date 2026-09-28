# StellarCare local auth, Atlas schema, and security testing

This walkthrough covers the current implementation in this repository. It is intended for an isolated local/staging Firebase project and a **non-production** Atlas database with fictitious records only.

## 1. Configure the Firebase sign-in UI

The app currently uses a small **custom React form**, not FirebaseUI. `frontend/src/components/StaffLogin.tsx` calls Firebase's modular `signInWithEmailAndPassword`; `/doctor/login` and `/employee/login` are separate entry points, but neither page lets a visitor select or grant a role. The backend decides the account's actual role.

### Firebase Console

1. Create/select the Firebase project and add a **Web app**.
2. In **Authentication → Sign-in method**, enable **Email/Password**. Do not enable anonymous sign-in for staff.
3. Under **Authentication → Settings → Authorized domains**, add `localhost` for local development and the precise hostnames you will deploy. This setting is separate from the backend `CLIENT_ORIGINS` CORS value.
4. Create a dedicated test doctor and a dedicated test employee from a controlled administrator/onboarding process. Verify both work email addresses. Do not create a public staff registration form.
5. In the Firebase Web app settings, copy the `apiKey`, `authDomain`, `projectId`, and `appId` into `frontend/.env` (copy `frontend/.env.example`). These are client configuration values, **not** the Firebase Admin private key.
6. Copy `frontend/.env.example` to `frontend/.env.local` for local smoke-test credentials only; add the same Web app settings and the dedicated test account values:

```dotenv
STELLAR_TEST_EMAIL=doctor-test@example.invalid
STELLAR_TEST_PASSWORD=replace-with-a-local-test-password
STELLAR_API_URL=http://localhost:4000
STELLAR_SOCKET_URL=http://localhost:4000
```

Use real test-project credentials in your ignored local file; the `.invalid` example is deliberately not a usable account. The frontend `.gitignore` excludes `.env.local`. Never commit it or paste passwords/ID tokens into a ticket, source file, or chat. You may use an administrator-managed secret store instead of the file.

### Configure the existing UI

1. Copy `frontend/.env.example` to `frontend/.env` and fill in the four `VITE_FIREBASE_*` values.
2. Run `npm ci && npm run dev` in `frontend/`.
3. Use `/doctor/login` for a doctor and `/employee/login` for an employee. Public visitors stay on `/` and can request appointments without creating an account.
4. Successful password sign-in is only the first step: the client calls `/api/auth/me`; if the signed-in UID, verified email, role/clinic claims, active MongoDB `StaffUser` record, or Firebase Admin verification do not match, the staff workspace is denied.

### Optional FirebaseUI replacement

If you want ready-made components rather than the existing branded form, Firebase's current Web FirebaseUI docs include modular React components. Use only the **sign-in** screen for clinic staff; do not render sign-up components for a closed staff system. Follow the current React setup and styling instructions in the [official FirebaseUI guide](https://firebase.google.com/docs/auth/web/firebaseui), and keep the backend checks below unchanged. For this project, the existing custom form is the smaller option and keeps doctor/employee routing distinct.

Official references: [Firebase Web setup](https://firebase.google.com/docs/web/setup), [password authentication](https://firebase.google.com/docs/auth/web/password-auth), and [FirebaseUI for Web](https://firebase.google.com/docs/auth/web/firebaseui).

## 2. Set doctor versus employee custom claims

The repository now uses two agreeing authorization records:

1. **Firebase custom claims**, signed into the Firebase ID token: `stellarcareRole` and `stellarcareClinicId`.
2. **MongoDB `StaffUser` profile**, keyed by the verified Firebase UID: `role`, `clinicId`, and `active`.

The server allows access only when the token is valid/not revoked, the email is verified, the Mongo profile is active, and both custom claims match that profile. Doctor record access adds a clinic-scoped active `DoctorAssignment` check. The UI may use a role to render a page, but a page guard is not authorization.

### Provision staff with the included command (recommended)

1. In Firebase Console, create and verify the staff account. Copy its Firebase **UID** (not its email address).
2. Configure `backend/.env` from `backend/.env.example` with the same test `MONGO_URI`, `DEFAULT_CLINIC_ID`, and server-only Firebase Admin service-account values.
3. From `backend/`, install packages and provision the account:

```bash
npm ci
npm run provision:staff -- "REPLACE_WITH_DOCTOR_FIREBASE_UID" doctor "Dr. Local Test" "Family Medicine"
npm run provision:staff -- "REPLACE_WITH_EMPLOYEE_FIREBASE_UID" employee "Local Test Employee"
```

Replace each placeholder with that test user's Firebase UID from the Authentication users list before running the corresponding command.

The CLI confirms the UID exists, is enabled and has a verified email. It sets the two named custom claims and writes the matching active `StaffUser` profile. A doctor remains hidden from public booking unless `SEED_DOCTOR_PUBLIC_BOOKING=true` is set for that provisioning run.

The relevant trusted-server operation is equivalent to:

```js
const existing = await auth.getUser(firebaseUid);
await auth.setCustomUserClaims(firebaseUid, {
  ...(existing.customClaims || {}),
  stellarcareRole: 'doctor', // 'employee' for an employee
  stellarcareClinicId: clinicId,
});
```

`setCustomUserClaims` overwrites the custom-claims object, which is why the included provisioner preserves unrelated claim keys. Never call it from the browser, accept a role from request JSON, or put clinical data/profile fields into custom claims. Firebase documents a 1000-byte claims payload limit and explains that changes reach an existing client on its next sign-in/token refresh. After changing a role or clinic, sign out and sign back in (or force-refresh the ID token). A stale token is intentionally rejected.

Official references: [Set and validate custom claims](https://firebase.google.com/docs/auth/admin/custom-claims), [verify Firebase ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens), and [manage sessions/revocation](https://firebase.google.com/docs/auth/admin/manage-sessions).

## 3. MongoDB Atlas schema walkthrough

Set one isolated Atlas database/cluster for local or staging. Use a least-privilege database user, put the URI only in `backend/.env` as `MONGO_URI`, and allow only the backend's network in the Atlas IP access list. Do not put the URI in a `VITE_*` variable. The models live in `backend/models/`.

| Collection/model | Purpose and current shape | Access rule |
|---|---|---|
| `StaffUser` | One staff profile per Firebase UID; `role` (`doctor`/`employee`), display name, clinic, active flag, doctor specialty, and optional public-booking flag. | Backend lookup uses verified token UID. Role/clinic claims must also match. |
| `Patient` | Clinic-scoped record with demographics, summary/history, conditions, allergies, visit count/last-visit summary, and an embedded `visitHistory[]`. Each visit may contain doctor ID, date, status, and a summary. | Only an active doctor assignment in the same clinic permits the doctor detail route. Employee list is deliberately restricted to operational fields. |
| `Appointment` | A public request or scheduled visit: clinic, patient name/contact, doctor ID/display-name snapshot, preferred-time string, optional `patientId` link, timestamps, and status. | Public callers can create a request but cannot read the staff queues or clinical record. Employees see contact information; doctors see only their own clinic-scoped appointments. |
| `DoctorAssignment` | Explicit `doctorId` ↔ `patientId` relationship with clinic, active state, assignment/end timestamps; unique doctor/patient pair. | The doctor patient list and detail endpoint require an active matching assignment. Employee link/assign operations create/reactivate it. |
| `AuditEvent` | Timestamped actor UID/staff ID/role, clinic, action, resource type/ID, result and limited metadata; indexed by clinic/time and actor. It does not intentionally contain names, contact values, or clinical narrative. | This starter writes successful protected reads and sensitive actions. It does **not** yet persist every denied attempt or provide an audit viewer. Protect database/operator access and define review/retention policy. |

### Appointment and visit statuses

The appointment enum currently includes `Requested`, `Scheduled`, `Waiting`, `In Progress`, `Completed`, and `Cancelled`.

- A public request starts at **Requested**.
- An employee may move a request to **Scheduled**.
- A doctor can update their own, clinic-scoped, non-final appointment to **Waiting**, **In Progress**, or **Completed**.
- The doctor update route rejects changes after **Completed** or **Cancelled**; employee cancellation and public access are separate routes.
- Patient past visits are embedded snapshots in `Patient.visitHistory[]`; this starter does not automatically convert each appointment into a clinical visit note.

For production, make the transition graph explicit in one backend function and test every allowed/denied edge (for example, whether a doctor can move `Scheduled` directly to `Completed`). Do not rely only on the enum to enforce transition order.

### Modeling and index considerations

The existing `Patient.visitHistory` embedding makes a small, bounded number of visits easy to fetch with the patient page. If a patient's visits or clinical notes can grow without bound, move visits to a separate `Visit` collection with `{ clinicId, patientId, visitedAt, doctorId, status }` and a compound index such as `{ clinicId: 1, patientId: 1, visitedAt: -1 }`; retain only summary/count fields on `Patient`. The choice should follow real read/write patterns and retention rules.

The current appointment queue has a `{ clinicId, createdAt }` index. For the doctor query pattern, consider `{ clinicId: 1, doctorId: 1, createdAt: -1 }`. For assignments queried by doctor/clinic/active, consider a compound index such as `{ clinicId: 1, doctorId: 1, active: 1, patientId: 1 }`; check with `explain()` and real Atlas data before adding indexes, because each index costs write/storage resources.

Audit retention is a policy decision. Do not add a TTL index just to make logs disappear by default. If an approved policy calls for automatic expiry, MongoDB TTL indexes are single-field and deletion is asynchronous—not an exact-deadline erasure guarantee—so use them only after establishing retention, archival, legal-hold, and backup requirements.

Official references: [embedding versus references](https://www.mongodb.com/docs/manual/data-modeling/concepts/embedding-vs-references/), [data-modeling best practices](https://www.mongodb.com/docs/manual/data-modeling/best-practices/), and [TTL index behavior](https://www.mongodb.com/docs/manual/core/index-ttl/).

## 4. Run the service locally

Use Node 22 for the backend (Firebase Admin 14 requires it). In terminal 1:

```bash
cd backend
cp .env.example .env
# Edit .env with a non-production Atlas database and Firebase Admin credentials.
npm ci
npm run dev
```

In terminal 2:

```bash
cd frontend
cp .env.example .env
# Set VITE_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, APP_ID and VITE_API_URL=http://localhost:4000.
npm ci
npm run dev
```

Before a full socket/route smoke test, create and provision one verified test account for each role as described above. Keep both accounts in the same isolated test clinic if testing employee/doctor workflows together. To optionally add fictitious patient and appointment data, follow the opt-in `seed:demo` steps in [SETUP.md](./SETUP.md); never seed real patient information.

## 5. Test auth, RBAC, and sockets

### Fast deterministic tests (no Firebase credentials required)

```bash
cd backend
npm test
```

The unit/HTTP suite checks active role policy, role/clinic claim matching, doctor-assignment enforcement, role-guard behavior, fail-closed endpoints without Firebase Admin, and absence of old unprotected patient/appointment collection routes. It does not connect to Atlas or Firebase.

### End-to-end API role checks (Firebase + Mongo required)

With the API running and one dedicated role test account in `frontend/.env.local`:

```bash
cd frontend
npm run test:rbac -- doctor
```

Set `STELLAR_TEST_EMAIL` and `STELLAR_TEST_PASSWORD` to the employee's local test account and run:

```bash
npm run test:rbac -- employee
```

Each command signs in to Firebase, force-fetches a fresh ID token, then checks: anonymous `/api/auth/me` → **401**, the signed-in role's scoped list → **200**, and the opposite role's list → **403**. The script prints no password or token. A valid profile is necessary: email verified, Firebase claims provisioned for the same clinic, active Mongo `StaffUser`, working Atlas connection, and an assignment for patient-detail checks.

### Socket.IO handshake checks

With the API server running and a provisioned test account in `frontend/.env.local`:

```bash
cd frontend
npm run test:socket
```

This signs into the configured Firebase test account, obtains a fresh ID token, and attempts a Socket.IO handshake. Expected positive result: **connected** for a verified, active, provisioned account with matching role/clinic claims. The server selects rooms from the verified profile; there is no client-supplied room name or join event.

Then test rejection with no token:

```bash
npm run test:socket -- --expect-deny
```

This expects a handshake rejection. For a stronger negative check against a configured backend, run with a deliberately invalid placeholder token (never a real token): `STELLAR_ID_TOKEN=not-a-firebase-token npm run test:socket -- --expect-deny`. Confirm in API logs that unauthenticated, invalid, expired/revoked, unverified, inactive, stale-role, and wrong-clinic cases do not connect. The probe only checks handshake acceptance/rejection; testing room-level event delivery requires a dedicated staging scenario with two scoped accounts and a fictitious event.

Useful checks:

```bash
curl -i http://localhost:4000/api/health
curl -i http://localhost:4000/api/doctor/patients      # no Authorization header: 401 when Firebase is configured
```

Do not run the smoke probes against a production clinic or put real patient data in their requests. Before deployment, also test an employee attempting the doctor route, a doctor attempting the employee route, a doctor requesting an unassigned patient's ID, a disabled account, a stale custom claim after a role change, token revocation, and two different clinics. The cross-role/assignment unit tests do not replace private-environment end-to-end tests.
