document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("form");
    const Email = document.getElementById("email");
    const Password = document.getElementById("password");
    const errorEmail = document.getElementById("error-email");
    const errorPassword = document.getElementById("error-password");
    const icon = document.getElementById("icon");

    

    // Submit event listener
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const isEmailValid = validateEmail(Email.value);
        const isPasswordValid = validatePassword(Password.value);

        if (isEmailValid && isPasswordValid) {
            window.location.href = "../index.html";
            localStorage.setItem('tahiri', 'true');
            localStorage.setItem('profileImage', "img/useri.png")
        }
    });

    // Email validation function
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

    // Password validation function
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

    // Toggle the visibility of the password and icon
    window.changeIcon = function () {
        if (Password.type === "password") {
            icon.classList.replace("fa-eye-slash", "fa-eye"); // Change icon to eye
            Password.type = "text"; // Show password
        } else {
            icon.classList.replace("fa-eye", "fa-eye-slash"); // Change icon to eye-slash
            Password.type = "password"; // Hide password
        }
    };
});








































// // Import necessary Firebase functions
// import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
// import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";

// // Firebase config
// const firebaseConfig = {
//   apiKey: "AIzaSyCePiJ0t4AjSnh_pYj0K4syZ_ATNZCfEhs",
//   authDomain: "hirehub-d7a32.firebaseapp.com",
//   projectId: "hirehub-d7a32",
//   storageBucket: "hirehub-d7a32.firebasestorage.app",
//   messagingSenderId: "709139851875",
//   appId: "1:709139851875:web:6e871ff4df6c72a3662656",
//   measurementId: "G-0VPRE8XGWC"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);

// document.addEventListener("DOMContentLoaded", function () {
//     const form = document.getElementById("form");
//     const Email = document.getElementById("email");
//     const Password = document.getElementById("password");
//     const errorEmail = document.getElementById("error-email");
//     const errorPassword = document.getElementById("error-password");
//     const icon = document.getElementById("icon");

//     // Submit event listener for login form
//     form.addEventListener("submit", function (event) {
//         event.preventDefault();

//         const isEmailValid = validateEmail(Email.value);
//         const isPasswordValid = validatePassword(Password.value);

//         if (isEmailValid && isPasswordValid) {
//             signInWithEmailAndPassword(auth, Email.value, Password.value)
//                 .then((userCredential) => {
//                     // Successfully signed in
//                     const user = userCredential.user;
//                     console.log("User logged in:", user);

//                     // Redirect to the homepage
//                     window.location.href = "../index.html";
//                     localStorage.setItem('tahiri', 'true');
//                     localStorage.setItem('profileImage', "img/useri.png");
//                 })
//                 .catch((error) => {
//                     // Handle errors here
//                     const errorCode = error.code;
//                     const errorMessage = error.message;
//                     console.log("Login error:", errorCode, errorMessage);
//                     errorPassword.innerHTML="Invalid email or password. Please try again.";
//                 });
//         }
//     });

//     // Email validation function
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

//     // Password validation function
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

//     // Toggle the visibility of the password and icon
//     window.changeIcon = function () {
//         if (Password.type === "password") {
//             icon.classList.replace("fa-eye-slash", "fa-eye");
//             Password.type = "text"; // Show password
//         } else {
//             icon.classList.replace("fa-eye", "fa-eye-slash");
//             Password.type = "password"; // Hide password
//         }
//     };
// });
