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
    if (userData.profileImage) {
        profileImage.src = userData.profileImage;
        profileImage.onerror = function() {
            this.src = '../img/useri.png';
        };
    } else {
        profileImage.src = '../img/useri.png';
    }

    // Set default values for input fields from localStorage
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');

    if (userData.name) nameInput.value = userData.name;
    if (userData.email) emailInput.value = userData.email;

    // Tab switching functionality
    const menuItems = document.querySelectorAll('.settings-menu li');
    const sections = document.querySelectorAll('.settings-section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            item.classList.add('active');
            const tab = item.getAttribute('data-tab');
            document.getElementById(`${tab}-section`).classList.add('active');
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
                    nameInput.value = userData.name || nameInput.value || '';
                    emailInput.value = userData.email || emailInput.value || '';

                    // Update profile image if available in Firestore
                    if (userData.profileImage) {
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

                        emailToggle.checked = userData.notifications.email || false;
                        pushToggle.checked = userData.notifications.push || false;
                        jobAlertsToggle.checked = userData.notifications.jobAlerts || false;
                    }

                    // Load saved settings
                    loadSavedSettings(userData);
                } else {
                    // Create new user document if it doesn't exist
                    await setDoc(userDocRef, {
                        name: user.displayName || nameInput.value || '',
                        email: user.email || emailInput.value || '',
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
            console.log('Sending verification email to:', newEmail);

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

            // Update the userData object with new values
            userData.name = document.getElementById('name').value;
            const newEmail = document.getElementById('email').value;

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
                    document.getElementById('profile-form').appendChild(successMessage);

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
            document.getElementById('profile-form').appendChild(errorMessage);

            // Remove the error message after 5 seconds
            setTimeout(() => {
                errorMessage.remove();
            }, 5000);
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
            console.log('Updating name to:', newName);

            // Update Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                name: newName
            });

            // Update localStorage
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            userData.name = newName;
            localStorage.setItem('userData', JSON.stringify(userData));

            console.log('Name update successful');
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
    fileInput.style.display = 'none';

    changePicBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('No user logged in');
                }

                // Convert file to base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                    const base64Image = e.target.result;
                    
                    // Update profile image in UI
                    profileImage.src = base64Image;
                
                // Update userData in localStorage
                    userData.profileImage = base64Image;
                localStorage.setItem('userData', JSON.stringify(userData));
                
                    // Update Firestore
                        const userRef = doc(db, 'users', user.uid);
                        await updateDoc(userRef, {
                        profileImage: base64Image
                        });

                    alert('Profile picture updated successfully!');
                };
                reader.readAsDataURL(file);
                } catch (error) {
                    console.error('Error updating profile picture:', error);
                alert('Error updating profile picture. Please try again.');
                }
        }
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
            emailToggle.checked = userData.notifications.email || false;
            pushToggle.checked = userData.notifications.push || false;
            jobAlertsToggle.checked = userData.notifications.jobAlerts || false;
        }
    }

    // Save notification settings
    document.getElementById('save-notifications').addEventListener('click', async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No user logged in');
            }

            console.log('Current user:', user.uid);

            // Get current notification settings
            const notifications = {
                email: document.getElementById('email-notifications').checked,
                jobAlerts: document.getElementById('job-alerts').checked,
                push: document.getElementById('push-notifications').checked
            };

            console.log('Saving notifications:', notifications);

            // Update Firestore
            const userDocRef = doc(db, 'users', user.uid);
            console.log('Document reference created:', userDocRef);

            await updateDoc(userDocRef, {
                notifications: notifications
            });

            console.log('Firestore update successful');

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

    // Track notification changes in real-time
    const notificationInputs = document.querySelectorAll('.notification-option input[type="checkbox"]');
    notificationInputs.forEach(input => {
        input.addEventListener('change', async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('No user logged in');
                }

                console.log('Current user:', user.uid);

                // Get current notification settings
                const notifications = {
                    email: document.getElementById('email-notifications').checked,
                    jobAlerts: document.getElementById('job-alerts').checked,
                    push: document.getElementById('push-notifications').checked
                };

                console.log('Saving notifications:', notifications);

                // Update Firestore
                const userDocRef = doc(db, 'users', user.uid);
                console.log('Document reference created:', userDocRef);

                await updateDoc(userDocRef, {
                    notifications: notifications
                });

                console.log('Firestore update successful');

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

    // Password reset form submission
    document.getElementById('security-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('reset-email').value;
        const errorEmail = document.getElementById('error-email');

        try {
            // Send password reset email
            await sendPasswordResetEmail(auth, email);
            console.log('Password reset email sent to:', email);
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.style.color = 'green';
            successMessage.style.marginTop = '10px';
            successMessage.textContent = `Password reset email sent to ${email}. Please check your inbox (and spam folder).`;
            document.getElementById('security-form').appendChild(successMessage);

            // Remove the message after 5 seconds
            setTimeout(() => {
                successMessage.remove();
            }, 5000);
            
            // Reset form
            document.getElementById('security-form').reset();
        } catch (error) {
            console.error('Error sending password reset email:', error);
            if (error.code === 'auth/user-not-found') {
                errorEmail.textContent = 'No account found with this email address';
            } else {
                errorEmail.textContent = 'Error sending password reset email. Please try again.';
            }
            errorEmail.classList.add('show');
        }
    });

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
                console.log('Firestore document deleted successfully');
            } catch (firestoreError) {
                console.error('Error deleting Firestore document:', firestoreError);
            }

            // Delete user's profile picture from Storage if it exists
            try {
                const storage = getStorage();
                const profilePicRef = ref(storage, `profile-pictures/${user.uid}`);
                await deleteObject(profilePicRef);
                console.log('Profile picture deleted successfully');
            } catch (storageError) {
                console.log('No profile picture to delete or error deleting:', storageError);
            }

            // Delete user's authentication
            try {
                await deleteUser(user);
                console.log('User authentication deleted successfully');
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
            console.log('LocalStorage cleared and isAuthenticated set to false');

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

