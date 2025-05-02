import { signUp } from '../js/auth.js';
import { setupSignupValidation, validateSignupForm } from '../js/validation.js';
import { isAuthenticated } from '../js/auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { db } from './firebase-config.js';

document.addEventListener("DOMContentLoaded", function () {
    const signupForm = document.getElementById('signupForm');
    const errorEmail = document.getElementById('error-email');
    const errorPassword = document.getElementById('error-password');
    const errorPassword2 = document.getElementById('error-password2');
    const errorName = document.getElementById('error-name');
    const passwordInput = document.getElementById('password');
    const password2Input = document.getElementById('password2');
    const icon = document.getElementById('icon');
    const icon2 = document.getElementById('icon2');
    const useriImg = document.querySelector('.useri-img');
    const fileInput = document.getElementById('file-input');
    let profileImageBase64 = '../img/useri.png';

    if (isAuthenticated()) {
        window.location.replace("../index.html"); 
    }
    
    // Password visibility toggle for first password
    if (icon) {
        icon.addEventListener('click', function() {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
        });
    }

    // Password visibility toggle for second password
    if (icon2) {
        icon2.addEventListener('click', function() {
        if (password2Input.type === 'password') {
            password2Input.type = 'text';
            icon2.classList.remove('fa-eye-slash');
            icon2.classList.add('fa-eye');
        } else {
            password2Input.type = 'password';
            icon2.classList.remove('fa-eye');
            icon2.classList.add('fa-eye-slash');
        }
        });
    }

    // Setup real-time validation
    setupSignupValidation();

    // Handle file selection
    if (fileInput) {
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    // Store the base64 image data
                    profileImageBase64 = e.target.result;
                    
                    // Update the preview image
                    const previewImg = document.getElementById('preview-img');
                        if (previewImg) {
                    previewImg.src = profileImageBase64;
                    previewImg.alt = "Uploaded Image";
                        }
                };
                reader.readAsDataURL(file);
            } else {
                alert('Please upload a valid image file (e.g., .jpg, .png).');
                fileInput.value = '';
            }
        }
    });
    }

    // Handle form submission
    if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const password2 = document.getElementById('password2').value;

        // Clear previous errors
        errorEmail.textContent = '';
        errorPassword.textContent = '';
        errorPassword2.textContent = '';
        errorName.textContent = '';

        // Validate form before submission
        const validation = validateSignupForm(name, email, password, password2);
        if (!validation.isValid) {
            // Display validation errors
            errorName.textContent = validation.errors.name;
            errorName.style.color = 'red';
            errorEmail.textContent = validation.errors.email;
            errorEmail.style.color = 'red';
            errorPassword.textContent = validation.errors.password;
            errorPassword.style.color = 'red';
            errorPassword2.textContent = validation.errors.confirmPassword;
            errorPassword2.style.color = 'red';
            return;
        }

        try {
            const result = await signUp(email, password);

            if (result.success) {
                // Create user document in Firestore
                const userData = {
                    name: name,
                    email: email,
                    profileImage: profileImageBase64,
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
                
                // Save to Firestore
                await setDoc(doc(db, 'users', result.user.uid), userData);
                
                // Save to localStorage
                localStorage.setItem('userData', JSON.stringify(userData));
                localStorage.setItem('isAuthenticated', 'true');
                
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
        } catch (error) {
            console.error('Error during signup:', error);
            errorEmail.textContent = 'Error creating account. Please try again.';
            errorEmail.style.color = 'red';
        }
    });
    }

    // Handle profile image click
    if (useriImg) {
    useriImg.addEventListener('click', () => {
        fileInput.click();
    });
    }
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
                // Save the image to localStorage
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






