import { signIn } from '../js/auth.js';
import { setupLoginValidation, validateLoginForm } from '../js/validation.js';
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginForm = document.getElementById('loginForm');
const errorEmail = document.getElementById('error-email');
const errorPassword = document.getElementById('error-password');
const generalError = document.getElementById('general-error');
const passwordInput = document.getElementById('password');
const icon = document.getElementById('icon');

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
                localStorage.setItem('userData', JSON.stringify(userData));
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
        if (result.error.includes('user-not-found') || 
            result.error.includes('wrong-password') || 
            result.error.includes('auth/wrong-password') ||
            result.error.includes('auth/user-not-found')) {
            generalError.textContent = 'Email or password is invalid';
        } else if (result.error.includes('too-many-requests')) {
            generalError.textContent = 'Too many failed attempts. Please try again later.';
        } else if (result.error.includes('invalid-email')) {
            generalError.textContent = 'Please enter a valid email address';
        } else {
            generalError.textContent = 'An error occurred. Please try again.';
        }
    }
});