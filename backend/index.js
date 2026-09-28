const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const http = require('http');
const { z } = require('zod');
const Appointment = require('./models/Appointment');
const Patient = require('./models/Patient');
const StaffUser = require('./models/StaffUser');
const DoctorAssignment = require('./models/DoctorAssignment');
const { initializeFirebase, firebaseReady, getFirebaseAuth } = require('./firebase');
const { authenticateStaff, requireRole } = require('./middleware/authenticateStaff');
const { canAccessPatient, claimsMatchStaff } = require('./authorization');
const { recordAudit } = require('./audit');

const app = express();
const server = http.createServer(app);
const origins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
  .split(',').map(value => value.trim()).filter(Boolean);
const corsOptions = { origin: origins, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] };
const io = new Server(server, { cors: corsOptions, maxHttpBufferSize: 1e6 });
const CLINIC_ID = process.env.DEFAULT_CLINIC_ID || 'default';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '32kb' }));
app.use('/api/public/appointments', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }));

const bookingSchema = z.object({
  patientName: z.string().trim().min(2).max(160),
  doctorId: z.string().regex(/^[a-f\d]{24}$/i),
  preferredTime: z.string().trim().min(2).max(100),
  contactInfo: z.string().trim().min(3).max(190),
});
const statusSchema = z.object({ status: z.enum(['Waiting', 'In Progress', 'Completed']) });
const employeeStatusSchema = z.object({ status: z.enum(['Scheduled']) });
const patientCreateSchema = z.object({ name: z.string().trim().min(2).max(160), doctorId: z.string().regex(/^[a-f\d]{24}$/i) });
const objectId = value => mongoose.isValidObjectId(value);
const staffDto = staff => ({ uid: staff.firebaseUid, role: staff.role, displayName: staff.displayName, specialty: staff.specialty || null });
const appointmentDto = (appointment, includeEmployeeContact = false) => ({
  _id: String(appointment._id),
  patientName: appointment.patientName,
  doctorName: appointment.doctorName || '',
  doctorId: appointment.doctorId ? String(appointment.doctorId) : null,
  patientId: appointment.patientId ? String(appointment.patientId) : null,
  preferredTime: appointment.preferredTime || appointment.slotTime || '',
  slotTime: appointment.preferredTime || appointment.slotTime || '',
  status: appointment.status,
  createdAt: appointment.createdAt,
  ...(includeEmployeeContact ? { contactInfo: appointment.contactInfo || '' } : {}),
});

app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

// Public booking reveals only providers explicitly opted into public appointment requests.
app.get('/api/public/doctors', async (_req, res, next) => {
  try {
    const doctors = await StaffUser.find({ role: 'doctor', active: true, publicBookingEnabled: true, clinicId: CLINIC_ID })
      .select('displayName specialty').sort({ displayName: 1 }).lean();
    res.json(doctors.map(doctor => ({ _id: String(doctor._id), name: doctor.displayName, specialty: doctor.specialty || '' })));
  } catch (error) { next(error); }
});

// Visitors can request a visit without an account. This does not create/link a clinical patient record.
app.post('/api/public/appointments', async (req, res, next) => {
  try {
    const parsed = bookingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Enter your name, choose a provider, and provide a preferred time.' });
    const { patientName, doctorId, preferredTime, contactInfo } = parsed.data;
    const doctor = await StaffUser.findOne({ _id: doctorId, role: 'doctor', active: true, publicBookingEnabled: true, clinicId: CLINIC_ID });
    if (!doctor) return res.status(400).json({ error: 'That provider is not accepting online requests.' });
    
    const existing = await Appointment.findOne({ doctorId: doctor._id, preferredTime, status: { $ne: 'Cancelled' } });
    if (existing) return res.status(409).json({ error: 'This time slot is already booked for this provider. Please choose another time.' });

    const appointment = await Appointment.create({
      clinicId: doctor.clinicId,
      patientName,
      contactInfo,
      doctorId: doctor._id,
      doctorName: doctor.displayName,
      preferredTime,
      slotTime: preferredTime,
      status: 'Requested',
    });
    const dto = appointmentDto(appointment);
    io.to(`clinic:${doctor.clinicId}:employees`).emit('appointment:requested', { _id: dto._id, doctorId: dto.doctorId, preferredTime: dto.preferredTime, status: dto.status });
    io.to(`staff:${doctor._id}`).emit('appointment:requested', dto);
    res.status(201).json({ message: 'Your appointment request was received.', appointment: { _id: dto._id, doctorName: dto.doctorName, preferredTime: dto.preferredTime, status: dto.status } });
  } catch (error) { next(error); }
});

