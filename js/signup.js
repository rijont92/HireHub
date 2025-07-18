import { signUp,signIn, signInWithGoogle } from '../js/auth.js';
import { setupSignupValidation, validateSignupForm } from '../js/validation.js';
import { isAuthenticated } from '../js/auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { db } from './firebase-config.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { storage } from './firebase-config.js';


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
    let profileImageFile = null;
    let profileImageBase64 = '../img/useri.png';



    const yearDate = new Date().getFullYear();
    date.innerHTML = yearDate;

    if (isAuthenticated()) {
        window.location.replace("../index.html"); 
    }
    
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

    setupSignupValidation();

    if (fileInput) {
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                profileImageFile = file; // store the file
                const reader = new FileReader();
                reader.onload = (e) => {
                    profileImageBase64 = e.target.result;
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

    if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const password2 = document.getElementById('password2').value;


        errorEmail.textContent = '';
        errorPassword.textContent = '';
        errorPassword2.textContent = '';
        errorName.textContent = '';

        const validation = validateSignupForm(name, email, password, password2);

        if (!validation.isValid) {
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
                let profileImageURL = '../img/useri.png';
                if (profileImageFile) {
                    // Upload to Firebase Storage
                    const storageRef = ref(storage, `profile-images/${result.user.uid}/${Date.now()}-${profileImageFile.name}`);
                    await uploadBytes(storageRef, profileImageFile);
                    profileImageURL = await getDownloadURL(storageRef);
                }

                const userData = {
                    name: name,
                    displayName: name,
                    email: email,
                    profileImage: profileImageURL,
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
                
                await setDoc(doc(db, 'users', result.user.uid), userData);
                
                localStorage.setItem('userData', JSON.stringify(userData));
                
                window.location.href = 'verify-email.html';
            } else {
                if (result.error.includes('email-already-in-use')) {
                    errorEmail.innerHTML = '<span data-translate="alredy-exist">An account with this email already exists</span>';
                    errorEmail.style.color = 'red';
                    if (window.updateTranslations) {
                     window.updateTranslations();
                    }
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

    if (useriImg) {
    useriImg.addEventListener('click', () => {
        fileInput.click();
    });
    }
});

function triggerFileInput() {
    document.getElementById('file-input').click();
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();

        if (file.type.startsWith('image/')) {
            reader.onload = function (e) {
                const base64Image = e.target.result; 
                const previewImg = document.getElementById('preview-img');
                previewImg.src = base64Image;
                previewImg.alt = "Uploaded Image";
                localStorage.setItem('profileImage', base64Image);
            };
            reader.readAsDataURL(file); 
        } else {
            alert('Please upload a valid image file (e.g., .jpg, .png).');
        }
    } else {
        alert('No file selected. Please choose an image to upload.');
    }
}


const googleSignInBtn = document.querySelector('.google');
const generalError = document.getElementById('general-error');

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
                        window.location.href = '../index.html';
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
                        window.location.href = '../index.html';
                    }
                } catch (error) {
                    console.error('Error handling user data:', error);
                    if (generalError) {
                        generalError.textContent = 'Error loading user data. Please try again.';
                        generalError.style.color = 'red';
                    }
                }
            } else {
                console.error('Google sign-in failed:', result.error);
                if (generalError) {
                    generalError.textContent = result.error || 'Error signing in with Google. Please try again.';
                    generalError.style.color = 'red';
                }
            }
        } catch (error) {
            console.error('Google sign-in error:', error);
            if (generalError) {
                generalError.textContent = 'Error signing in with Google. Please try again.';
                generalError.style.color = 'red';
            }
        }
    });
} else {
    console.error('Google sign-in button not found');
}