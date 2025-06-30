import { auth, db, storage } from './firebase-config.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, updateDoc, deleteDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, sendPasswordResetEmail, deleteUser, updateEmail, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { updateHeaderName } from './header.js';

document.addEventListener('DOMContentLoaded', function() {
    let userData = JSON.parse(localStorage.getItem('userData') || '{}');

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

    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');

    if (nameInput && userData.name) nameInput.value = userData.name;
    if (emailInput && userData.email) emailInput.value = userData.email;

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

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    
                    if (nameInput) nameInput.value = userData.name || nameInput.value || '';
                    if (emailInput) emailInput.value = userData.email || emailInput.value || '';

                    if (profileImage && userData.profileImage) {
                        profileImage.src = userData.profileImage;
                        profileImage.onerror = function() {
                            this.src = '../img/useri.png';
                        };
                    }

                    if (userData.notifications) {
                        const emailToggle = document.getElementById('email-notifications');
                        const pushToggle = document.getElementById('push-notifications');
                        const jobAlertsToggle = document.getElementById('job-alerts');

                        if (emailToggle) emailToggle.checked = userData.notifications.email || false;
                        if (pushToggle) pushToggle.checked = userData.notifications.push || false;
                        if (jobAlertsToggle) jobAlertsToggle.checked = userData.notifications.jobAlerts || false;
                    }

                    loadSavedSettings(userData);
                } else {
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

    emailInput.addEventListener('change', async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No user logged in');
            }

            const newEmail = emailInput.value;

            const passwordModal = document.getElementById('passwordConfirmModal');
            const confirmPasswordInput = document.getElementById('confirm-password');
            const confirmPasswordBtn = document.getElementById('confirm-password-btn');
            const cancelPasswordBtn = document.getElementById('cancel-password-btn');
            const closePasswordModal = document.getElementById('closePasswordConfirmModal');
            const passwordError = document.getElementById('password-error');

            confirmPasswordInput.value = '';
            passwordError.textContent = '';

            passwordModal.style.display = 'block';

            const handlePasswordConfirm = async () => {
                try {
                    const password = confirmPasswordInput.value;
                    if (!password) {
                        passwordError.textContent = 'Please enter your password';
                        return;
                    }

                    const credential = EmailAuthProvider.credential(
                        user.email,
                        password
                    );

                    await reauthenticateWithCredential(user, credential);

                    await updateEmail(user, newEmail);

                    await sendEmailVerification(user);

                    passwordModal.style.display = 'none';

                    const successMessage = document.createElement('div');
                    successMessage.style.color = 'green';
                    successMessage.marginTop = '10px';
                    successMessage.textContent = `Please check ${newEmail} for a verification email. Click the link in the email to verify your new email address.`;
                    emailInput.parentNode.appendChild(successMessage);

                    setTimeout(() => {
                        successMessage.remove();
                    }, 5000);

                } catch (error) {
                    console.error('Error during password confirmation:', error);
                    passwordError.textContent = error.message;
                }
            };

            confirmPasswordBtn.onclick = handlePasswordConfirm;
            cancelPasswordBtn.onclick = () => {
                passwordModal.style.display = 'none';
                emailInput.value = user.email;
            };
            closePasswordModal.onclick = () => {
                passwordModal.style.display = 'none';
                emailInput.value = user.email;
            };

            window.onclick = (event) => {
                if (event.target == passwordModal) {
                    passwordModal.style.display = 'none';
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

            const errorMessage = document.createElement('div');
            errorMessage.style.color = 'red';
            errorMessage.style.marginTop = '10px';
            errorMessage.textContent = `Error: ${error.message}. Please try again.`;
            emailInput.parentNode.appendChild(errorMessage);

            setTimeout(() => {
                errorMessage.remove();
            }, 5000);
        }
    });

    const profileForm = document.getElementById('profile-form');
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No user logged in');
            }

            let userData = JSON.parse(localStorage.getItem('userData') || '{}');

            const newName = document.getElementById('name').value;
            const newEmail = document.getElementById('email').value;

            const emailChanged = newEmail !== user.email;

            userData.name = newName;

            if (!emailChanged) {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    name: newName
                });

                localStorage.setItem('userData', JSON.stringify(userData));

                showNotification('Profile updated successfully!', 'success');
                return;
            }

            const passwordModal = document.getElementById('passwordConfirmModal');
            const confirmPasswordInput = document.getElementById('confirm-password');
            const confirmPasswordBtn = document.getElementById('confirm-password-btn');
            const cancelPasswordBtn = document.getElementById('cancel-password-btn');
            const closePasswordModal = document.getElementById('closePasswordConfirmModal');
            const passwordError = document.getElementById('password-error');

            confirmPasswordInput.value = '';
            passwordError.textContent = '';

            passwordModal.style.display = 'block';

            const handlePasswordConfirm = async () => {
                try {
                    const password = confirmPasswordInput.value;
                    if (!password) {
                        passwordError.textContent = 'Please enter your password';
                        return;
                    }

                    const credential = EmailAuthProvider.credential(
                        user.email,
                        password
                    );

                    await reauthenticateWithCredential(user, credential);

                    await updateEmail(user, newEmail);

                    await sendEmailVerification(user);

                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                        name: newName,
                        email: newEmail
                    });

                    userData.email = newEmail;
                    localStorage.setItem('userData', JSON.stringify(userData));

                    passwordModal.style.display = 'none';

                    showNotification(`Please check ${newEmail} for a verification email.`, 'success');

                } catch (error) {
                    console.error('Error during password confirmation:', error);
                    passwordError.textContent = error.message;
                }
            };

            confirmPasswordBtn.onclick = handlePasswordConfirm;
            cancelPasswordBtn.onclick = () => {
                passwordModal.style.display = 'none';
                document.getElementById('email').value = user.email;
            };
            closePasswordModal.onclick = () => {
                passwordModal.style.display = 'none';
                document.getElementById('email').value = user.email;
            };

            window.onclick = (event) => {
                if (event.target == passwordModal) {
                    passwordModal.style.display = 'none';
                    document.getElementById('email').value = user.email;
                }
            };

        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification(error.message, 'error');
        }
    });

    nameInput.addEventListener('change', async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No user logged in');
            }

            const newName = nameInput.value;

            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                name: newName
            });

            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            userData.name = newName;
            localStorage.setItem('userData', JSON.stringify(userData));
            
            updateHeaderName(newName);

        } catch (error) {
            console.error('Error updating name:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
        }
    });

    const changePicBtn = document.querySelector('.change-picture-btn');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        fileInput.capture = 'environment'; 
    }

    fileInput.style.display = 'none';
    fileInput.style.position = 'absolute';
    fileInput.style.opacity = '0';
    fileInput.style.width = '100%';
    fileInput.style.height = '100%';
    fileInput.style.top = '0';
    fileInput.style.left = '0';
    fileInput.style.cursor = 'pointer';

    changePicBtn.addEventListener('click', () => {
        document.body.appendChild(fileInput);
        
        setTimeout(() => {
            fileInput.click();
        }, 100);
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('No user logged in');

                const loadingIndicator = document.createElement('div');
                loadingIndicator.className = 'loading-indicator';
                loadingIndicator.innerHTML = 'Uploading image...';
                document.body.appendChild(loadingIndicator);

                if (file.size > 10 * 1024 * 1024) throw new Error('File size too large. Please select an image under 10MB.');
                if (!file.type.match('image.*')) throw new Error('Please select an image file.');

                // 1. Delete old image if it exists and is not the default
                if (userData.profileImage && userData.profileImage.startsWith('https://firebasestorage.googleapis.com')) {
                    try {
                        // Extract the storage path from the download URL
                        const url = new URL(userData.profileImage);
                        const path = decodeURIComponent(url.pathname.split('/o/')[1]);
                        const oldImageRef = ref(storage, path);
                        await deleteObject(oldImageRef);
                    } catch (err) {
                        // If the file doesn't exist or can't be deleted, ignore
                        console.warn('Could not delete old profile image:', err.message);
                    }
                }

                // Compress and upload new image
                const img = new Image();
                img.src = URL.createObjectURL(file);
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    let width = img.width;
                    let height = img.height;
                    const maxDimension = 800;
                    if (width > height && width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(async (blob) => {
                        try {
                            const timestamp = Date.now();
                            const storageRef = ref(storage, `profile-images/${user.uid}/${timestamp}-${file.name}`);
                            await uploadBytes(storageRef, blob);
                            const downloadURL = await getDownloadURL(storageRef);

                            profileImage.src = downloadURL;
                            userData.profileImage = downloadURL;
                            localStorage.setItem('userData', JSON.stringify(userData));
                            const userRef = doc(db, 'users', user.uid);
                            await updateDoc(userRef, { profileImage: downloadURL });

                            loadingIndicator.remove();
                            alert('Profile picture updated successfully!');
                        } catch (error) {
                            console.error('Error uploading to storage:', error);
                            loadingIndicator.remove();
                            alert('Error uploading image: ' + error.message);
                        }
                    }, 'image/jpeg', 0.7);
                };
                img.onerror = () => {
                    loadingIndicator.remove();
                    alert('Error loading image for compression.');
                };
            } catch (error) {
                console.error('Error handling file selection:', error);
                alert(error.message || 'Error handling file selection. Please try again.');
            }
        }
        setTimeout(() => {
            if (document.body.contains(fileInput)) {
                document.body.removeChild(fileInput);
            }
        }, 1000);
    });

    const colorInputs = document.querySelectorAll('.color-option input[type="color"]');
    colorInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const color = e.target.value;
            const property = e.target.id.replace('-color', '');
            document.documentElement.style.setProperty(`--${property}-color`, color);
        });
    });

    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(button => {
        button.addEventListener('click', async () => {
            themeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const theme = button.getAttribute('data-theme');
            document.documentElement.setAttribute('data-theme', theme);
            
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

    async function loadSavedSettings(userData) {
        if (userData.notifications) {
            const emailToggle = document.getElementById('email-notifications');
            const pushToggle = document.getElementById('push-notifications');
            const jobAlertsToggle = document.getElementById('job-alerts');

            if (emailToggle) emailToggle.checked = userData.notifications.email || false;
            if (pushToggle) pushToggle.checked = userData.notifications.push || false;
            if (jobAlertsToggle) jobAlertsToggle.checked = userData.notifications.jobAlerts || false;
        }
    }

    const saveNotificationsBtn = document.getElementById('save-notifications');
    if (saveNotificationsBtn) {
        saveNotificationsBtn.addEventListener('click', async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('No user logged in');
                }


                const notifications = {
                    email: document.getElementById('email-notifications')?.checked || false,
                    jobAlerts: document.getElementById('job-alerts')?.checked || false,
                    push: document.getElementById('push-notifications')?.checked || false
                };


                const userDocRef = doc(db, 'users', user.uid);

                await updateDoc(userDocRef, {
                    notifications: notifications
                });


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

    const notificationInputs = document.querySelectorAll('.notification-option input[type="checkbox"]');
    notificationInputs.forEach(input => {
        input.addEventListener('change', async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('No user logged in');
                }


                const notifications = {
                    email: document.getElementById('email-notifications').checked,
                    jobAlerts: document.getElementById('job-alerts').checked,
                    push: document.getElementById('push-notifications').checked
                };


                const userDocRef = doc(db, 'users', user.uid);

                await updateDoc(userDocRef, {
                    notifications: notifications
                });


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

    function updateUserData(newData) {
        const currentData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        const updatedData = { ...currentData, ...newData };
        
        localStorage.setItem('userData', JSON.stringify(updatedData));
        
        userData = updatedData;
    }

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
                await sendPasswordResetEmail(auth, email);
                
                const successMessage = document.createElement('div');
                successMessage.style.color = 'green';
                successMessage.style.marginTop = '10px';
                successMessage.innerHTML = `<span data-translate="reset-sent">Password reset email sent to</span> ${email}. <span data-translate="please-check">Please check your inbox (and spam folder).</span>`;
                securityForm.appendChild(successMessage);

                setTimeout(() => {
                    successMessage.remove();
                }, 5000);
                
                securityForm.reset();

                if (window.updateTranslations) {
                            window.updateTranslations();
                        }
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
            try {
                const userDocRef = doc(db, 'users', user.uid);
                await deleteDoc(userDocRef);
            } catch (firestoreError) {
                console.error('Error deleting Firestore document:', firestoreError);
            }

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

            localStorage.removeItem('userData');
            localStorage.setItem('isAuthenticated', 'false');

            document.getElementById('deleteAccountModal').style.display = 'none';

            const accountDeletedModal = document.getElementById('accountDeletedModal');
            accountDeletedModal.style.display = 'block';

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

