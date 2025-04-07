document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("form");
    const Email = document.getElementById("email");
    const Password = document.getElementById("password");
    const Password2 = document.getElementById("password2");
    const errorEmail = document.getElementById("error-email");
    const errorPassword = document.getElementById("error-password");
    const errorPassword2 = document.getElementById("error-password2");
    const icon = document.getElementById("icon");
    const icon2 = document.getElementById("icon2");

    const storedImage = localStorage.getItem('profileImage');

    form.addEventListener("submit", function(event) {
        event.preventDefault();

        const isEmailValid = validateEmail(Email.value);
        const isPasswordValid = validatePassword(Password.value);
        const isConfirmPasswordValid = validatePassword2(Password.value, Password2.value);

        if (isEmailValid && isPasswordValid && isConfirmPasswordValid) {
            window.location.href = "../index.html";  // Redirect to login page
            localStorage.setItem('tahiri', 'true');
            
        }
    });

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (email === "") {
            errorEmail.innerHTML = "Email cannot be blank";
            Email.classList.add("error");
            return false;
        }

        const isValid = re.test(String(email).toLowerCase());

        if (isValid) {
            errorEmail.innerHTML = "";
            Email.classList.remove("error");
        } else {
            errorEmail.innerHTML = "Invalid email address";
            Email.classList.add("error");
        }

        return isValid;
    }

    function validatePassword(password) {
        if (password === "") {
            errorPassword.innerHTML = "Password cannot be blank";
            Password.classList.add("error");
            return false;
        }

        const isValid = password.length >= 8 && password.length <= 30;

        if (isValid) {
            errorPassword.innerHTML = "";
            Password.classList.remove("error");
        } else {
            errorPassword.innerHTML = "Password must be between 8 and 30 characters";
            Password.classList.add("error");
        }

        return isValid;
    }

    function validatePassword2(password, confirmPasswordValue) {
        if (confirmPasswordValue === "") {
            errorPassword2.innerHTML = "Confirm Password cannot be blank";
            Password2.classList.add("error");
            return false;
        }

        const isValid = password === confirmPasswordValue;

        if (isValid) {
            errorPassword2.innerHTML = "";
            Password2.classList.remove("error");
        } else {
            errorPassword2.innerHTML = "Passwords do not match";
            Password2.classList.add("error");
        }

        return isValid;
    }

    // Function to toggle password visibility for the first password input
    window.changeIcon = function () {
        if (Password.type === "password") {
            icon.classList.replace("fa-eye-slash", "fa-eye");
            Password.type = "text";
        } else {
            icon.classList.replace("fa-eye", "fa-eye-slash");
            Password.type = "password";
        }
    }

    // Function to toggle password visibility for the confirm password input
    window.changeIcon2 = function () {
        if (Password2.type === "password") {
            icon2.classList.replace("fa-eye-slash", "fa-eye");
            Password2.type = "text";
        } else {
            icon2.classList.replace("fa-eye", "fa-eye-slash");
            Password2.type = "password";
        }
    }
});



function triggerFileInput() {
    document.getElementById('file-input').click();
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const base64Image  = e.target.result
            document.getElementById('preview-img').src = base64Image ;
            localStorage.setItem('profileImage', base64Image);
        };
        reader.readAsDataURL(file);
    }
}











































// Import necessary Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Initialize Firebase app
const firebaseConfig = {
  apiKey: "AIzaSyCePiJ0t4AjSnh_pYj0K4syZ_ATNZCfEhs",
  authDomain: "hirehub-d7a32.firebaseapp.com",
  projectId: "hirehub-d7a32",
  storageBucket: "hirehub-d7a32.firebasestorage.app",
  messagingSenderId: "709139851875",
  appId: "1:709139851875:web:6e871ff4df6c72a3662656",
  measurementId: "G-0VPRE8XGWC"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Sign-up form and input elements
const signupForm = document.getElementById("form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// Handle form submission
signupForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      createdAt: new Date()
    });

    
    window.location.href = "login.html";
  } catch (error) {
    console.error("Error creating user:", error);
  
  }
});



// document.addEventListener("DOMContentLoaded", function () {
//     const form = document.getElementById("form");
//     const Email = document.getElementById("email");
//     const Password = document.getElementById("password");
//     const Password2 = document.getElementById("password2");
//     const errorEmail = document.getElementById("error-email");
//     const errorPassword = document.getElementById("error-password");
//     const errorPassword2 = document.getElementById("error-password2");
//     const icon = document.getElementById("icon");
//     const icon2 = document.getElementById("icon2");

//     const storedImage = localStorage.getItem('profileImage');

//     form.addEventListener("submit", function(event) {
//         event.preventDefault();

//         const isEmailValid = validateEmail(Email.value);
//         const isPasswordValid = validatePassword(Password.value);
//         const isConfirmPasswordValid = validatePassword2(Password.value, Password2.value);

//         if (isEmailValid && isPasswordValid && isConfirmPasswordValid) {
//             window.location.href = "../index.html";  // Redirect to login page
//             localStorage.setItem('tahiri', 'true');
            
//         }
//     });

//     function validateEmail(email) {
//         const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//         if (email === "") {
//             errorEmail.innerHTML = "Email cannot be blank";
//             Email.classList.add("error");
//             return false;
//         }

//         const isValid = re.test(String(email).toLowerCase());

//         if (isValid) {
//             errorEmail.innerHTML = "";
//             Email.classList.remove("error");
//         } else {
//             errorEmail.innerHTML = "Invalid email address";
//             Email.classList.add("error");
//         }

//         return isValid;
//     }

//     function validatePassword(password) {
//         if (password === "") {
//             errorPassword.innerHTML = "Password cannot be blank";
//             Password.classList.add("error");
//             return false;
//         }

//         const isValid = password.length >= 8 && password.length <= 30;

//         if (isValid) {
//             errorPassword.innerHTML = "";
//             Password.classList.remove("error");
//         } else {
//             errorPassword.innerHTML = "Password must be between 8 and 30 characters";
//             Password.classList.add("error");
//         }

//         return isValid;
//     }

//     function validatePassword2(password, confirmPasswordValue) {
//         if (confirmPasswordValue === "") {
//             errorPassword2.innerHTML = "Confirm Password cannot be blank";
//             Password2.classList.add("error");
//             return false;
//         }

//         const isValid = password === confirmPasswordValue;

//         if (isValid) {
//             errorPassword2.innerHTML = "";
//             Password2.classList.remove("error");
//         } else {
//             errorPassword2.innerHTML = "Passwords do not match";
//             Password2.classList.add("error");
//         }

//         return isValid;
//     }

//     // Function to toggle password visibility for the first password input
//     window.changeIcon = function () {
//         if (Password.type === "password") {
//             icon.classList.replace("fa-eye-slash", "fa-eye");
//             Password.type = "text";
//         } else {
//             icon.classList.replace("fa-eye", "fa-eye-slash");
//             Password.type = "password";
//         }
//     }

//     // Function to toggle password visibility for the confirm password input
//     window.changeIcon2 = function () {
//         if (Password2.type === "password") {
//             icon2.classList.replace("fa-eye-slash", "fa-eye");
//             Password2.type = "text";
//         } else {
//             icon2.classList.replace("fa-eye", "fa-eye-slash");
//             Password2.type = "password";
//         }
//     }
// });







