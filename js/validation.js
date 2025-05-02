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

// Name validation
function validateName(name) {
    if (!name) {
        return { isValid: false, message: 'Name is required' };
    }
    if (name.length < 2) {
        return { isValid: false, message: 'Name must be at least 2 characters long' };
    }
    if (!/^[a-zA-Z\s'-]+$/.test(name)) {
        return { isValid: false, message: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
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
    if (!hasUpperCase || !hasLowerCase) {
        errors.push('both uppercase and lowercase letters');
    }
    if (!hasNumbers) {
        errors.push('at least one number');
    }
    if (!hasSpecialChar) {
        errors.push('at least one special character (!@#$%^&*(),.?":{}|<>)');
    }

    if (errors.length > 0) {
        return {
            isValid: false,
            message: 'Password must contain: ' + errors.join(', ')
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
function validateSignupForm(name, email, password, confirmPassword) {
    const nameValidation = validateName(name);
    const emailValidation = validateEmail(email);
    const passwordValidation = validateSignupPassword(password);
    const confirmPasswordValidation = validateConfirmPassword(password, confirmPassword);

    return {
        isValid: nameValidation.isValid && emailValidation.isValid && passwordValidation.isValid && confirmPasswordValidation.isValid,
        errors: {
            name: nameValidation.message,
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
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const password2Input = document.getElementById('password2');
    const errorName = document.getElementById('error-name');
    const errorEmail = document.getElementById('error-email');
    const errorPassword = document.getElementById('error-password');
    const errorPassword2 = document.getElementById('error-password2');
    const submitButton = document.getElementById('submit');

    let isNameValid = false;
    let isEmailValid = false;
    let isPasswordValid = false;
    let isPassword2Valid = false;

    function updateSubmitButton() {
        submitButton.disabled = !(isNameValid && isEmailValid && isPasswordValid && isPassword2Valid);
        submitButton.style.opacity = submitButton.disabled ? '0.5' : '1';
    }

    // Name validation
    nameInput.addEventListener('input', () => {
        const result = validateName(nameInput.value);
        errorName.textContent = result.message;
        errorName.style.color = result.isValid ? 'green' : 'red';
        isNameValid = result.isValid;
        updateSubmitButton();
    });

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
    nameInput.addEventListener('focus', () => {
        errorName.textContent = '';
    });

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