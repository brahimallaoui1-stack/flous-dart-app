
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "flous-dart-manager",
  "appId": "1:1004091828401:web:ca731e7647c4611688da90",
  "storageBucket": "flous-dart-manager.appspot.com",
  "apiKey": "AIzaSyDpPib_QcdNZ6OGJ_CiXxLm-9pn_ZCF93Y",
  "authDomain": "flous-dart-manager.firebaseapp.com",
  "messagingSenderId": "1004091828401"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
