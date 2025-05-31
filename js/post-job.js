import { auth, db } from './firebase-config.js';
import { collection, addDoc, doc, updateDoc, arrayUnion, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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

    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user && user.emailVerified) {
            btn.innerHTML = "Post Job";
            postJobContainer.classList.remove('blurred');
        } else {
            btn.innerHTML = "Sign Up to post";
            showLoginPopup();
            postJobContainer.classList.add('blurred');
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
                    showError(input, 'Job title must be at least 3 characters long');
                    return false;
                }
                break;
                
            case 'companyName':
                if (value.length < 2) {
                    showError(input, 'Company name must be at least 2 characters long');
                    return false;
                }
                break;
                
            case 'jobType':
                if (!value) {
                    showError(input, 'Please select a job type');
                    return false;
                }
                break;
                
            case 'category':
                if (!value) {
                    showError(input, 'Please select an industry category');
                    return false;
                }
                break;

            case 'location':
                if (!value) {
                    showError(input, 'Please select a location');
                    return false;
                }
                break;
                
            case 'salary':
                if (!value) {
                    showError(input, 'Salary range is required');
                    return false;
                } else if (!/^[€$]?\d+(\s*-\s*[€$]?\d+)?$/.test(value)) {
                    showError(input, 'Please enter a valid salary range (e.g., €1000 - €2000)');
                    return false;
                }
                break;
                
            case 'vacancy':
                if (value < 1) {
                    showError(input, 'Number of vacancies must be at least 1');
                    return false;
                }
                break;
                
            case 'jobDescription':
                if (value.length < 50) {
                    showError(input, 'Job description must be at least 50 characters long');
                    return false;
                }
                break;
                
            case 'requirements':
                if (value.length < 30) {
                    showError(input, 'Requirements must be at least 30 characters long');
                    return false;
                }
                break;
                
            case 'benefits':
                if (!value) {
                    showError(input, 'Benefits are required');
                    return false;
                } else if (value.length < 20) {
                    showError(input, 'Benefits must be at least 20 characters long');
                    return false;
                }
                break;
                
            case 'applicationDeadline':
                if (!value) {
                    showError(input, 'Application deadline is required');
                    return false;
                } else if (!isValidDate(value)) {
                    showError(input, 'Application deadline must be a future date');
                    return false;
                }
                break;
                
            case 'contactEmail':
                if (!isValidEmail(value)) {
                    showError(input, 'Please enter a valid email address');
                    return false;
                }
                break;
                
            case 'companyLogo':
                if (input.files.length > 0) {
                    const file = input.files[0];
                    if (!file.type.startsWith('image/')) {
                        showError(input, 'Please upload an image file');
                        return false;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                        showError(input, 'Image size should be less than 5MB');
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
                if (!file.type.startsWith('image/')) {
                    showError(logoInput, 'Please upload an image file');
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    showError(logoInput, 'Image size should be less than 5MB');
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
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async function saveAndRedirect(jobData) {
        try {
            const user = auth.currentUser;
            if (!user || !user.emailVerified) {
                throw new Error('User not authenticated or email not verified');
            }

            const formData = new FormData(postJobForm);
            
            let companyLogoUrl = 'img/logo.png'; 
            const logoFile = formData.get('companyLogo');
            
            if (logoFile && logoFile instanceof File) {
                const reader = new FileReader();
                companyLogoUrl = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(logoFile);
                });
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

            showSuccessPopup();
        } catch (error) {
            console.error('Error saving job:', error);
            showNotification('Error saving job. Please try again.', 'error');
        }
    }

    function showSuccessPopup() {
        const popupOverlay = document.getElementById('popupOverlay');
        popupOverlay.style.display = 'block';
        
        document.body.style.overflow = 'hidden';
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
            showError(jobTitle, 'Job title is required');
            isValid = false;
        } else if (jobTitle.value.trim().length < 3) {
            showError(jobTitle, 'Job title must be at least 3 characters long');
            isValid = false;
        }

        const companyName = document.getElementById('companyName');
        if (!companyName.value.trim()) {
            showError(companyName, 'Company name is required');
            isValid = false;
        }

        const jobType = document.getElementById('jobType');
        if (!jobType.value) {
            showError(jobType, 'Please select a job type');
            isValid = false;
        }
        const salary = document.getElementById('salary');
        if (!salary.value.trim()) {
            showError(salary, 'Salary range is required');
            isValid = false;
        } else if (!/^[€$]?\d+(\s*-\s*[€$]?\d+)?$/.test(salary.value.trim())) {
            showError(salary, 'Please enter a valid salary range (e.g., €1000 - €2000)');
            isValid = false;
        }

        const vacancy = document.getElementById('vacancy');
        if (!vacancy.value) {
            showError(vacancy, 'Number of vacancies is required');
            isValid = false;
        } else if (parseInt(vacancy.value) < 1) {
            showError(vacancy, 'Number of vacancies must be at least 1');
            isValid = false;
        }

        const jobDescription = document.getElementById('jobDescription');
        if (!jobDescription.value.trim()) {
            showError(jobDescription, 'Job description is required');
            isValid = false;
        } else if (jobDescription.value.trim().length < 50) {
            showError(jobDescription, 'Job description must be at least 50 characters long');
            isValid = false;
        }

        const requirements = document.getElementById('requirements');
        if (!requirements.value.trim()) {
            showError(requirements, 'Requirements are required');
            isValid = false;
        } else if (requirements.value.trim().length < 30) {
            showError(requirements, 'Requirements must be at least 30 characters long');
            isValid = false;
        }

        const benefits = document.getElementById('benefits');
        if (!benefits.value.trim()) {
            showError(benefits, 'Benefits are required');
            isValid = false;
        } else if (benefits.value.trim().length < 20) {
            showError(benefits, 'Benefits must be at least 20 characters long');
            isValid = false;
        }

        if (!applicationDeadline.value) {
            showError(applicationDeadline, 'Application deadline is required');
            isValid = false;
        } else {
            const selectedDate = new Date(applicationDeadline.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                showError(applicationDeadline, 'Application deadline cannot be in the past');
                isValid = false;
            }
        }

        const contactEmail = document.getElementById('contactEmail');
        if (!contactEmail.value.trim()) {
            showError(contactEmail, 'Contact email is required');
            isValid = false;
        } else if (!isValidEmail(contactEmail.value.trim())) {
            showError(contactEmail, 'Please enter a valid email address');
            isValid = false;
        }

        const companyLogo = document.getElementById('companyLogo');
        if (!companyLogo.files || companyLogo.files.length === 0) {
            showError(companyLogo, 'Company logo is required');
            isValid = false;
        } else {
            const file = companyLogo.files[0];
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                showError(companyLogo, 'Please upload a valid image file (JPEG, PNG, or GIF)');
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
}); 