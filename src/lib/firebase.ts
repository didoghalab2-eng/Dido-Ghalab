import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Ensure persistence works in Electron
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Test connection to Firestore
async function testConnection() {
  try {
    console.log("Testing Firestore connection...");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test completed.");
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("CRITICAL: Firebase configuration error or offline.");
    }
    // Skip logging for other errors, as this is simply a connection test.
  }
}
testConnection();

export default app;
