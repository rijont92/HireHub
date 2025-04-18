// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBy4bVUtUwSUSijmr0Rvjiwu9rlbWBhOG8",
  authDomain: "hirehub-218fb.firebaseapp.com",
  projectId: "hirehub-218fb",
  storageBucket: "hirehub-218fb.appspot.com",
  messagingSenderId: "415486449267",
  appId: "1:415486449267:web:142dfe1371a01f7a02bc06"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 