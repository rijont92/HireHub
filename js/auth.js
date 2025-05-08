import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Sign Up function
export async function signUp(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Send verification email
        await sendEmailVerification(user);
        
        // Don't set isAuthenticated to true until email is verified
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
        
        // Check if email is verified
        if (!user.emailVerified) {
            // Send verification email again if not verified
            await sendEmailVerification(user);
            return { 
                success: false, 
                error: 'Please verify your email first. A new verification email has been sent.',
                needsVerification: true 
            };
        }
        
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
        localStorage.removeItem("isAuthenticated");
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Check Auth State
export function checkAuthState(callback) {
    return onAuthStateChanged(auth, (user) => {
        if (user && user.emailVerified) {
            localStorage.setItem("isAuthenticated", "true");
        } else {
            localStorage.setItem("isAuthenticated", "false");
        }
        callback(user);
    });
}

export function isAuthenticated() {
    return localStorage.getItem("isAuthenticated") === "true";
}

// Check if email is verified
export function isEmailVerified() {
    const user = auth.currentUser;
    return user && user.emailVerified;
}

