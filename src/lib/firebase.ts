// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB-vSYikNziz3tVRpy3206z1XTrTiRJw80",
  authDomain: "flous-dart-d9832.firebaseapp.com",
  projectId: "flous-dart-d9832",
  storageBucket: "flous-dart-d9832.firebasestorage.app",
  messagingSenderId: "407676989520",
  appId: "1:407676989520:web:c8413d4965ef6c0cd7a155"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