// Identity/profile: UID comes from a verified Firebase token and role from Mongo, never from the browser.
app.get('/api/auth/me', authenticateStaff, (req, res) => res.json(staffDto(req.staff)));

// Employee workspace: clinic-scoped appointment operations.
app.get('/api/employee/doctors', authenticateStaff, requireRole('employee'), async (req, res, next) => {
  try {
    const doctors = await StaffUser.find({ role: 'doctor', active: true, clinicId: req.staff.clinicId }).select('displayName specialty').lean();
    res.json(doctors.map(doctor => ({ _id: String(doctor._id), name: doctor.displayName, specialty: doctor.specialty || '' })));
  } catch (error) { next(error); }
});

app.get('/api/employee/appointments', authenticateStaff, requireRole('employee'), async (req, res, next) => {
  try {
    const rows = await Appointment.find({ clinicId: req.staff.clinicId }).sort({ createdAt: -1 }).limit(250).lean();
    await recordAudit(req, 'employee.appointments.read', 'appointment', undefined, { count: rows.length });
    res.json(rows.map(row => appointmentDto(row, true)));
  } catch (error) { next(error); }
});

app.delete('/api/employee/appointments/:id', authenticateStaff, requireRole('employee'), async (req, res, next) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid appointment ID.' });
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.staff.clinicId, status: { $ne: 'Completed' } },
      { $set: { status: 'Cancelled' } }, { new: true }
    );
    if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });
    await recordAudit(req, 'employee.appointment.cancel', 'appointment', appointment._id);
    io.to(`clinic:${req.staff.clinicId}:employees`).emit('appointment:updated', { _id: String(appointment._id), status: 'Cancelled' });
    if (appointment.doctorId) io.to(`staff:${appointment.doctorId}`).emit('appointment:updated', { _id: String(appointment._id), status: 'Cancelled' });
    res.json({ message: 'Appointment cancelled.' });
  } catch (error) { next(error); }
});

app.patch('/api/employee/appointments/:id/status', authenticateStaff, requireRole('employee'), async (req, res, next) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid appointment ID.' });
    const parsed = employeeStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid appointment status.' });
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.staff.clinicId, status: 'Requested' },
      { $set: { status: parsed.data.status } }, { new: true }
    );
    if (!appointment) return res.status(404).json({ error: 'Request not found or already reviewed.' });
    await recordAudit(req, 'employee.appointment.confirm', 'appointment', appointment._id);
    const payload = { _id: String(appointment._id), status: appointment.status };
    io.to(`clinic:${req.staff.clinicId}:employees`).emit('appointment:updated', payload);
    if (appointment.doctorId) io.to(`staff:${appointment.doctorId}`).emit('appointment:updated', payload);
    res.json(appointmentDto(appointment, true));
  } catch (error) { next(error); }
});

// Employees see operational patient-list fields only; clinical history stays on doctor routes.
app.get('/api/employee/patients', authenticateStaff, requireRole('employee'), async (req, res, next) => {
  try {
    const patients = await Patient.find({ clinicId: req.staff.clinicId })
      .select('name visits lastVisit').sort({ lastVisit: -1 }).limit(250).lean();
    await recordAudit(req, 'employee.patients.read', 'patient', undefined, { count: patients.length });
    res.json(patients.map(patient => ({ _id: String(patient._id), name: patient.name, visits: patient.visits, lastVisit: patient.lastVisit })));
  } catch (error) { next(error); }
});

app.post('/api/employee/patients', authenticateStaff, requireRole('employee'), async (req, res, next) => {
  try {
    const parsed = patientCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Enter a patient name and choose an active doctor.' });
    const doctor = await StaffUser.findOne({ _id: parsed.data.doctorId, role: 'doctor', active: true, clinicId: req.staff.clinicId }).select('_id');
    if (!doctor) return res.status(400).json({ error: 'That doctor is not active in this clinic.' });
    const patient = await Patient.create({ clinicId: req.staff.clinicId, name: parsed.data.name });
    await DoctorAssignment.findOneAndUpdate(
      { doctorId: doctor._id, patientId: patient._id },
      { $set: { clinicId: req.staff.clinicId, active: true, endedAt: null } },
      { upsert: true, new: true, runValidators: true }
    );
    await recordAudit(req, 'employee.patient.create', 'patient', patient._id, { doctorId: doctor._id });
    res.status(201).json({ _id: String(patient._id), name: patient.name, visits: patient.visits, lastVisit: patient.lastVisit });
  } catch (error) { next(error); }
});

