
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from 'firebase/messaging';


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDpPib_QcdNZ6OGJ_CiXxLm-9pn_ZCF93Y",
  authDomain: "flous-dart-manager.firebaseapp.com",
  projectId: "flous-dart-manager",
  storageBucket: "flous-dart-manager.appspot.com",
  messagingSenderId: "1004091828401",
  appId: "1:1004091828401:web:ca731e7647c4611688da90"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const messaging = (typeof window !== 'undefined') ? getMessaging(app) : undefined;
export { app };
