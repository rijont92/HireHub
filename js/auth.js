import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export async function signUp(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await sendEmailVerification(user);
        
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
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

export async function logOut() {
    try {
        await signOut(auth);
        localStorage.removeItem("isAuthenticated");
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

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

export function isEmailVerified() {
    const user = auth.currentUser;
    return user && user.emailVerified;
}

export async function signInWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        
        const result = await signInWithPopup(auth, provider);
        
        if (result.user) {
            localStorage.setItem("isAuthenticated", "true");
            return { success: true, user: result.user };
        }
        
        return { success: false, error: 'No user data received' };
    } catch (error) {
        console.error('Google sign-in error details:', {
            code: error.code,
            message: error.message,
            email: error.email,
            credential: error.credential
        });
        
        if (error.code === 'auth/popup-blocked') {
            return { 
                success: false, 
                error: 'Please allow popups for this website to sign in with Google.' 
            };
        } else if (error.code === 'auth/popup-closed-by-user') {
            return { 
                success: false, 
                error: 'Sign-in popup was closed before completing the sign-in.' 
            };
        } else if (error.code === 'auth/cancelled-popup-request') {
            return { 
                success: false, 
                error: 'Multiple popup requests were made. Please try again.' 
            };
        } else if (error.code === 'auth/unauthorized-domain') {
            return { 
                success: false, 
                error: 'This domain is not authorized for OAuth operations. Please contact support.' 
            };
        }
        
        return { success: false, error: error.message };
    }
}

