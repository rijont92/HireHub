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
        
        // Clear previous error
        errorEmail.textContent = '';
        
        if (!email) {
            errorEmail.textContent = 'Please enter your email address';
            return;
        }

        try {
            // Send password reset email
            await sendPasswordResetEmail(auth, email);
            
            // Show success modal
            successModal.style.display = 'block';
            
            // Reset form
            form.reset();
            
        } catch (error) {
            console.error('Error sending password reset email:', error);
            
            // Handle specific error cases
            if (error.code === 'auth/user-not-found') {
                errorEmail.textContent = 'No account found with this email address';
            } else if (error.code === 'auth/invalid-email') {
                errorEmail.textContent = 'Please enter a valid email address';
            } else {
                errorEmail.textContent = 'Error sending password reset email. Please try again.';
            }
        }
    });

    // Close modal when clicking the close button
    closeModal.addEventListener('click', () => {
        successModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === successModal) {
            successModal.style.display = 'none';
        }
    });
});
