import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore with specified databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

export default app;
