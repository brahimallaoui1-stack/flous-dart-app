// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "flous-dart-manager",
  "appId": "1:1004091828401:web:ca731e7647c4611688da90",
  "storageBucket": "flous-dart-manager.firebasestorage.app",
  "apiKey": "AIzaSyDpPib_QcdNZ6OGJ_CiXxLm-9pn_ZCF93Y",
  "authDomain": "flous-dart-manager.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "1004091828401"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
