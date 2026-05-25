/**
 * Firebase initialization.
 *
 * If VITE_USE_MOCK_DATA=true (or Firebase config is missing), we skip Firebase
 * setup entirely and the app falls back to in-memory mock data. This lets you
 * run the project locally without a Firebase account.
 *
 * When you're ready to connect:
 *   1. Create a Firebase project at https://console.firebase.google.com
 *   2. Enable Authentication, Firestore, and Storage
 *   3. Copy your config into .env.local (see .env.example)
 *   4. Set VITE_USE_MOCK_DATA=false
 *   5. Deploy rules:  firebase deploy --only firestore:rules,storage:rules
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export const USE_MOCK_DATA =
  import.meta.env.VITE_USE_MOCK_DATA === 'true' || !import.meta.env.VITE_FIREBASE_API_KEY;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (!USE_MOCK_DATA) {
  app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
