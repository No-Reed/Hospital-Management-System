require('dotenv').config();
const mongoose = require('mongoose');
const StaffUser = require('./models/StaffUser');

async function patch() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Check if there are any doctors
    const doctors = await StaffUser.find({ role: 'doctor' });
    if (doctors.length > 0) {
      console.log('Found existing doctors. Enabling public booking for all of them...');
      await StaffUser.updateMany({ role: 'doctor' }, { $set: { publicBookingEnabled: true } });
      console.log('Updated existing doctors.');
    } else {
      console.log('No doctors found. Creating a demo doctor...');
      await StaffUser.create({
        firebaseUid: 'demo-doctor-uid-12345',
        role: 'doctor',
        displayName: 'Dr. Sarah Jenkins',
        email: 'sarah.jenkins@example.com',
        specialty: 'General Practice',
        clinicId: process.env.DEFAULT_CLINIC_ID || 'default',
        active: true,
        publicBookingEnabled: true
      });
      console.log('Created demo doctor.');
    }
    
    console.log('Patch complete. You can now use the booking form!');
    process.exit(0);
  } catch (error) {
    console.error('Error patching:', error);
    process.exit(1);
  }
}

patch();
