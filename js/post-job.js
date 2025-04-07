document.addEventListener('DOMContentLoaded', function() {
    const postJobForm = document.getElementById('postJobForm');
    const logoInput = document.getElementById('companyLogo');
    const logoPreview = document.getElementById('logoPreview');
    const previewPlaceholder = document.querySelector('.preview-placeholder');

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
    const inputs = postJobForm.querySelectorAll('input, select, textarea');
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
                if (value && !/^[\d\s,.-]+$/.test(value)) {
                    showError(input, 'Please enter a valid salary range');
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
                
            case 'applicationDeadline':
                if (value && !isValidDate(value)) {
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
            
            // Remove all existing error messages
            document.querySelectorAll('.error-message').forEach(error => error.remove());
            
            // Validate all fields
            let isValid = true;
            inputs.forEach(input => {
                if (!validateField(input) && input.required) {
                    isValid = false;
                }
            });

            if (!isValid) {
                // Scroll to the first error
                const firstError = document.querySelector('.error-message');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            try {
                // Collect form data
                const formData = new FormData(postJobForm);
                
                // Log form data (replace with your actual submission logic)
                for (let [key, value] of formData.entries()) {
                    console.log(key, value);
                }
                
                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.style.backgroundColor = '#4CAF50';
                successMessage.style.color = 'white';
                successMessage.style.padding = '1rem';
                successMessage.style.borderRadius = '8px';
                successMessage.style.marginBottom = '1rem';
                successMessage.style.textAlign = 'center';
                successMessage.textContent = 'Job posted successfully!';
                
                postJobForm.insertBefore(successMessage, postJobForm.firstChild);
                
                // Reset form after 2 seconds
                setTimeout(() => {
                    postJobForm.reset();
                    successMessage.remove();
                    logoPreview.src = '#';
                    logoPreview.style.display = 'none';
                    previewPlaceholder.style.display = 'flex';
                }, 2000);
                
            } catch (error) {
                console.error('Error posting job:', error);
                alert('Error posting job. Please try again.');
            }
        });
    }
}); 