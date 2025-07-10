import { auth, db, storage } from './firebase-config.js';
import { collection, addDoc, doc, updateDoc, arrayUnion, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { translations, currentLanguage } from './translations.js';

const paypalScript = document.createElement('script');
paypalScript.src = 'https://www.paypal.com/sdk/js?client-id=ATvGyJEjEo_vMlTxeh53DRbuP7Arcz6pomm3ZsrduW-BAy8oCo_w-djwWjEx4DGI44UFSy95ZG3tsgym&currency=EUR';
document.head.appendChild(paypalScript);

document.addEventListener('DOMContentLoaded', function() {
    const postJobForm = document.getElementById('postJobForm');
    const logoInput = document.getElementById('companyLogo');
    const logoPreview = document.getElementById('logoPreview');
    const previewPlaceholder = document.querySelector('.preview-placeholder');
    const applicationDeadline = document.getElementById('applicationDeadline');
    const btn = document.getElementById("btn");
    const postJobContainer = document.querySelector('.blured');
    const hotJobCheckbox = document.getElementById('hotJobCheckbox');
    const paypalButtonContainer = document.getElementById('paypal-button-container');

    let paypalButtonInitialized = false;
    let storageFailed = false; // Reset to false to allow storage attempts
    
    // Temporary flag to disable storage until rules are configured
    const STORAGE_DISABLED = false; // Set to false once Firebase Storage rules are fixed
    
    // Clear any previous storage failure state
    localStorage.removeItem('storageFailed');

    // Log storage state

    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user && user.emailVerified) {
            btn.innerHTML = `<span data-translate="post-job">Post Job</span>`;
            postJobContainer.classList.remove('blurred');
            if (window.updateTranslations) {
                window.updateTranslations();
            }
        } else {
            btn.innerHTML = `<span data-translate="sign-up-post">Sign Up to post</span>`;
            showLoginPopup();
            postJobContainer.classList.add('blurred');
            if (window.updateTranslations) {
                window.updateTranslations();
            }
        }
    });

    function initializePayPalButton() {
        if (paypalButtonInitialized) return;
        
        paypal.Buttons({
            style: {
                color: 'silver',
                shape: 'rect',
                label: 'paypal',
                height: 45
            },
            createOrder: function(data, actions) {
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            value: '5.00'
                        }
                    }]
                });
            },
            onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                    hotJobCheckbox.checked = true;
                    hotJobCheckbox.disabled = true;
                    paypalButtonContainer.style.display = 'none';
                    showNotification('Payment successful! Your job will be featured as a hot job.', 'success');
                });
            },
            onError: function(err) {
                console.error('PayPal Error:', err);
                showNotification('Payment failed. Please try again.', 'error');
            }
        }).render('#paypal-button-container')
        .then(() => {
            paypalButtonInitialized = true;
        })
        .catch(err => {
            console.error('PayPal button render error:', err);
            showNotification('Error initializing payment. Please refresh the page.', 'error');
        });
    }

    if (hotJobCheckbox) {
        hotJobCheckbox.addEventListener('change', function() {
            if (this.checked) {
                paypalButtonContainer.style.display = 'block';
                if (!paypalButtonInitialized) {
                    initializePayPalButton();
                }
            } else {
                paypalButtonContainer.style.display = 'none';
                hotJobCheckbox.disabled = false;
            }
        });
    }

    paypalScript.onerror = function(error) {
        console.error('PayPal script failed to load:', error);
        showNotification('Error loading payment system. Please refresh the page.', 'error');
    };

    paypalScript.onload = function() {
        if (hotJobCheckbox && hotJobCheckbox.checked) {
            initializePayPalButton();
        }
    };

    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    applicationDeadline.min = formattedDate;

    function showError(input, message) {
        const formGroup = input.closest('.form-group');
        const existingError = formGroup.querySelector('.error-message');
        
        if (!existingError) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.color = '#ff4444';
            errorDiv.style.fontSize = '0.85rem';
            errorDiv.style.marginTop = '0.3rem';
            errorDiv.textContent = message;
            formGroup.appendChild(errorDiv);
        } else {
            existingError.textContent = message;
        }
        
        input.style.borderColor = '#ff4444';
        input.style.backgroundColor = '#fff8f8';
    }

    function removeError(input) {
        const formGroup = input.closest('.form-group');
        const errorDiv = formGroup.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
        input.style.borderColor = '#e0e0e0';
        input.style.backgroundColor = '#f8f9fa';
    }

    function compressImage(file) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                // Calculate new dimensions (max 800x800)
                const maxSize = 800;
                let { width, height } = img;
                
                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(resolve, 'image/jpeg', 0.8);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidDate(date) {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selectedDate >= today;
    }

    const inputs = postJobForm.querySelectorAll(
        'input:not([type="file"]), select, textarea'    
    );
      
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            removeError(input);
            validateField(input);
        });

        input.addEventListener('blur', function() {
            validateField(input);
        });
    });

    function validateField(input) {
        const value = input.value.trim();
        
        switch(input.id) {
            case 'jobTitle':
                if (value.length < 3) {
                    showError(input, translations[currentLanguage]['error-job-title-length']);
                    return false;
                }
                break;
                
            case 'companyName':
                if (value.length < 2) {
                    showError(input, translations[currentLanguage]['error-company-name-length']);
                    return false;
                }
                break;
                
            case 'jobType':
                if (!value) {
                    showError(input, translations[currentLanguage]['error-job-type-required']);
                    return false;
                }
                break;
                
            case 'category':
                if (!value) {
                    showError(input, translations[currentLanguage]['error-category-required']);
                    return false;
                }
                break;

            case 'location':
                if (!value) {
                    showError(input, translations[currentLanguage]['error-location-required']);
                    return false;
                }
                break;
                
            case 'salary':
                if (!value) {
                    showError(input, translations[currentLanguage]['error-salary-required']);
                    return false;
                } else if (!/^[€$]?\d+(\s*-\s*[€$]?\d+)?$/.test(value)) {
                    showError(input, translations[currentLanguage]['error-salary-format']);
                    return false;
                }
                break;
                
            case 'vacancy':
                if (value < 1) {
                    showError(input, translations[currentLanguage]['error-vacancy-min']);
                    return false;
                }
                break;
                
            case 'jobDescription':
                if (value.length < 50) {
                    showError(input, translations[currentLanguage]['error-description-length']);
                    return false;
                }
                break;
                
            case 'requirements':
                if (value.length < 30) {
                    showError(input, translations[currentLanguage]['error-requirements-length']);
                    return false;
                }
                break;
                
            case 'benefits':
                if (!value) {
                    showError(input, translations[currentLanguage]['error-benefits-required']);
                    return false;
                } else if (value.length < 20) {
                    showError(input, translations[currentLanguage]['error-benefits-length']);
                    return false;
                }
                break;
                
            case 'applicationDeadline':
                if (!value) {
                    showError(input, translations[currentLanguage]['error-deadline-required']);
                    return false;
                } else if (!isValidDate(value)) {
                    showError(input, translations[currentLanguage]['error-deadline-past']);
                    return false;
                }
                break;
                
            case 'contactEmail':
                if (!isValidEmail(value)) {
                    showError(input, translations[currentLanguage]['error-email-invalid']);
                    return false;
                }
                break;
                
            case 'companyLogo':
                if (input.files.length > 0) {
                    const file = input.files[0];
                    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                    
                    if (!validTypes.includes(file.type)) {
                        showError(input, translations[currentLanguage]['error-logo-format'] || 'Please select a valid image file (JPEG, PNG, GIF, or WebP)');
                        return false;
                    }
                    if (file.size > 10 * 1024 * 1024) { // 10MB limit
                        showError(input, translations[currentLanguage]['error-logo-size'] || 'Image size must be less than 10MB');
                        return false;
                    }
                }
                break;
        }
        
        return true;
    }

    if (logoInput) {
        logoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                
                if (!validTypes.includes(file.type)) {
                    showError(logoInput, translations[currentLanguage]['error-logo-format'] || 'Please select a valid image file (JPEG, PNG, GIF, or WebP)');
                    return;
                }
                if (file.size > 10 * 1024 * 1024) { // 10MB limit
                    showError(logoInput, translations[currentLanguage]['error-logo-size'] || 'Image size must be less than 10MB');
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    logoPreview.src = e.target.result;
                    logoPreview.style.display = 'block';
                    previewPlaceholder.style.display = 'none';
                }
                reader.readAsDataURL(file);
                removeError(logoInput);
            } else {
                logoPreview.src = '#';
                logoPreview.style.display = 'none';
                previewPlaceholder.style.display = 'flex';
            }
        });
    }

    if (postJobForm) {
        postJobForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const user = auth.currentUser;
            if (!user || !user.emailVerified) {
                showLoginPopup();
                return;
            }

            if (hotJobCheckbox.checked && !hotJobCheckbox.disabled) {
                showNotification('Please complete the payment for hot job feature before posting.', 'error');
                return;
            }
            
            clearErrors();

            const isValid = validateForm();
            
            if (isValid) {
                try {
                    const formData = new FormData(postJobForm);
                    const jobData = {
                        jobTitle: formData.get('jobTitle'),
                        companyName: formData.get('companyName'),
                        companyLogo: formData.get('companyLogo') || 'img/logo.png',
                        jobType: formData.get('jobType'),
                        category: formData.get('category'),
                        location: formData.get('location'),
                        salary: formData.get('salary'),
                        vacancy: parseInt(formData.get('vacancy')),
                        description: formData.get('jobDescription'),
                        requirements: formData.get('requirements'),
                        responsibilities: formData.get('responsibilities'),
                        benefits: formData.get('benefits'),
                        applicationDeadline: formData.get('applicationDeadline'),
                        contactEmail: formData.get('contactEmail'),
                        postedBy: user.uid,
                        postedDate: new Date().toISOString(),
                        status: 'active',
                        applications: [],
                        savedBy: [],
                        isHotJob: hotJobCheckbox.checked && hotJobCheckbox.disabled 
                    };

                    await saveAndRedirect(jobData);
                } catch (error) {
                    console.error('Error posting job:', error);
                    showNotification('Error posting job. Please try again.', 'error');
                }
            }
        });
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add different styles for different notification types
        switch(type) {
            case 'error':
                notification.style.backgroundColor = '#ff4444';
                notification.style.color = 'white';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ff8800';
                notification.style.color = 'white';
                break;
            case 'info':
                notification.style.backgroundColor = '#2196F3';
                notification.style.color = 'white';
                break;
            default: // success
                notification.style.backgroundColor = '#4CAF50';
                notification.style.color = 'white';
        }
        
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px 20px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '10000';
        notification.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    async function saveAndRedirect(jobData) {
        try {
            const user = auth.currentUser;
            if (!user || !user.emailVerified) {
                throw new Error('User not authenticated or email not verified');
            }

            // Show loading state
            const submitBtn = document.getElementById("btn");
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>Uploading...</span>';
            submitBtn.disabled = true;

            const formData = new FormData(postJobForm);
            
            let companyLogoUrl = 'img/logo.png'; 
            const logoFile = formData.get('companyLogo');
            
            if (logoFile && logoFile instanceof File) {
                // Check storage failure status more robustly
                const isStorageFailed = localStorage.getItem('storageFailed') === 'true';
                
                if (!isStorageFailed && !STORAGE_DISABLED) {
                    try {
                        // Compress the image
                        const compressedFile = await compressImage(logoFile);
                        
                        // Create a unique filename for the storage
                        const timestamp = Date.now();
                        const fileName = `${timestamp}-${logoFile.name}`;
                        const storageRef = ref(storage, `job-logos/${user.uid}/${fileName}`);
                        
                        
                        // Add timeout to prevent hanging
                        const uploadPromise = uploadBytes(storageRef, compressedFile);
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Upload timeout')), 5000)
                        );
                        
                        const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
                        
                        // Get the download URL
                        companyLogoUrl = await getDownloadURL(snapshot.ref);
                    } catch (uploadError) {
                        console.error('Error uploading image to storage:', uploadError);
                        storageFailed = true; // Mark storage as failed
                        localStorage.setItem('storageFailed', 'true'); // Save to localStorage
                        
                        // Fallback to base64 if storage fails
                        const reader = new FileReader();
                        companyLogoUrl = await new Promise((resolve, reject) => {
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(logoFile);
                        });
                        
                        showNotification('Info: Image stored as base64 (storage upload failed).', 'info');
                    }
                } else {
                    // Storage has failed before, use base64 directly
                const reader = new FileReader();
                companyLogoUrl = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(logoFile);
                });
                }
            }
            
            const jobData = {
                jobTitle: formData.get('jobTitle'),
                companyName: formData.get('companyName'),
                companyLogo: companyLogoUrl,
                jobType: formData.get('jobType'),
                category: formData.get('category'),
                location: formData.get('location'),
                salary: formData.get('salary'),
                vacancy: parseInt(formData.get('vacancy')),
                description: formData.get('jobDescription'),
                requirements: formData.get('requirements'),
                responsibilities: formData.get('responsibilities'),
                benefits: formData.get('benefits'),
                applicationDeadline: formData.get('applicationDeadline'),
                contactEmail: formData.get('contactEmail'),
                postedBy: user.uid,
                postedDate: new Date().toISOString(),
                status: 'active',
                applications: [],
                savedBy: [],
                isHotJob: hotJobCheckbox.checked && hotJobCheckbox.disabled 
            };

            const jobRef = await addDoc(collection(db, 'jobs'), jobData);

            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                console.error('User document does not exist');
                throw new Error('User document not found');
            }

            const userData = userDoc.data();

            const jobs = userData.jobs || {};
            
            jobs[jobRef.id] = {
                jobTitle: jobData.jobTitle,
                companyName: jobData.companyName,
                location: jobData.location,
                jobType: jobData.jobType,
                salary: jobData.salary,
                status: 'active',
                postedDate: jobData.postedDate,
                applicationDeadline: jobData.applicationDeadline,
                vacancy: jobData.vacancy
            };

            await updateDoc(userRef, {
                postedJobs: arrayUnion(jobRef.id),
                jobs: jobs
            });

            // Reset button state
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;

            showSuccessPopup(jobData.applicationDeadline);
        } catch (error) {
            console.error('Error saving job:', error);
            showNotification('Error saving job. Please try again.', 'error');
            
            // Reset button state on error
            const submitBtn = document.getElementById("btn");
            if (submitBtn) {
                submitBtn.innerHTML = '<span data-translate="post-job">Post Job</span>';
                submitBtn.disabled = false;
            }
        }
    }

    function formatDateDDMMYYYY(dateString) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function showSuccessPopup(applicationDeadline) {
        const popupOverlay = document.getElementById('popupOverlay');
        const successPopup = popupOverlay.querySelector('.success-popup');
        let deadlineInfo = '';
        if (applicationDeadline) {
            deadlineInfo = `<p><strong>Application Deadline:</strong> ${formatDateDDMMYYYY(applicationDeadline)}</p>`;
        }
        successPopup.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <h2 data-translate="job-posted-success">Job Posted Successfully!</h2>
            <p data-translate="job-posted-message">Your job listing has been posted and is now visible to potential candidates.</p>
            <button onclick="closePopup()" data-translate="continue">Continue</button>
        `;
        popupOverlay.style.display = 'flex';
    }

    function closePopup() {
        const popupOverlay = document.getElementById('popupOverlay');
        popupOverlay.style.display = 'none';
        
        document.body.style.overflow = 'auto';
        
        setTimeout(() => {
            window.location.href = 'jobs.html';
        }, 300);
    }

    window.closePopup = closePopup;

    function validateForm() {
        let isValid = true;

        const jobTitle = document.getElementById('jobTitle');
        if (!jobTitle.value.trim()) {
            showError(jobTitle, translations[currentLanguage]['error-job-title-required']);
            isValid = false;
        } else if (jobTitle.value.trim().length < 3) {
            showError(jobTitle, translations[currentLanguage]['error-job-title-length']);
            isValid = false;
        }

        const companyName = document.getElementById('companyName');
        if (!companyName.value.trim()) {
            showError(companyName, translations[currentLanguage]['error-company-name-required']);
            isValid = false;
        }

        const jobType = document.getElementById('jobType');
        if (!jobType.value) {
            showError(jobType, translations[currentLanguage]['error-job-type-required']);
            isValid = false;
        }

        const category = document.getElementById('category');
        if (!category.value) {
            showError(category, translations[currentLanguage]['error-category-required']);
            isValid = false;
        }

        const location = document.getElementById('location');
        if (!location.value) {
            showError(location, translations[currentLanguage]['error-location-required']);
            isValid = false;
        }

        const salary = document.getElementById('salary');
        if (!salary.value.trim()) {
            showError(salary, translations[currentLanguage]['error-salary-required']);
            isValid = false;
        } else if (!/^[€$]?\d+(\s*-\s*[€$]?\d+)?$/.test(salary.value.trim())) {
            showError(salary, translations[currentLanguage]['error-salary-format']);
            isValid = false;
        }

        const vacancy = document.getElementById('vacancy');
        if (!vacancy.value) {
            showError(vacancy, translations[currentLanguage]['error-vacancy-required']);
            isValid = false;
        } else if (parseInt(vacancy.value) < 1) {
            showError(vacancy, translations[currentLanguage]['error-vacancy-min']);
            isValid = false;
        }

        const jobDescription = document.getElementById('jobDescription');
        if (!jobDescription.value.trim()) {
            showError(jobDescription, translations[currentLanguage]['error-description-required']);
            isValid = false;
        } else if (jobDescription.value.trim().length < 50) {
            showError(jobDescription, translations[currentLanguage]['error-description-length']);
            isValid = false;
        }

        const requirements = document.getElementById('requirements');
        if (!requirements.value.trim()) {
            showError(requirements, translations[currentLanguage]['error-requirements-required']);
            isValid = false;
        } else if (requirements.value.trim().length < 30) {
            showError(requirements, translations[currentLanguage]['error-requirements-length']);
            isValid = false;
        }

        const benefits = document.getElementById('benefits');
        if (!benefits.value.trim()) {
            showError(benefits, translations[currentLanguage]['error-benefits-required']);
            isValid = false;
        } else if (benefits.value.trim().length < 20) {
            showError(benefits, translations[currentLanguage]['error-benefits-length']);
            isValid = false;
        }

        if (!applicationDeadline.value) {
            showError(applicationDeadline, translations[currentLanguage]['error-deadline-required']);
            isValid = false;
        } else {
            const selectedDate = new Date(applicationDeadline.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                showError(applicationDeadline, translations[currentLanguage]['error-deadline-past']);
                isValid = false;
            }
        }

        const contactEmail = document.getElementById('contactEmail');
        if (!contactEmail.value.trim()) {
            showError(contactEmail, translations[currentLanguage]['error-email-required']);
            isValid = false;
        } else if (!isValidEmail(contactEmail.value.trim())) {
            showError(contactEmail, translations[currentLanguage]['error-email-invalid']);
            isValid = false;
        }

        const companyLogo = document.getElementById('companyLogo');
        if (!companyLogo.files || companyLogo.files.length === 0) {
            showError(companyLogo, translations[currentLanguage]['error-logo-required']);
            isValid = false;
        } else {
            const file = companyLogo.files[0];
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                showError(companyLogo, translations[currentLanguage]['error-logo-format'] || 'Please select a valid image file (JPEG, PNG, GIF, or WebP)');
                isValid = false;
            } else if (file.size > 10 * 1024 * 1024) { // 10MB limit
                showError(companyLogo, translations[currentLanguage]['error-logo-size'] || 'Image size must be less than 10MB');
                isValid = false;
            }
        }

        return isValid;
    }

    function clearErrors() {
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(error => error.remove());
        
        const errorInputs = document.querySelectorAll('.error');
        errorInputs.forEach(input => input.classList.remove('error'));
    }

    function showLoginPopup() {
        const loginPopupOverlay = document.getElementById('loginPopupOverlay');
        loginPopupOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        const formInputs = postJobForm.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.disabled = false;
            input.style.opacity = '1';
        });

        const submitBtn = document.getElementById("btn");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    }

    function closeLoginPopup() {
        const loginPopupOverlay = document.getElementById('loginPopupOverlay');
        loginPopupOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        const formInputs = postJobForm.querySelectorAll('input,select, textarea');
        formInputs.forEach(input => {
            input.disabled = true;
            input.style.opacity = '1';
        });
        
        const submitBtn = document.getElementById("btn");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    }

    window.closeLoginPopup = closeLoginPopup;

    // Function to reset storage failure flag (for testing purposes)
    window.resetStorageFailure = function() {
        storageFailed = false;
        localStorage.removeItem('storageFailed');
    };

    // Add event listener for language change
    window.addEventListener('languageChanged', function() {
        // Get all form inputs that have error messages
        const inputs = postJobForm.querySelectorAll('input:not([type="file"]), select, textarea');
        inputs.forEach(input => {
            const formGroup = input.closest('.form-group');
            const errorDiv = formGroup.querySelector('.error-message');
            if (errorDiv) {
                // Re-validate the field to get the translated error message
                validateField(input);
            }
        });
    });
}); 