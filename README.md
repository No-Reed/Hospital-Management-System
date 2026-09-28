# StellarCare — Hospital Management System

A React + TypeScript clinic workspace with separate public booking, employee operations, and doctor patient-care pages.

## Role-based experience

- **Public visitors:** can request an appointment without an account; no clinical records are exposed.
- **Employees:** sign in through Firebase Authentication to review appointment requests, confirm or cancel them, create patient records, and link appointment requests to existing patients.
- **Doctors:** sign in through Firebase Authentication to see only their own appointments and patients with an active doctor assignment, review clinical summaries and visit history, and update visit status.

The server verifies Firebase ID tokens and matches server-assigned role/clinic claims against the active MongoDB staff profile. Appointment ownership and patient assignment are also enforced server-side; a browser cannot grant itself a role. Realtime Socket.IO connections use the same checks and server-selected rooms.

## Get started

Follow **[SETUP.md](./SETUP.md)** for the main install and migration steps. See **[LOCAL_AUTH_ATLAS_TESTING.md](./LOCAL_AUTH_ATLAS_TESTING.md)** for the Firebase sign-in UI and custom claims, MongoDB schema, and local API/socket security probes. The example environment files contain placeholders only. No Atlas URI or Firebase service-account secret is included.

For a local frontend-only start, install in `frontend/` and run `npm run dev`. Protected pages require a configured Firebase web app plus an active staff profile in the backend.

## Validation

```bash
cd frontend && npm ci && npm run build && npm run lint
cd ../backend && npm ci && npm test
```

## Privacy and deployment note

This application is a starter implementation, not a certification of compliance or a substitute for a clinical system security review. Before production, configure least-privilege Atlas credentials, Firebase MFA/verified staff accounts, clinic-specific roles, encrypted hosting, backups, audit and retention policies, and applicable privacy/health-data controls. Review and rehearse data migrations against a backup or staging database before production use.
