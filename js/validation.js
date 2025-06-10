import { currentLanguage, translations } from './translations.js';


function validateEmail(email) {
    if (!email || email.trim() === '') {
        return {
            isValid: false,
            message: translations[currentLanguage]['validation-email-required']
        };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            isValid: false,
            message: translations[currentLanguage]['validation-email-invalid']
        };
    }
    return { isValid: true, message: '' };
}

function validateName(name) {
    if (!name || name.trim() === '') {
        return {
            isValid: false,
            message: translations[currentLanguage]['validation-name-required']
        };
    }
    if (name.length < 2) {
        return {
            isValid: false,
            message: translations[currentLanguage]['validation-name-min']
        };
    }
    return { isValid: true, message: '' };
}

function validateLoginPassword(password) {
    if (!password || password.trim() === '') {
        return { 
            isValid: false, 
            message: translations[currentLanguage]['validation-password-required'] 
        };
    }
    return { isValid: true, message: '' };
}

function validateSignupPassword(password) {
    if (!password || password.trim() === '') {
        return { 
            isValid: false, 
            message: translations[currentLanguage]['validation-password-required'] 
        };
    }

    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    let errors = [];

    if (password.length < minLength) {
        errors.push(translations[currentLanguage]['validation-password-min']);
    }
    if (!hasUpperCase || !hasLowerCase) {
        errors.push(translations[currentLanguage]['validation-password-case']);
    }
    if (!hasNumbers) {
        errors.push(translations[currentLanguage]['validation-password-number']);
    }
    if (!hasSpecialChar) {
        errors.push(translations[currentLanguage]['validation-password-special']);
    }

    if (errors.length > 0) {
        return {
            isValid: false,
            message: errors.join(' ')
        };
    }

    return { isValid: true, message: '' };
}

function validateConfirmPassword(password, confirmPassword) {
    if (!confirmPassword || confirmPassword.trim() === '') {
        return {
            isValid: false,
            message: translations[currentLanguage]['validation-confirm-password-required']
        };
    }
    if (password !== confirmPassword) {
        return {
            isValid: false,
            message: translations[currentLanguage]['validation-passwords-dont-match']
        };
    }
    return { isValid: true, message: '' };
}

function validatePassword(password) {
    if (!password || password.trim() === '') {
        return {
            isValid: false,
            message: translations[currentLanguage]['validation-password-required']
        };
    }
    if (password.length < 6) {
        return {
            isValid: false,
            message: translations[currentLanguage]['validation-password-min']
        };
    }
    return { isValid: true };
}

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

function setupLoginValidation() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorEmail = document.getElementById('error-email');
    const errorPassword = document.getElementById('error-password');
    const submitButton = document.getElementById('submit');


    // Clear error messages on focus
    if (emailInput && errorEmail) {
        emailInput.addEventListener('focus', () => {
            errorEmail.textContent = '';
        });
    }

    if (passwordInput && errorPassword) {
        passwordInput.addEventListener('focus', () => {
            errorPassword.textContent = '';
        });
    }
}

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

   

    // Clear error messages on focus
    if (nameInput && errorName) {
        nameInput.addEventListener('focus', () => {
            errorName.textContent = '';
        });
    }

    if (emailInput && errorEmail) {
        emailInput.addEventListener('focus', () => {
            errorEmail.textContent = '';
        });
    }

    if (passwordInput && errorPassword) {
        passwordInput.addEventListener('focus', () => {
            errorPassword.textContent = '';
        });
    }

    if (password2Input && errorPassword2) {
        password2Input.addEventListener('focus', () => {
            errorPassword2.textContent = '';
        });
    }
}

export { 
    setupLoginValidation, 
    setupSignupValidation, 
    validateLoginForm, 
    validateSignupForm,
    validateEmail,
    validateLoginPassword,
    validateName,
    validateSignupPassword,
    validateConfirmPassword,
    validatePassword
};