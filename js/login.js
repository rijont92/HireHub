import { signIn, signInWithGoogle } from '../js/auth.js';
import { setupLoginValidation, validateLoginForm } from '../js/validation.js';
import { db } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginForm = document.getElementById('loginForm');
const errorEmail = document.getElementById('error-email');
const errorPassword = document.getElementById('error-password');
const generalError = document.getElementById('general-error');
const passwordInput = document.getElementById('password');
const icon = document.getElementById('icon');
const googleSignInBtn = document.querySelector('.google');
const date = document.getElementById("date");

const yearDate = new Date().getFullYear();
date.innerHTML = yearDate;

import { isAuthenticated } from '../js/auth.js';

if (isAuthenticated()) {
    window.location.replace("../index.html"); 
}

// Password visibility toggle
window.changeIcon = function() {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    }
};

// Setup real-time validation
setupLoginValidation();

// Google Sign In
if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('Google sign-in button clicked');
        
        try {
            const result = await signInWithGoogle();
            console.log('Google sign-in result:', result);
            
            if (result.success && result.user) {
                try {
                    // Get user data from Firestore
                    const userRef = doc(db, 'users', result.user.uid);
                    const userDoc = await getDoc(userRef);
                    
                    if (userDoc.exists()) {
                        console.log('Existing user found:', userDoc.data());
                        // Get the user data
                        const userData = userDoc.data();
                        localStorage.setItem('userData', JSON.stringify(userData));
                    } else {
                        console.log('Creating new user document...');
                        // If no user document exists, create a default user data
                        const defaultUserData = {
                            name: result.user.displayName || '',
                            email: result.user.email,
                            profileImage: result.user.photoURL || '../img/useri.png',
                            createdAt: new Date().toISOString(),
                            bio: '',
                            skills: [],
                            experience: [],
                            education: [],
                            notifications: {
                                email: true,
                                push: true,
                                jobAlerts: true
                            }
                        };
                        
                        // Create the user document in Firestore
                        await setDoc(userRef, defaultUserData);
                        console.log('New user document created:', defaultUserData);
                        localStorage.setItem('userData', JSON.stringify(defaultUserData));
                    }
                    
                    // Login successful
                    console.log('Redirecting to home page...');
                    window.location.href = '../index.html';
                } catch (error) {
                    console.error('Error handling user data:', error);
                    generalError.textContent = 'Error loading user data. Please try again.';
                }
            } else {
                console.error('Google sign-in failed:', result.error);
                generalError.textContent = result.error || 'Error signing in with Google. Please try again.';
            }
        } catch (error) {
            console.error('Google sign-in error:', error);
            generalError.textContent = 'Error signing in with Google. Please try again.';
        }
    });
} else {
    console.error('Google sign-in button not found');
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Clear previous errors
    errorEmail.textContent = '';
    errorPassword.textContent = '';
    generalError.textContent = '';

    // Validate form before submission
    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
        // Display validation errors
        if (!email || !password) {
            generalError.textContent = 'Please fill in all fields';
        } else {
            generalError.textContent = 'Email or password is invalid';
        }
        return;
    }

    const result = await signIn(email, password);

    if (result.success) {
        try {
            // Get user data from Firestore
            const userRef = doc(db, 'users', result.user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                // Get the user data
                const userData = userDoc.data();
                
                // Store user data in localStorage
                // localStorage.setItem('userData', JSON.stringify(userData));
            } else {
                // If no user document exists, create a default user data
                const defaultUserData = {
                    name: result.user.displayName || '',
                    email: result.user.email,
                    profileImage: '../img/useri.png',
                    createdAt: new Date().toISOString(),
                    bio: '',
                    skills: [],
                    experience: [],
                    education: [],
                    notifications: {
                        email: true,
                        push: true,
                        jobAlerts: true
                    }
                };
                localStorage.setItem('userData', JSON.stringify(defaultUserData));
            }
            
            // Login successful
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error fetching user data:', error);
            generalError.textContent = 'Error loading user data. Please try again.';
        }
    } else {
        // Handle error
        if (result.needsVerification) {
            generalError.innerHTML = `
                <div style="text-align: center; color: #755ea3; margin-bottom: 10px;">
                    <i class="fas fa-envelope" style="font-size: 24px;"></i>
                </div>
                <p style="margin-bottom: 10px;">Please verify your email address first.</p>
                <p style="font-size: 0.9em; color: #666;">A new verification email has been sent to your inbox.</p>
                <p style="font-size: 0.9em; color: #666;">Check your email and click the verification link to continue.</p>
            `;
        } else if (result.error.includes('user-not-found') || 
            result.error.includes('wrong-password') || 
            result.error.includes('auth/wrong-password')) {
            generalError.textContent = 'Email or password is invalid';
        } else if (result.error.includes('too-many-requests')) {
            generalError.textContent = 'Too many failed attempts. Please try again later.';
        } else if (result.error.includes('invalid-email')) {
            generalError.textContent = 'Please enter a valid email address';
        } else {
            generalError.textContent = 'Incorrect email or password';
        }
    }
});