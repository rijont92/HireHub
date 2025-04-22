document.addEventListener('DOMContentLoaded', function() {
    const postJobForm = document.getElementById('postJobForm');
    const logoInput = document.getElementById('companyLogo');
    const logoPreview = document.getElementById('logoPreview');
    const previewPlaceholder = document.querySelector('.preview-placeholder');
    const applicationDeadline = document.getElementById('applicationDeadline');
    const btn = document.getElementById("btn");
    const postJobContainer = document.querySelector('.blured');

    // Check authentication on page load
    if(localStorage.getItem("isAuthenticated") === "true") {
        btn.innerHTML = "Post Job";
        postJobContainer.classList.remove('blurred');
       
    } else {
        btn.innerHTML = "Sign Up to post";
        showLoginPopup();
        postJobContainer.classList.add('blurred');
    }

    console.log(localStorage.getItem("isAuthenticated"));

    // Set minimum date to today
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    applicationDeadline.min = formattedDate;

    // Add error message display
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

    // Remove error message
    function removeError(input) {
        const formGroup = input.closest('.form-group');
        const errorDiv = formGroup.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
        input.style.borderColor = '#e0e0e0';
        input.style.backgroundColor = '#f8f9fa';
    }

    // Validate email format
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Validate date format and ensure it's not in the past
    function isValidDate(date) {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selectedDate >= today;
    }

    // Real-time validation for inputs
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

    // Validate individual field
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
                
            case 'location':
                if (value.length < 2) {
                    showError(input, 'Please enter a valid location');
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

    // Handle company logo preview
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

    // Handle form submission
    if (postJobForm) {
        postJobForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Check if user is authenticated
            if (localStorage.getItem("isAuthenticated") === "false") {
                showLoginPopup();
                return;
            }
            
            // Reset previous error messages
            clearErrors();

            // Validate all fields
            const isValid = validateForm();
            
            if (isValid) {
                try {
                    // Collect form data
                    const formData = new FormData(postJobForm);
                    const jobData = {};
                    
                    // Convert FormData to object
                    for (let [key, value] of formData.entries()) {
                        jobData[key] = value;
                    }

                    // Add timestamp and ID
                    jobData.id = Date.now().toString();
                    jobData.postedDate = new Date().toISOString();

                    // Handle company logo
                    const logoFile = formData.get('companyLogo');
                    if (logoFile) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            jobData.companyLogo = e.target.result;
                            saveAndRedirect(jobData);
                        }
                        reader.readAsDataURL(logoFile);
                    } else {
                        jobData.companyLogo = '../img/default-logo.png';
                        saveAndRedirect(jobData);
                    }
                    
                } catch (error) {
                    console.error('Error posting job:', error);
                    alert('Error posting job. Please try again.');
                }
            }
        });
    }

    function saveAndRedirect(jobData) {

        try {
            // Get existing jobs
            let allJobs = JSON.parse(localStorage.getItem('jobs') || '[]');
            let myJobs = JSON.parse(localStorage.getItem('myJobs') || '[]');
            
            // Get current user
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            console.log('Current user when posting job:', currentUser);
            
            // Optimize job data
            const optimizedJobData = {
                id: jobData.id,
                userId: currentUser.uid,
                postedBy: jobData.postedBy,
                postedDate: jobData.postedDate,
                jobTitle: jobData.jobTitle,
                companyName: jobData.companyName,
                jobType: jobData.jobType,
                location: jobData.location,
                salary: jobData.salary,
                jobDescription: jobData.jobDescription,
                requirements: jobData.requirements,
                benefits: jobData.benefits,
                applicationDeadline: jobData.applicationDeadline
            };

            // Handle company logo
            if (jobData.companyLogo && jobData.companyLogo.startsWith('data:image')) {
                // If it's a base64 image, use it directly
                optimizedJobData.companyLogo = jobData.companyLogo;
                console.log('Using uploaded logo (base64)');
            } else {
                // Use default logo if no logo was uploaded
                optimizedJobData.companyLogo = '../img/logo.png';
                console.log('Using default logo');
            }

            // Add to all jobs
            allJobs.push(optimizedJobData);
            
            // Add to my jobs
            myJobs.push(optimizedJobData);
            
            // Save to localStorage
            localStorage.setItem('jobs', JSON.stringify(allJobs));
            localStorage.setItem('myJobs', JSON.stringify(myJobs));
            
            console.log('Saved job with user ID:', optimizedJobData.userId);
            console.log('All jobs after saving:', JSON.parse(localStorage.getItem('jobs')));
            
            // Show success popup
            const successPopup = document.getElementById('successPopup');
            successPopup.style.display = 'flex';
            
            // Add event listener for close button
            const closePopup = document.getElementById('closeSuccessPopup');
            closePopup.addEventListener('click', function() {
                successPopup.style.display = 'none';
                // Redirect to my jobs page after closing popup
                window.location.href = 'my-jobs.html';
            });
            
        } catch (error) {
            console.error('Error saving job:', error);
            alert('Error saving job. Please try again with a smaller image or contact support.');
        }

    }

    function showSuccessPopup() {
        const popupOverlay = document.getElementById('popupOverlay');
        popupOverlay.style.display = 'block';
        
        // Prevent scrolling when popup is shown
        document.body.style.overflow = 'hidden';
    }

    function closePopup() {
        const popupOverlay = document.getElementById('popupOverlay');
        popupOverlay.style.display = 'none';
        
        // Restore scrolling
        document.body.style.overflow = 'auto';
        
        // Redirect to jobs page after a short delay
        setTimeout(() => {
            window.location.href = 'jobs.html';
        }, 300);
    }

    // Make closePopup function available globally
    window.closePopup = closePopup;

    function validateForm() {
        let isValid = true;

        // Job Title validation
        const jobTitle = document.getElementById('jobTitle');
        if (!jobTitle.value.trim()) {
            showError(jobTitle, 'Job title is required');
            isValid = false;
        } else if (jobTitle.value.trim().length < 3) {
            showError(jobTitle, 'Job title must be at least 3 characters long');
            isValid = false;
        }

        // Company Name validation
        const companyName = document.getElementById('companyName');
        if (!companyName.value.trim()) {
            showError(companyName, 'Company name is required');
            isValid = false;
        }

        // Job Type validation
        const jobType = document.getElementById('jobType');
        if (!jobType.value) {
            showError(jobType, 'Please select a job type');
            isValid = false;
        }

        // Location validation
        const location = document.getElementById('location');
        if (!location.value.trim()) {
            showError(location, 'Location is required');
            isValid = false;
        }

        // Salary validation
        const salary = document.getElementById('salary');
        if (!salary.value.trim()) {
            showError(salary, 'Salary range is required');
            isValid = false;
        } else if (!/^[€$]?\d+(\s*-\s*[€$]?\d+)?$/.test(salary.value.trim())) {
            showError(salary, 'Please enter a valid salary range (e.g., €1000 - €2000)');
            isValid = false;
        }

        // Vacancy validation
        const vacancy = document.getElementById('vacancy');
        if (!vacancy.value) {
            showError(vacancy, 'Number of vacancies is required');
            isValid = false;
        } else if (parseInt(vacancy.value) < 1) {
            showError(vacancy, 'Number of vacancies must be at least 1');
            isValid = false;
        }

        // Job Description validation
        const jobDescription = document.getElementById('jobDescription');
        if (!jobDescription.value.trim()) {
            showError(jobDescription, 'Job description is required');
            isValid = false;
        } else if (jobDescription.value.trim().length < 50) {
            showError(jobDescription, 'Job description must be at least 50 characters long');
            isValid = false;
        }

        // Requirements validation
        const requirements = document.getElementById('requirements');
        if (!requirements.value.trim()) {
            showError(requirements, 'Requirements are required');
            isValid = false;
        } else if (requirements.value.trim().length < 30) {
            showError(requirements, 'Requirements must be at least 30 characters long');
            isValid = false;
        }

        // Benefits validation
        const benefits = document.getElementById('benefits');
        if (!benefits.value.trim()) {
            showError(benefits, 'Benefits are required');
            isValid = false;
        } else if (benefits.value.trim().length < 20) {
            showError(benefits, 'Benefits must be at least 20 characters long');
            isValid = false;
        }

        // Application Deadline validation
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

        // Contact Email validation
        const contactEmail = document.getElementById('contactEmail');
        if (!contactEmail.value.trim()) {
            showError(contactEmail, 'Contact email is required');
            isValid = false;
        } else if (!isValidEmail(contactEmail.value.trim())) {
            showError(contactEmail, 'Please enter a valid email address');
            isValid = false;
        }

        // Company Logo validation
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

    // Function to show login popup
    function showLoginPopup() {
        const loginPopupOverlay = document.getElementById('loginPopupOverlay');
        loginPopupOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Enable all form inputs
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

    // Function to close login popup
    function closeLoginPopup() {
        const loginPopupOverlay = document.getElementById('loginPopupOverlay');
        loginPopupOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Disable all form inputs except the submit button
        const formInputs = postJobForm.querySelectorAll('input,select, textarea');
        formInputs.forEach(input => {
            input.disabled = true;
            input.style.opacity = '1';
        });
        
        // Keep submit button enabled and full opacity
        const submitBtn = document.getElementById("btn");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    }

    // Make closeLoginPopup function available globally
    window.closeLoginPopup = closeLoginPopup;


    // Function to validate image
    function validateImage(input) {
        const file = input.files[0];
        if (file) {
            // Check file type
            if (!file.type.match('image.*')) {
                alert('Please select an image file (JPEG, PNG, or GIF)');
                input.value = '';
                return false;
            }

            // Check file size (2MB limit)
            if (file.size > 2 * 1024 * 1024) {
                alert('Image size should be less than 2MB');
                input.value = '';
                return false;
            }

            // Preview image
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('logoPreview').src = e.target.result;
            };
            reader.readAsDataURL(file);
            return true;
        }
        return false;
    }

    // Make validateImage function available globally
    window.validateImage = validateImage;
