// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-vSYikNziz3tVRpy3206z1XTrTiRJw80",
  authDomain: "flous-dart-d9832.web.app",
  projectId: "flous-dart-d9832",
  storageBucket: "flous-dart-d9832.appspot.com",
  messagingSenderId: "407676989520",
  appId: "1:407676989520:web:c8413d4965ef6c0cd7a155"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
