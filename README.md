# StellarCare - Hospital Management System

A full-stack clinic workspace built with React, Node.js, Express, MongoDB Atlas, and Firebase Authentication. Features separate interfaces for public appointment booking, front desk administration, and doctor clinical care with server-enforced role-based access control (RBAC).

Live Deployment: https://stellarcare.onrender.com/

---

## Role-Based Architecture

- **Public Visitors**: Can view doctors accepting online bookings and request appointments without an account. Patient clinical records are never exposed to public visitors.
- **Front Desk Employees**: Authenticate via Firebase to review incoming appointment requests, schedule, link requests to existing clinical patient records, and manage clinic workflows.
- **Doctors**: Authenticate via Firebase to view only their assigned patients and appointments, review clinical summaries and visit histories, and update appointment statuses.

Security is fail-closed. The backend validates Firebase ID tokens and cross-checks server-assigned custom claims (`stellarcareRole`, `stellarcareClinicId`) against active MongoDB staff records. Socket.IO connections enforce the same verification and place staff into server-scoped rooms.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, CSS Modules, Socket.IO Client, Firebase Web SDK
- **Backend**: Node.js 22, Express, Mongoose, Socket.IO, Helmet, Zod, Express Rate Limit, Firebase Admin SDK
- **Database**: MongoDB Atlas
- **Authentication**: Firebase Authentication (Email/Password with Custom Server Claims)
- **Hosting and CI/CD**: Render (Unified Full-Stack Web Service)

---

## Live Links and Pages

- **Homepage and Public Booking**: https://stellarcare.onrender.com/
- **Doctor Sign-In**: https://stellarcare.onrender.com/doctor/login
- **Employee Sign-In**: https://stellarcare.onrender.com/employee/login
- **Health Check API**: https://stellarcare.onrender.com/api/health

---

## Local Development Setup

### 1. Prerequisites
- Node.js (version 20 or higher, 22 recommended)
- MongoDB Atlas cluster
- Firebase project with Email/Password authentication enabled

### 2. Installation
Install dependencies for both frontend and backend:

```bash
npm install --prefix backend
npm install --prefix frontend
```

### 3. Environment Variables

Create `backend/.env`:
```env
PORT=4000
DEFAULT_CLINIC_ID=default
NODE_ENV=development
MONGO_URI=your-mongodb-atlas-uri
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-service-account-private-key"
CLIENT_ORIGINS=http://localhost:5173
```

Create `frontend/.env`:
```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
VITE_API_URL=http://localhost:4000
```

### 4. Provision Staff Accounts

Create user accounts in Firebase Authentication Console, then run the server-side provisioning script:

```bash
cd backend

# Provision a doctor (with public appointment booking enabled)
SEED_DOCTOR_PUBLIC_BOOKING=true npm run provision:staff -- <FIREBASE_UID> doctor "Dr. Jane Doe" "Cardiology"

# Provision a front desk employee
npm run provision:staff -- <FIREBASE_UID> employee "Reception Desk"
```

### 5. Running the Application

Option A - Run as a unified full-stack application:
```bash
npm run build
npm start
```
The site will be accessible at http://localhost:4000.

Option B - Run frontend and backend separately with hot reload:
```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Frontend Client
cd frontend && npm run dev
```

---

## Deployment to Render

The repository is configured to deploy as a single unified web service on Render's Free tier:

1. Create a new **Web Service** on Render connected to this repository.
2. Configure settings:
   - **Environment**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
   - **Instance Type**: Free
3. Add the required environment variables:
   - `NODE_ENV`: `production`
   - `NODE_VERSION`: `22.13.1`
   - `DEFAULT_CLINIC_ID`: `default`
   - `MONGO_URI`: MongoDB Atlas connection string
   - `FIREBASE_PROJECT_ID`: Firebase project ID
   - `FIREBASE_CLIENT_EMAIL`: Firebase Admin client email
   - `FIREBASE_PRIVATE_KEY`: Firebase Admin private key
   - `VITE_FIREBASE_API_KEY`: Firebase Web API key
   - `VITE_FIREBASE_AUTH_DOMAIN`: Firebase Auth domain
   - `VITE_FIREBASE_PROJECT_ID`: Firebase project ID
   - `VITE_FIREBASE_APP_ID`: Firebase Web App ID
4. Add your deployed Render domain (for example `stellarcare.onrender.com`) to Firebase Authentication > Settings > Authorized Domains.

---

## Project Structure

```
├── backend/
│   ├── index.js                  # Express application and Socket.IO server
│   ├── firebase.js               # Firebase Admin SDK initialization
│   ├── authorization.js          # Access control and claim validation logic
│   ├── audit.js                  # Audit logging service
│   ├── middleware/               # Authentication and role verification
│   ├── models/                   # Mongoose schemas (Staff, Patient, Appointment, etc.)
│   └── scripts/                  # Staff provisioning and database migration scripts
├── frontend/
│   ├── src/
│   │   ├── components/           # UI views (DoctorDashboard, HMSDashboard, BookingForm)
│   │   ├── contexts/             # AuthContext managing user session and state
│   │   ├── lib/                  # API client and Firebase Web SDK setup
│   │   └── App.tsx               # Client-side router and view container
│   └── vite.config.ts            # Vite configuration
├── package.json                  # Root orchestration scripts
└── render.yaml                   # Infrastructure specification for Render
```

---

## License

This project is licensed under the ISC License.
