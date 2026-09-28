function hasRole(staff, ...roles) {
  return Boolean(staff && staff.active !== false && roles.includes(staff.role));
}

function sameClinic(staff, clinicId) {
  return Boolean(staff && staff.clinicId && staff.clinicId === String(clinicId));
}

function claimsMatchStaff(decodedToken, staff) {
  return Boolean(decodedToken && staff &&
    decodedToken.stellarcareRole === staff.role &&
    decodedToken.stellarcareClinicId === staff.clinicId);
}

function canAccessPatient(staff, patient, assignment) {
  if (!staff || !patient || !sameClinic(staff, patient.clinicId)) return false;
  if (staff.role === 'employee') return true;
  if (staff.role !== 'doctor' || !assignment || assignment.active !== true) return false;
  return String(assignment.doctorId) === String(staff._id) &&
    String(assignment.patientId) === String(patient._id) &&
    String(assignment.clinicId) === String(staff.clinicId);
}

module.exports = { hasRole, sameClinic, claimsMatchStaff, canAccessPatient };
