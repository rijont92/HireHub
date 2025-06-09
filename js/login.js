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

setupLoginValidation();

if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
            const result = await signInWithGoogle();
            
            if (result.success && result.user) {
                try {
                    const userRef = doc(db, 'users', result.user.uid);
                    const userDoc = await getDoc(userRef);
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        localStorage.setItem('userData', JSON.stringify(userData));
                    } else {
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
                        
                        await setDoc(userRef, defaultUserData);
                        localStorage.setItem('userData', JSON.stringify(defaultUserData));
                    }
                    
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

    errorEmail.textContent = '';
    errorPassword.textContent = '';
    generalError.textContent = '';

    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
        if (!email || !password) {
            generalError.innerHTML = '<span data-translate="fill-fields">Please fill in all fields</span>';
             if (window.updateTranslations) {
                window.updateTranslations();
            }
        } else {
            generalError.innerHTML = '<span data-translate="incorrect">Email or password is invalid</span>';
             if (window.updateTranslations) {
                window.updateTranslations();
            }
        }
        return;
    }
    

    const result = await signIn(email, password);
    

    if (result.success) {
        try {
            const userRef = doc(db, 'users', result.user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
            } else {
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
            
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error fetching user data:', error);
            generalError.textContent = 'Error loading user data. Please try again.';
        }
    } else {
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
            generalError.innerHTML = '<span data-translate="incorrect">Email or password is invalid</span>';
        } else if (result.error.includes('too-many-requests')) {
            generalError.innerHTML = '<span data-translate="failed-attempts">Too many failed attempts. Please try again later.</span>';
            if (window.updateTranslations) {
                window.updateTranslations();
             }
        } else if (result.error.includes('invalid-email')) {
            generalError.innerHTML = '<span data-translate="enter-valid-email">Please enter a valid email address</span>';
        } else {
            generalError.innerHTML = '<span data-translate="incorrect-email-psw">Incorrect email or password</span>';
             if (window.updateTranslations) {
                window.updateTranslations();
             }
        }
    }
});