app.post('/api/employee/patients/:id/assign', authenticateStaff, requireRole('employee'), async (req, res, next) => {
  try {
    if (!objectId(req.params.id)) return res.status(404).json({ error: 'Patient not found.' });
    const parsed = patientCreateSchema.pick({ doctorId: true }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Choose an active doctor in this clinic.' });
    const [patient, doctor] = await Promise.all([
      Patient.findOne({ _id: req.params.id, clinicId: req.staff.clinicId }).select('_id'),
      StaffUser.findOne({ _id: parsed.data.doctorId, role: 'doctor', active: true, clinicId: req.staff.clinicId }).select('_id'),
    ]);
    if (!patient || !doctor) return res.status(404).json({ error: 'Patient or doctor not found in this clinic.' });
    await DoctorAssignment.findOneAndUpdate(
      { doctorId: doctor._id, patientId: patient._id },
      { $set: { clinicId: req.staff.clinicId, active: true, endedAt: null } },
      { upsert: true, new: true, runValidators: true }
    );
    await recordAudit(req, 'employee.patient.assign', 'patient', patient._id, { doctorId: doctor._id });
    res.json({ message: 'Patient assigned to doctor.' });
  } catch (error) { next(error); }
});

// A doctor can view only assigned patient records and their own appointment requests.
app.get('/api/doctor/appointments', authenticateStaff, requireRole('doctor'), async (req, res, next) => {
  try {
    const rows = await Appointment.find({ clinicId: req.staff.clinicId, doctorId: req.staff._id }).sort({ createdAt: -1 }).limit(250).lean();
    await recordAudit(req, 'doctor.appointments.read', 'appointment', undefined, { count: rows.length });
    res.json(rows.map(appointmentDto));
  } catch (error) { next(error); }
});

app.patch('/api/doctor/appointments/:id/status', authenticateStaff, requireRole('doctor'), async (req, res, next) => {
  try {
    if (!objectId(req.params.id)) return res.status(400).json({ error: 'Invalid appointment ID.' });
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid appointment status.' });
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.staff.clinicId, doctorId: req.staff._id, status: { $nin: ['Completed', 'Cancelled'] } },
      { $set: { status: parsed.data.status } }, { new: true }
    );
    if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });
    await recordAudit(req, 'doctor.appointment.status', 'appointment', appointment._id, { status: appointment.status });
    const payload = { _id: String(appointment._id), status: appointment.status };
    io.to(`clinic:${req.staff.clinicId}:employees`).emit('appointment:updated', payload);
    io.to(`staff:${req.staff._id}`).emit('appointment:updated', payload);
    res.json(appointmentDto(appointment));
  } catch (error) { next(error); }
});

app.get('/api/doctor/patients', authenticateStaff, requireRole('doctor'), async (req, res, next) => {
  try {
    const assignments = await DoctorAssignment.find({ doctorId: req.staff._id, clinicId: req.staff.clinicId, active: true }).select('patientId').lean();
    const patientIds = assignments.map(item => item.patientId);
    const patients = await Patient.find({ _id: { $in: patientIds }, clinicId: req.staff.clinicId })
      .select('name visits lastVisit').sort({ lastVisit: -1 }).limit(250).lean();
    await recordAudit(req, 'doctor.patients.read', 'patient', undefined, { count: patients.length });
    res.json(patients.map(patient => ({ _id: String(patient._id), name: patient.name, visits: patient.visits, lastVisit: patient.lastVisit })));
  } catch (error) { next(error); }
});

