
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-analytics.js";


const firebaseConfig = {
  apiKey: "AIzaSyCePiJ0t4AjSnh_pYj0K4syZ_ATNZCfEhs",
  authDomain: "hirehub-d7a32.firebaseapp.com",
  projectId: "hirehub-d7a32",
  storageBucket: "hirehub-d7a32.firebasestorage.app",
  messagingSenderId: "709139851875",
  appId: "1:709139851875:web:6e871ff4df6c72a3662656",
  measurementId: "G-0VPRE8XGWC"
};


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);