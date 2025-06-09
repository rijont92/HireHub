import { auth } from './firebase-config.js';
import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { signInWithGoogle } from './auth.js';
import { db } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form');
    const emailInput = document.getElementById('email');
    const errorEmail = document.getElementById('error-email');
    const successModal = document.getElementById('successModal');
    const closeModal = document.getElementById('closeModal');
    const googleSignInBtn = document.querySelector('.google');

    const date = document.getElementById("date");

    const yearDate = new Date().getFullYear();
    date.innerHTML = yearDate;

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
                        errorEmail.textContent = 'Error signing in with Google. Please try again.';
                    }
                } else {
                    console.error('Google sign-in failed:', result.error);
                    errorEmail.textContent = result.error || 'Error signing in with Google. Please try again.';
                }
            } catch (error) {
                console.error('Google sign-in error:', error);
                errorEmail.textContent = 'Error signing in with Google. Please try again.';
            }
        });
    } else {
        console.error('Google sign-in button not found');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        errorEmail.textContent = '';
        
        if (!email) {
            errorEmail.innerHTML = '<span data-translate="error-email-required">Please enter your email address</span>';
            if (window.updateTranslations) {
                window.updateTranslations();
             }
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            
            successModal.style.display = 'block';
            
            form.reset();
            
        } catch (error) {
            console.error('Error sending password reset email:', error);
            
            if (error.code === 'auth/user-not-found') {
                errorEmail.textContent = 'No account found with this email address';
            } else if (error.code === 'auth/invalid-email') {
                errorEmail.textContent = 'Please enter a valid email address';
            } else {
                errorEmail.textContent = 'Error sending password reset email. Please try again.';
            }
        }
    });

    closeModal.addEventListener('click', () => {
        successModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === successModal) {
            successModal.style.display = 'none';
        }
    });
});
