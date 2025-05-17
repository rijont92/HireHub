import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, updateDoc, deleteDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, sendPasswordResetEmail, deleteUser, updateEmail, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

document.addEventListener('DOMContentLoaded', function() {
    // Get user data from localStorage
    let userData = JSON.parse(localStorage.getItem('userData') || '{}');

    // Set profile picture immediately on page load
    const profileImage = document.getElementById('profile-pic');
    if (profileImage) {
        if (userData.profileImage) {
            profileImage.src = userData.profileImage;
            profileImage.onerror = function() {
                this.src = '../img/useri.png';
            };
        } else {
            profileImage.src = '../img/useri.png';
        }
    }

    // Set default values for input fields from localStorage
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');

    if (nameInput && userData.name) nameInput.value = userData.name;
    if (emailInput && userData.email) emailInput.value = userData.email;

    // Tab switching functionality
    const menuItems = document.querySelectorAll('.settings-menu li');
    const sections = document.querySelectorAll('.settings-section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            item.classList.add('active');
            const tab = item.getAttribute('data-tab');
            const targetSection = document.getElementById(`${tab}-section`);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    // Check authentication state and load user data
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                // Get reference to the user's document
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    
                    // Update input values with Firestore data if available
                    if (nameInput) nameInput.value = userData.name || nameInput.value || '';
                    if (emailInput) emailInput.value = userData.email || emailInput.value || '';

                    // Update profile image if available in Firestore
                    if (profileImage && userData.profileImage) {
                        profileImage.src = userData.profileImage;
                        profileImage.onerror = function() {
                            this.src = '../img/useri.png';
                        };
                    }

                    // Load notification settings from userData
                    if (userData.notifications) {
                        const emailToggle = document.getElementById('email-notifications');
                        const pushToggle = document.getElementById('push-notifications');
                        const jobAlertsToggle = document.getElementById('job-alerts');

                        if (emailToggle) emailToggle.checked = userData.notifications.email || false;
                        if (pushToggle) pushToggle.checked = userData.notifications.push || false;
                        if (jobAlertsToggle) jobAlertsToggle.checked = userData.notifications.jobAlerts || false;
                    }

                    // Load saved settings
                    loadSavedSettings(userData);
                } else {
                    // Create new user document if it doesn't exist
                    await setDoc(userDocRef, {
                        name: user.displayName || (nameInput ? nameInput.value : '') || '',
                        email: user.email || (emailInput ? emailInput.value : '') || '',
                        profileImage: '../img/useri.png',
                        bio: '',
                        education: [],
                        experience: [],
                        skills: [],
                        notifications: {
                            email: true,
                            push: true,
                            jobAlerts: true
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        } else {
            window.location.href = '/html/login.html';
        }
    });

    // Add real-time email update
    emailInput.addEventListener('change', async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No user logged in');
            }

            const newEmail = emailInput.value;

            // Show password confirmation modal
            const passwordModal = document.getElementById('passwordConfirmModal');
            const confirmPasswordInput = document.getElementById('confirm-password');
            const confirmPasswordBtn = document.getElementById('confirm-password-btn');
            const cancelPasswordBtn = document.getElementById('cancel-password-btn');
            const closePasswordModal = document.getElementById('closePasswordConfirmModal');
            const passwordError = document.getElementById('password-error');

            // Clear any previous password and error
            confirmPasswordInput.value = '';
            passwordError.textContent = '';

            // Show the modal
            passwordModal.style.display = 'block';

            // Handle password confirmation
            const handlePasswordConfirm = async () => {
                try {
                    const password = confirmPasswordInput.value;
                    if (!password) {
                        passwordError.textContent = 'Please enter your password';
                        return;
                    }

                    // Create credential with current email and password
                    const credential = EmailAuthProvider.credential(
                        user.email,
                        password
                    );

                    // Reauthenticate user
                    await reauthenticateWithCredential(user, credential);

                    // Update email in Firebase Auth
                    await updateEmail(user, newEmail);

                    // Send verification email
                    await sendEmailVerification(user);

                    // Close the modal
                    passwordModal.style.display = 'none';

                    // Show success message
                    const successMessage = document.createElement('div');
                    successMessage.style.color = 'green';
                    successMessage.style.marginTop = '10px';
                    successMessage.textContent = `Please check ${newEmail} for a verification email. Click the link in the email to verify your new email address.`;
                    emailInput.parentNode.appendChild(successMessage);

                    // Remove the message after 5 seconds
                    setTimeout(() => {
                        successMessage.remove();
                    }, 5000);

                } catch (error) {
                    console.error('Error during password confirmation:', error);
                    passwordError.textContent = error.message;
                }
            };

            // Add event listeners
            confirmPasswordBtn.onclick = handlePasswordConfirm;
            cancelPasswordBtn.onclick = () => {
                passwordModal.style.display = 'none';
                // Reset the email input to the previous value
                emailInput.value = user.email;
            };
            closePasswordModal.onclick = () => {
                passwordModal.style.display = 'none';
                // Reset the email input to the previous value
                emailInput.value = user.email;
            };

            // Close modal when clicking outside
            window.onclick = (event) => {
                if (event.target == passwordModal) {
                    passwordModal.style.display = 'none';
                    // Reset the email input to the previous value
                    emailInput.value = user.email;
                }
            };

        } catch (error) {
            console.error('Error sending verification email:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });

            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.style.color = 'red';
            errorMessage.style.marginTop = '10px';
            errorMessage.textContent = `Error: ${error.message}. Please try again.`;
            emailInput.parentNode.appendChild(errorMessage);

            // Remove the error message after 5 seconds
            setTimeout(() => {
                errorMessage.remove();
            }, 5000);
        }
    });

    // Profile form submission
    const profileForm = document.getElementById('profile-form');
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No user logged in');
            }

            // Get the current user data from localStorage
            let userData = JSON.parse(localStorage.getItem('userData') || '{}');

            // Get the new values
            const newName = document.getElementById('name').value;
            const newEmail = document.getElementById('email').value;

            // Check if email has changed
            const emailChanged = newEmail !== user.email;

            // Update the userData object with new values
            userData.name = newName;

            // If email hasn't changed, just update the name
            if (!emailChanged) {
                // Update Firestore
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    name: newName
                });

                // Update localStorage
                localStorage.setItem('userData', JSON.stringify(userData));

                // Show success notification
                showNotification('Profile updated successfully!', 'success');
                return;
            }

            // If email has changed, show password confirmation modal
            const passwordModal = document.getElementById('passwordConfirmModal');
            const confirmPasswordInput = document.getElementById('confirm-password');
            const confirmPasswordBtn = document.getElementById('confirm-password-btn');
            const cancelPasswordBtn = document.getElementById('cancel-password-btn');
            const closePasswordModal = document.getElementById('closePasswordConfirmModal');
            const passwordError = document.getElementById('password-error');

            // Clear any previous password and error
            confirmPasswordInput.value = '';
            passwordError.textContent = '';

            // Show the modal
            passwordModal.style.display = 'block';

            // Handle password confirmation
            const handlePasswordConfirm = async () => {
                try {
                    const password = confirmPasswordInput.value;
                    if (!password) {
                        passwordError.textContent = 'Please enter your password';
                        return;
                    }

                    // Create credential with current email and password
                    const credential = EmailAuthProvider.credential(
                        user.email,
                        password
                    );

                    // Reauthenticate user
                    await reauthenticateWithCredential(user, credential);

                    // Update email in Firebase Auth
                    await updateEmail(user, newEmail);

                    // Send verification email
                    await sendEmailVerification(user);

                    // Update Firestore
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                        name: newName,
                        email: newEmail
                    });

                    // Update localStorage
                    userData.email = newEmail;
                    localStorage.setItem('userData', JSON.stringify(userData));

                    // Close the modal
                    passwordModal.style.display = 'none';

                    // Show success notification
                    showNotification(`Please check ${newEmail} for a verification email.`, 'success');

                } catch (error) {
                    console.error('Error during password confirmation:', error);
                    passwordError.textContent = error.message;
                }
            };

            // Add event listeners
            confirmPasswordBtn.onclick = handlePasswordConfirm;
            cancelPasswordBtn.onclick = () => {
                passwordModal.style.display = 'none';
                // Reset the email input to the previous value
                document.getElementById('email').value = user.email;
            };
            closePasswordModal.onclick = () => {
                passwordModal.style.display = 'none';
                // Reset the email input to the previous value
                document.getElementById('email').value = user.email;
            };

            // Close modal when clicking outside
            window.onclick = (event) => {
                if (event.target == passwordModal) {
                    passwordModal.style.display = 'none';
                    // Reset the email input to the previous value
                    document.getElementById('email').value = user.email;
                }
            };

        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification(error.message, 'error');
        }
    });

    // Add real-time name update
    nameInput.addEventListener('change', async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No user logged in');
            }

            const newName = nameInput.value;

            // Update Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                name: newName
            });

            // Update localStorage
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            userData.name = newName;
            localStorage.setItem('userData', JSON.stringify(userData));

        } catch (error) {
            console.error('Error updating name:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
        }
    });

    // Profile picture upload
    const changePicBtn = document.querySelector('.change-picture-btn');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    // For mobile devices, use the camera
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        fileInput.capture = 'environment'; // Use back camera by default
    }

    // Hide the input but keep it in the DOM
    fileInput.style.display = 'none';
    fileInput.style.position = 'absolute';
    fileInput.style.opacity = '0';
    fileInput.style.width = '100%';
    fileInput.style.height = '100%';
    fileInput.style.top = '0';
    fileInput.style.left = '0';
    fileInput.style.cursor = 'pointer';

    changePicBtn.addEventListener('click', () => {
        // Add the input to the document
        document.body.appendChild(fileInput);
        
        // Trigger the file input click
        setTimeout(() => {
            fileInput.click();
        }, 100);
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('No user logged in');
                }

                // Show loading indicator
                const loadingIndicator = document.createElement('div');
                loadingIndicator.className = 'loading-indicator';
                loadingIndicator.innerHTML = 'Uploading image...';
                document.body.appendChild(loadingIndicator);
                
                // Check file size and type
                if (file.size > 10 * 1024 * 1024) { // 10MB limit for original file
                    throw new Error('File size too large. Please select an image under 10MB.');
                }
                
                if (!file.type.match('image.*')) {
                    throw new Error('Please select an image file.');
                }
                
                // Convert file to base64 with compression
                const reader = new FileReader();
                
                reader.onload = async (e) => {
                    try {
                        // Create an image element to get dimensions
                        const img = new Image();
                        img.src = e.target.result;
                        
                        img.onload = async () => {
                            // Create a canvas to compress the image
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            // Calculate new dimensions while maintaining aspect ratio
                            let width = img.width;
                            let height = img.height;
                            
                            // Max dimensions for profile image
                            const maxDimension = 800;
                            
                            if (width > height && width > maxDimension) {
                                height = Math.round((height * maxDimension) / width);
                                width = maxDimension;
                            } else if (height > maxDimension) {
                                width = Math.round((width * maxDimension) / height);
                                height = maxDimension;
                            }
                            
                            // Set canvas dimensions
                            canvas.width = width;
                            canvas.height = height;
                            
                            // Draw the image on the canvas
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            // Get the compressed image as base64
                            // Use lower quality (0.7) to reduce file size
                            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                            
                            // Check if the compressed image is still too large
                            // Base64 string length is approximately 4/3 of the binary size
                            const estimatedSize = Math.ceil(compressedBase64.length * 0.75);
                            
                            if (estimatedSize > 900000) { // Leave some buffer below the 1MB limit
                                throw new Error('Image is still too large after compression. Please try a smaller image.');
                            }
                            
                            // Update profile image in UI
                            profileImage.src = compressedBase64;
                            
                            // Update userData in localStorage
                            userData.profileImage = compressedBase64;
                            localStorage.setItem('userData', JSON.stringify(userData));
                            
                            // Update Firestore
                            const userRef = doc(db, 'users', user.uid);
                            await updateDoc(userRef, {
                                profileImage: compressedBase64
                            });
                            
                            // Remove loading indicator
                            loadingIndicator.remove();
                            
                            // Show success message
                            alert('Profile picture updated successfully!');
                        };
                        
                        img.onerror = () => {
                            throw new Error('Error loading image for compression.');
                        };
                    } catch (error) {
                        console.error('Error processing image:', error);
                        loadingIndicator.remove();
                        alert('Error processing image: ' + error.message);
                    }
                };
                
                reader.onerror = () => {
                    console.error('Error reading file');
                    loadingIndicator.remove();
                    alert('Error reading file. Please try again.');
                };
                
                // Read the file as data URL
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('Error handling file selection:', error);
                alert(error.message || 'Error handling file selection. Please try again.');
            }
        }
        
        // Clean up the input element
        setTimeout(() => {
            if (document.body.contains(fileInput)) {
                document.body.removeChild(fileInput);
            }
        }, 1000);
    });

    // Color scheme customization
    const colorInputs = document.querySelectorAll('.color-option input[type="color"]');
    colorInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const color = e.target.value;
            const property = e.target.id.replace('-color', '');
            document.documentElement.style.setProperty(`--${property}-color`, color);
        });
    });

    // Theme switching
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(button => {
        button.addEventListener('click', async () => {
            themeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const theme = button.getAttribute('data-theme');
            document.documentElement.setAttribute('data-theme', theme);
            
            // Save theme preference to Firestore
            try {
                const user = auth.currentUser;
                if (user) {
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                        theme: theme
                    });
                }
            } catch (error) {
                console.error('Error saving theme preference:', error);
            }
        });
    });

    // Load saved settings
    async function loadSavedSettings(userData) {
        // Load notification settings
        if (userData.notifications) {
            const emailToggle = document.getElementById('email-notifications');
            const pushToggle = document.getElementById('push-notifications');
            const jobAlertsToggle = document.getElementById('job-alerts');

            // Set the initial state of toggles based on Firestore data
            if (emailToggle) emailToggle.checked = userData.notifications.email || false;
            if (pushToggle) pushToggle.checked = userData.notifications.push || false;
            if (jobAlertsToggle) jobAlertsToggle.checked = userData.notifications.jobAlerts || false;
        }
    }

    // Save notification settings
    const saveNotificationsBtn = document.getElementById('save-notifications');
    if (saveNotificationsBtn) {
        saveNotificationsBtn.addEventListener('click', async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('No user logged in');
                }


                // Get current notification settings
                const notifications = {
                    email: document.getElementById('email-notifications')?.checked || false,
                    jobAlerts: document.getElementById('job-alerts')?.checked || false,
                    push: document.getElementById('push-notifications')?.checked || false
                };


                // Update Firestore
                const userDocRef = doc(db, 'users', user.uid);

                await updateDoc(userDocRef, {
                    notifications: notifications
                });


                // Update localStorage
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                userData.notifications = notifications;
                localStorage.setItem('userData', JSON.stringify(userData));
            } catch (error) {
                console.error('Error saving notification settings:', error);
                console.error('Error details:', {
                    code: error.code,
                    message: error.message,
                    stack: error.stack
                });
            }
        });
    }

    // Track notification changes in real-time
    const notificationInputs = document.querySelectorAll('.notification-option input[type="checkbox"]');
    notificationInputs.forEach(input => {
        input.addEventListener('change', async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('No user logged in');
                }


                // Get current notification settings
                const notifications = {
                    email: document.getElementById('email-notifications').checked,
                    jobAlerts: document.getElementById('job-alerts').checked,
                    push: document.getElementById('push-notifications').checked
                };


                // Update Firestore
                const userDocRef = doc(db, 'users', user.uid);

                await updateDoc(userDocRef, {
                    notifications: notifications
                });


                // Update localStorage
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                userData.notifications = notifications;
                localStorage.setItem('userData', JSON.stringify(userData));
            } catch (error) {
                console.error('Error updating notification settings:', error);
                console.error('Error details:', {
                    code: error.code,
                    message: error.message,
                    stack: error.stack
                });
            }
        });
    });

    // Function to update user data (same as in profile.js)
    function updateUserData(newData) {
        // Get current user data from localStorage
        const currentData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        // Merge new data with current data
        const updatedData = { ...currentData, ...newData };
        
        // Save to localStorage
        localStorage.setItem('userData', JSON.stringify(updatedData));
        
        // Update the global userData variable
        userData = updatedData;
    }

    // Add security form event listener if the form exists
    const securityForm = document.getElementById('security-form');
    if (securityForm) {
        securityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reset-email')?.value;
            const errorEmail = document.getElementById('error-email');

            if (!email) {
                if (errorEmail) {
                    errorEmail.textContent = 'Please enter your email address';
                    errorEmail.classList.add('show');
                }
                return;
            }

            try {
                // Send password reset email to the entered email
                await sendPasswordResetEmail(auth, email);
                
                // Show success message
                const successMessage = document.createElement('div');
                successMessage.style.color = 'green';
                successMessage.style.marginTop = '10px';
                successMessage.textContent = `Password reset email sent to ${email}. Please check your inbox (and spam folder).`;
                securityForm.appendChild(successMessage);

                // Remove the message after 5 seconds
                setTimeout(() => {
                    successMessage.remove();
                }, 5000);
                
                // Reset form
                securityForm.reset();
            } catch (error) {
                console.error('Error sending password reset email:', error);
                if (errorEmail) {
                    if (error.code === 'auth/user-not-found') {
                        errorEmail.textContent = 'No account found with this email address';
                    } else {
                        errorEmail.textContent = 'Error sending password reset email. Please try again.';
                    }
                    errorEmail.classList.add('show');
                }
            }
        });
    }

    // Delete Account Functionality
    document.getElementById('delete-account-btn').addEventListener('click', () => {
        const modal = document.getElementById('deleteAccountModal');
        modal.style.display = 'block';
    });

    document.getElementById('closeDeleteModal').onclick = function() {
        document.getElementById('deleteAccountModal').style.display = 'none';
    };

    document.getElementById('cancel-delete').onclick = function() {
        document.getElementById('deleteAccountModal').style.display = 'none';
    };

    document.getElementById('confirm-delete').addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) {
            alert('No user logged in');
            return;
        }

        try {
            // First, delete user data from Firestore
            try {
                const userDocRef = doc(db, 'users', user.uid);
                await deleteDoc(userDocRef);
            } catch (firestoreError) {
                console.error('Error deleting Firestore document:', firestoreError);
            }

            // Delete user's profile picture from Storage if it exists
            try {
                const storage = getStorage();
                const profilePicRef = ref(storage, `profile-pictures/${user.uid}`);
                await deleteObject(profilePicRef);
            } catch (storageError) {
                console.log('No profile picture to delete or error deleting:', storageError);
            }

            // Delete user's authentication
            try {
                await deleteUser(user);
            } catch (authError) {
                console.error('Error deleting user authentication:', authError);
                if (authError.code === 'auth/requires-recent-login') {
                    alert('Please sign in again before deleting your account.');
                    window.location.href = '/html/login.html';
                    return;
                }
                throw authError;
            }

            // Clear localStorage
            localStorage.removeItem('userData');
            localStorage.setItem('isAuthenticated', 'false');

            // Close delete confirmation modal
            document.getElementById('deleteAccountModal').style.display = 'none';

            // Show account deleted success modal
            const accountDeletedModal = document.getElementById('accountDeletedModal');
            accountDeletedModal.style.display = 'block';

            // Close success modal and redirect after 2 seconds
            setTimeout(() => {
                accountDeletedModal.style.display = 'none';
                window.location.href = '/html/signup.html';
            }, 2000);
        } catch (error) {
            console.error('Detailed error deleting account:', error);
            if (error.code === 'auth/network-request-failed') {
                alert('Network error. Please check your internet connection and try again.');
            } else if (error.code === 'auth/requires-recent-login') {
                alert('Please sign in again before deleting your account.');
                window.location.href = '/html/login.html';
            } else {
                alert('Error deleting account: ' + error.message);
            }
        }
    });

    // Close modals when clicking outside
    window.onclick = function(event) {
        const deleteModal = document.getElementById('deleteAccountModal');
        const passwordResetModal = document.getElementById('passwordResetModal');
        const accountDeletedModal = document.getElementById('accountDeletedModal');
        
        if (event.target == deleteModal) {
            deleteModal.style.display = 'none';
        }
        if (event.target == passwordResetModal) {
            passwordResetModal.style.display = 'none';
        }
        if (event.target == accountDeletedModal) {
            accountDeletedModal.style.display = 'none';
        }
    };
});

