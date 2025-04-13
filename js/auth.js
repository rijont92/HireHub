import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Sign Up function
export async function signUp(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        localStorage.setItem("isAuthenticated","true");

        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Sign In function
export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        localStorage.setItem("isAuthenticated","true");
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Sign Out function
export async function logOut() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Check Auth State
export function checkAuthState(callback) {
    return onAuthStateChanged(auth, (user) => {
        callback(user);
    });
} 

export function isAuthenticated() {
    return localStorage.getItem("isAuthenticated") === "true";
}

