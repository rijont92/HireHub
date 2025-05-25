import { auth } from './firebase-config.js';
import { sendEmailVerification, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const resendEmailBtn = document.getElementById('resendEmail');
    const checkVerificationBtn = document.getElementById('checkVerification');
    const verificationMessage = document.getElementById('verification-message');

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        if (user.emailVerified) {
            window.location.href = '../index.html';
        }
    });

    resendEmailBtn.addEventListener('click', async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                await sendEmailVerification(user);
                verificationMessage.textContent = 'Verification email has been resent. Please check your inbox.';
                verificationMessage.style.color = 'green';
            }
        } catch (error) {
            verificationMessage.textContent = 'Error sending verification email. Please try again.';
            verificationMessage.style.color = 'red';
        }
    });

    checkVerificationBtn.addEventListener('click', async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                await user.reload();
                
                if (user.emailVerified) {
                    localStorage.setItem("isAuthenticated", "true");
                    window.location.href = '../index.html';
                } else {
                    verificationMessage.textContent = 'Email not verified yet. Please check your inbox and click the verification link.';
                    verificationMessage.style.color = 'red';
                }
            }
        } catch (error) {
            verificationMessage.textContent = 'Error checking verification status. Please try again.';
            verificationMessage.style.color = 'red';
        }
    });
}); 