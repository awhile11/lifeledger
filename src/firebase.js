// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLNFeH3b137z0SGUABJPRAZpRYzstFjR8",
  authDomain: "lifeleadger1.firebaseapp.com",
  projectId: "lifeleadger1",
  storageBucket: "lifeleadger1.firebasestorage.app",
  messagingSenderId: "918742119933",
  appId: "1:918742119933:web:aeb303a716479a38d11594",
  measurementId: "G-B1WQVEWBPT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

export { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut
};
export default app;