// Email validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        return { isValid: false, message: 'Email is required' };
    }
    if (!emailRegex.test(email)) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }
    return { isValid: true, message: '' };
}

// Password validation for login
function validateLoginPassword(password) {
    if (!password) {
        return { isValid: false, message: 'Password is required' };
    }
    return { isValid: true, message: '' };
}

// Password validation for signup with detailed requirements
function validateSignupPassword(password) {
    if (!password) {
        return { isValid: false, message: 'Password is required' };
    }

    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    let errors = [];

    if (password.length < minLength) {
        errors.push('at least 8 characters');
    }
    if (!hasUpperCase) {
        errors.push('one uppercase letter');
    }
    if (!hasLowerCase) {
        errors.push('one lowercase letter');
    }
    if (!hasNumbers) {
        errors.push('one number');
    }
    if (!hasSpecialChar) {
        errors.push('one special character');
    }

    if (errors.length > 0) {
        return {
            isValid: false,
            message: 'Password must contain ' + errors.join(', ')
        };
    }

    return { isValid: true, message: '' };
}

// Confirm password validation
function validateConfirmPassword(password, confirmPassword) {
    if (!confirmPassword) {
        return { isValid: false, message: 'Please confirm your password' };
    }
    if (password !== confirmPassword) {
        return { isValid: false, message: 'Passwords do not match' };
    }
    return { isValid: true, message: '' };
}

// Form validation for login
function validateLoginForm(email, password) {
    const emailValidation = validateEmail(email);
    const passwordValidation = validateLoginPassword(password);

    return {
        isValid: emailValidation.isValid && passwordValidation.isValid,
        errors: {
            email: emailValidation.message,
            password: passwordValidation.message
        }
    };
}

// Form validation for signup
function validateSignupForm(email, password, confirmPassword) {
    const emailValidation = validateEmail(email);
    const passwordValidation = validateSignupPassword(password);
    const confirmPasswordValidation = validateConfirmPassword(password, confirmPassword);

    return {
        isValid: emailValidation.isValid && passwordValidation.isValid && confirmPasswordValidation.isValid,
        errors: {
            email: emailValidation.message,
            password: passwordValidation.message,
            confirmPassword: confirmPasswordValidation.message
        }
    };
}

// Real-time validation for login form
function setupLoginValidation() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorEmail = document.getElementById('error-email');
    const errorPassword = document.getElementById('error-password');
    const submitButton = document.getElementById('submit');

    let isEmailValid = false;
    let isPasswordValid = false;

    function updateSubmitButton() {
        submitButton.disabled = !(isEmailValid && isPasswordValid);
        submitButton.style.opacity = submitButton.disabled ? '0.5' : '1';
    }

    // Email validation
    emailInput.addEventListener('input', () => {
        const result = validateEmail(emailInput.value);
        errorEmail.textContent = result.message;
        errorEmail.style.color = result.isValid ? 'green' : 'red';
        isEmailValid = result.isValid;
        updateSubmitButton();
    });

    // Password validation
    passwordInput.addEventListener('input', () => {
        const result = validateLoginPassword(passwordInput.value);
        errorPassword.textContent = result.message;
        errorPassword.style.color = result.isValid ? 'green' : 'red';
        isPasswordValid = result.isValid;
        updateSubmitButton();
    });

    // Clear error messages when input is focused
    emailInput.addEventListener('focus', () => {
        errorEmail.textContent = '';
    });

    passwordInput.addEventListener('focus', () => {
        errorPassword.textContent = '';
    });
}

// Real-time validation for signup form
function setupSignupValidation() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const password2Input = document.getElementById('password2');
    const errorEmail = document.getElementById('error-email');
    const errorPassword = document.getElementById('error-password');
    const errorPassword2 = document.getElementById('error-password2');
    const submitButton = document.getElementById('submit');

    let isEmailValid = false;
    let isPasswordValid = false;
    let isPassword2Valid = false;

    function updateSubmitButton() {
        submitButton.disabled = !(isEmailValid && isPasswordValid && isPassword2Valid);
        submitButton.style.opacity = submitButton.disabled ? '0.5' : '1';
    }

    // Email validation
    emailInput.addEventListener('input', () => {
        const result = validateEmail(emailInput.value);
        errorEmail.textContent = result.message;
        errorEmail.style.color = result.isValid ? 'green' : 'red';
        isEmailValid = result.isValid;
        updateSubmitButton();
    });

    // Password validation
    passwordInput.addEventListener('input', () => {
        const result = validateSignupPassword(passwordInput.value);
        errorPassword.textContent = result.message;
        errorPassword.style.color = result.isValid ? 'green' : 'red';
        isPasswordValid = result.isValid;

        // Revalidate confirm password when password changes
        if (password2Input.value) {
            const confirmResult = validateConfirmPassword(passwordInput.value, password2Input.value);
            errorPassword2.textContent = confirmResult.message;
            errorPassword2.style.color = confirmResult.isValid ? 'green' : 'red';
            isPassword2Valid = confirmResult.isValid;
        }
        updateSubmitButton();
    });

    // Confirm password validation
    password2Input.addEventListener('input', () => {
        const result = validateConfirmPassword(passwordInput.value, password2Input.value);
        errorPassword2.textContent = result.message;
        errorPassword2.style.color = result.isValid ? 'green' : 'red';
        isPassword2Valid = result.isValid;
        updateSubmitButton();
    });

    // Clear error messages when input is focused
    emailInput.addEventListener('focus', () => {
        errorEmail.textContent = '';
    });

    passwordInput.addEventListener('focus', () => {
        errorPassword.textContent = '';
    });

    password2Input.addEventListener('focus', () => {
        errorPassword2.textContent = '';
    });
}

export { setupLoginValidation, setupSignupValidation, validateLoginForm, validateSignupForm };