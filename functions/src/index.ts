import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK once globally
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export the functions so Firebase can deploy them
export { setupUserAccount } from './merchants';