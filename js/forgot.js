import { auth } from './firebase-config.js';
import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form');
    const emailInput = document.getElementById('email');
    const errorEmail = document.getElementById('error-email');
    const successModal = document.getElementById('successModal');
    const closeModal = document.getElementById('closeModal');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        errorEmail.textContent = '';
        
        if (!email) {
            errorEmail.textContent = 'Please enter your email address';
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
