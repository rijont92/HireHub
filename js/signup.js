import { signUp } from '../js/auth.js';
import { setupSignupValidation, validateSignupForm } from '../js/validation.js';

document.addEventListener("DOMContentLoaded", function () {
    const signupForm = document.getElementById('signupForm');
    const errorEmail = document.getElementById('error-email');
    const errorPassword = document.getElementById('error-password');
    const errorPassword2 = document.getElementById('error-password2');
    const passwordInput = document.getElementById('password');
    const password2Input = document.getElementById('password2');
    const icon = document.getElementById('icon');
    const icon2 = document.getElementById('icon2');
    const useriImg = document.querySelector('.useri-img');
    const fileInput = document.getElementById('file-input');

    // Password visibility toggle for first password
    window.changeIcon = function () {
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

    // Password visibility toggle for second password
    window.changeIcon2 = function () {
        if (password2Input.type === 'password') {
            password2Input.type = 'text';
            icon2.classList.remove('fa-eye-slash');
            icon2.classList.add('fa-eye');
        } else {
            password2Input.type = 'password';
            icon2.classList.remove('fa-eye');
            icon2.classList.add('fa-eye-slash');
        }
    };

    // Setup real-time validation
    setupSignupValidation();

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const password2 = document.getElementById('password2').value;

        // Validate form before submission
        const validation = validateSignupForm(email, password, password2);
        if (!validation.isValid) {
            // Display validation errors
            errorEmail.textContent = validation.errors.email;
            errorEmail.style.color = 'red';
            errorPassword.textContent = validation.errors.password;
            errorPassword.style.color = 'red';
            errorPassword2.textContent = validation.errors.confirmPassword;
            errorPassword2.style.color = 'red';
            return;
        }

        // Clear previous errors
        errorEmail.textContent = '';
        errorPassword.textContent = '';
        errorPassword2.textContent = '';

        const result = await signUp(email, password);

        if (result.success) {
            // Signup successful
            window.location.href = '../index.html';
        } else {
            // Handle error
            if (result.error.includes('email-already-in-use')) {
                errorEmail.textContent = 'An account with this email already exists';
                errorEmail.style.color = 'red';
            } else if (result.error.includes('invalid-email')) {
                errorEmail.textContent = 'Please enter a valid email address';
                errorEmail.style.color = 'red';
            } else if (result.error.includes('weak-password')) {
                errorPassword.textContent = 'Password is too weak. Please follow the requirements.';
                errorPassword.style.color = 'red';
            } else if (result.error.includes('too-many-requests')) {
                errorEmail.textContent = 'Too many attempts. Please try again later.';
                errorEmail.style.color = 'red';
            } else {
                errorEmail.textContent = 'An error occurred. Please try again.';
                errorEmail.style.color = 'red';
            }
        }
    });

    // Attach the click event listener to trigger the file input
    useriImg.addEventListener('click', function () {
        fileInput.click();
    });

    // Attach the change event listener to handle image upload
    fileInput.addEventListener('change', handleImageUpload);
});

// Function to trigger file input click
function triggerFileInput() {
    document.getElementById('file-input').click();
}

// Function to handle image upload and preview
function handleImageUpload(event) {
    const file = event.target.files[0]; // Get the selected file
    if (file) {
        const reader = new FileReader();

        // Check if the selected file is an image
        if (file.type.startsWith('image/')) {
            reader.onload = function (e) {
                const base64Image = e.target.result; // Get base64 encoded image data
                // Set the preview image src to the base64 image data
                const previewImg = document.getElementById('preview-img');
                previewImg.src = base64Image;
                previewImg.alt = "Uploaded Image"; // Update alt text for accessibility
                // Optionally, save the image to localStorage (if needed for future use)
                localStorage.setItem('profileImage', base64Image);
            };
            reader.readAsDataURL(file); // Convert the image file to base64
        } else {
            alert('Please upload a valid image file (e.g., .jpg, .png).');
        }
    } else {
        alert('No file selected. Please choose an image to upload.');
    }
}







