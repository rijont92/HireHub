import { auth } from './firebase-config.js'; // Import the auth object from your config file
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("form");
    const Email = document.getElementById("email");
    const errorEmail = document.getElementById("error-email");

    form.addEventListener("submit", function(event) {
        event.preventDefault(); // Prevent form submission

        const isEmailValid = validateEmail(Email.value);

        if (isEmailValid) {
            // Send password reset email using Firebase
            sendPasswordResetEmail(auth, Email.value)
                .then(() => {
                    // Show the modal
                    const modal = document.getElementById("successModal");
                    modal.style.display = "flex";

                    // Redirect after a short delay
                    setTimeout(() => {
                        window.location.href = "login.html";  // Redirect to login page
                    }, 2000); // Redirect after 2 seconds
                })
                .catch((error) => {
                    // Handle Errors here.
                    errorEmail.innerHTML = error.message; // Display error message
                    Email.classList.add("error");
                });
        }
    });

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (email === "") {
            errorEmail.innerHTML = "Email cannot be blank";
            Email.classList.add("error");
            return false;
        }

        const isValid = re.test(String(email).toLowerCase());

        if (isValid) {
            errorEmail.innerHTML = "";
            Email.classList.remove("error");
        } else {
            errorEmail.innerHTML = "Invalid email address";
            Email.classList.add("error");
        }

        return isValid;
    }

    // Get the modal
    const modal = document.getElementById("successModal");

    // Get the <span> element that closes the modal
    const span = document.getElementById("closeModal");

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
});