app.get('/api/doctor/patients/:id', authenticateStaff, requireRole('doctor'), async (req, res, next) => {
  try {
    if (!objectId(req.params.id)) return res.status(404).json({ error: 'Patient not found.' });
    const assignment = await DoctorAssignment.findOne({ doctorId: req.staff._id, patientId: req.params.id, clinicId: req.staff.clinicId, active: true }).lean();
    if (!assignment) return res.status(404).json({ error: 'Patient not found.' });
    const patient = await Patient.findOne({ _id: req.params.id, clinicId: req.staff.clinicId }).lean();
    if (!canAccessPatient(req.staff, patient, assignment)) return res.status(404).json({ error: 'Patient not found.' });
    await recordAudit(req, 'doctor.patient.detail.read', 'patient', patient._id);
    res.json({
      _id: String(patient._id), name: patient.name, age: patient.age, gender: patient.gender,
      historySummary: patient.historySummary || patient.history || '', conditions: patient.conditions || [], allergies: patient.allergies || [],
      visitHistory: (patient.visitHistory || []).map(visit => ({ _id: String(visit._id), visitedAt: visit.visitedAt, status: visit.status, summary: visit.summary || '' })),
    });
  } catch (error) { next(error); }
});

// Only an authorized employee can link a request to an existing clinical record.
app.patch('/api/employee/appointments/:id/patient', authenticateStaff, requireRole('employee'), async (req, res, next) => {
  try {
    if (!objectId(req.params.id) || !objectId(req.body.patientId)) return res.status(400).json({ error: 'Invalid record ID.' });
    const patient = await Patient.findOne({ _id: req.body.patientId, clinicId: req.staff.clinicId }).select('_id name clinicId');
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.staff.clinicId, doctorId: { $exists: true, $ne: null } },
      { $set: { patientId: patient._id, patientName: patient.name } }, { new: true }
    );
    if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });
    await DoctorAssignment.findOneAndUpdate(
      { doctorId: appointment.doctorId, patientId: patient._id },
      { $set: { clinicId: req.staff.clinicId, active: true, endedAt: null } },
      { upsert: true, new: true, runValidators: true }
    );
    await recordAudit(req, 'employee.appointment.patient.link', 'appointment', appointment._id, { patientId: patient._id });
    io.to(`staff:${appointment.doctorId}`).emit('appointment:updated', { _id: String(appointment._id), patientId: String(patient._id) });
    res.json({ message: 'Appointment linked to the patient record.' });
  } catch (error) { next(error); }
});

// Firebase-authenticated, clinic-scoped socket rooms. No client-chosen room names.
io.use(async (socket, next) => {
  try {
    if (!firebaseReady()) return next(new Error('authentication_not_configured'));
    const decoded = await getFirebaseAuth().verifyIdToken(socket.handshake.auth?.token || '', true);
    if (decoded.email_verified !== true) return next(new Error('email_not_verified'));
    const staff = await StaffUser.findOne({ firebaseUid: decoded.uid, active: true }).select('_id role clinicId').lean();
    if (!staff) return next(new Error('unauthorized'));
    if (!claimsMatchStaff(decoded, staff)) return next(new Error('role_claims_mismatch'));
    socket.data.staff = { id: String(staff._id), role: staff.role, clinicId: staff.clinicId };
    socket.data.tokenExpiresAt = decoded.exp * 1000;
    next();
  } catch { next(new Error('unauthorized')); }
});

io.on('connection', socket => {
  const staff = socket.data.staff;
  const expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.tokenExpiresAt - Date.now()));
  socket.on('disconnect', () => clearTimeout(expiryTimer));
  if (staff.role === 'employee') socket.join(`clinic:${staff.clinicId}:employees`);
  socket.join(`staff:${staff.id}`);
});

app.use((error, _req, res, _next) => {
  console.error('Request failed:', error.name || 'Error');
  res.status(500).json({ error: 'The request could not be completed.' });
});

async function start() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required. Copy backend/.env.example to backend/.env and set your Atlas URI.');
  if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_ORIGINS) throw new Error('CLIENT_ORIGINS must be set to the exact production frontend origin.');
  initializeFirebase();
  if (!firebaseReady()) throw new Error('Firebase Admin credentials are required. Set FIREBASE_PROJECT_ID and the server credential variables in backend/.env.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const port = Number(process.env.PORT || 4000);
  server.listen(port, '0.0.0.0', () => console.log(`StellarCare API listening on port ${port}`));
}

if (require.main === module) {
  start().catch(error => { console.error(error.message); process.exit(1); });
}

module.exports = { app, server, io, start };
