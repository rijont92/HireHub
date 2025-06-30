import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBy4bVUtUwSUSijmr0Rvjiwu9rlbWBhOG8",
  authDomain: "hirehub-218fb.firebaseapp.com",
  projectId: "hirehub-218fb",
  storageBucket: "hirehub-218fb.firebasestorage.app",
  messagingSenderId: "415486449267",
  appId: "1:415486449267:web:142dfe1371a01f7a02bc06"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage, firebaseConfig }; 