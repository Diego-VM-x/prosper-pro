// lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Reemplaza estos con la configuración de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBmrDThJ-J40ktiSWDkex1yjB-fa4lkDyg",
  authDomain: "prosper-197d4.firebaseapp.com",
  projectId: "prosper-197d4",
  storageBucket: "prosper-197d4.firebasestorage.app",
  messagingSenderId: "183396372863",
  appId: "1:183396372863:web:1b3a5c2d1d5288c7a28a4a",
  measurementId: "G-PW6SZ1WP5Y"
};

// Inicializa Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
