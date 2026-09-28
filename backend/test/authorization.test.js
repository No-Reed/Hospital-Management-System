const test = require('node:test');
const assert = require('node:assert/strict');
const { canAccessPatient, hasRole, sameClinic, claimsMatchStaff } = require('../authorization');
const { requireRole } = require('../middleware/authenticateStaff');

const employee = { _id: 'employee-1', role: 'employee', clinicId: 'clinic-a', active: true };
const doctor = { _id: 'doctor-1', role: 'doctor', clinicId: 'clinic-a', active: true };
const patient = { _id: 'patient-1', clinicId: 'clinic-a' };

test('roles are active and checked from the server-loaded profile', () => {
  assert.equal(hasRole(employee, 'employee'), true);
  assert.equal(hasRole(employee, 'doctor'), false);
  assert.equal(hasRole({ ...doctor, active: false }, 'doctor'), false);
});

test('Firebase role and clinic claims must match the active server profile', () => {
  assert.equal(claimsMatchStaff({ stellarcareRole: 'doctor', stellarcareClinicId: 'clinic-a' }, doctor), true);
  assert.equal(claimsMatchStaff({ stellarcareRole: 'employee', stellarcareClinicId: 'clinic-a' }, doctor), false);
  assert.equal(claimsMatchStaff({ stellarcareRole: 'doctor', stellarcareClinicId: 'clinic-b' }, doctor), false);
  assert.equal(claimsMatchStaff({}, doctor), false);
});

test('staff can access records only within their clinic', () => {
  assert.equal(sameClinic(employee, patient.clinicId), true);
  assert.equal(canAccessPatient(employee, patient, null), true);
  assert.equal(canAccessPatient(employee, { ...patient, clinicId: 'clinic-b' }, null), false);
});

test('doctor patient access requires the matching active assignment', () => {
  const assignment = { doctorId: doctor._id, patientId: patient._id, clinicId: doctor.clinicId, active: true };
  assert.equal(canAccessPatient(doctor, patient, assignment), true);
  assert.equal(canAccessPatient(doctor, patient, { ...assignment, doctorId: 'doctor-2' }), false);
  assert.equal(canAccessPatient(doctor, patient, { ...assignment, patientId: 'patient-2' }), false);
  assert.equal(canAccessPatient(doctor, patient, { ...assignment, active: false }), false);
  assert.equal(canAccessPatient(doctor, { ...patient, clinicId: 'clinic-b' }, assignment), false);
});

test('HTTP role guard rejects the wrong role before entering a protected handler', () => {
  const guard = requireRole('doctor');
  let status = 200;
  let body;
  let passed = false;
  const response = { status(value) { status = value; return this; }, json(value) { body = value; return this; } };
  guard({ staff: employee }, response, () => { passed = true; });
  assert.equal(status, 403);
  assert.equal(body.error, 'You do not have access to this page.');
  assert.equal(passed, false);
  guard({ staff: doctor }, response, () => { passed = true; });
  assert.equal(passed, true);
});
