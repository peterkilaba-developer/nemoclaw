import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Logs a security or compliance event to the _securityLogs collection.
 * @param {Object} eventDetails - The details of the security event.
 * @param {string} eventDetails.type - Event category (e.g., 'Blocked', 'Monitored', 'Audit', 'Success').
 * @param {string} eventDetails.desc - Description of the event (e.g., 'Failed login attempt').
 * @param {string} eventDetails.ip - Optional IP address or location data.
 * @param {Object} eventDetails.metadata - Optional extra metadata.
 */
export async function logSecurityEvent({ type, desc, ip = 'unknown', metadata = {} }) {
  try {
    await addDoc(collection(db, '_securityLogs'), {
      type,
      desc,
      ip,
      metadata,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // Failsafe: Do not crash the application if auth logging fails
    console.warn('Failed to log security event:', err.message);
  }
}
