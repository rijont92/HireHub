document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("form");
    const Email = document.getElementById("email");
    const errorEmail = document.getElementById("error-email");

    form.addEventListener("submit", function(event) {
        event.preventDefault(); // Prevent form submission

        const isEmailValid = validateEmail(Email.value);

        if (isEmailValid) {
            // Redirect to login page only if email is valid
            window.location.href = "login.html";  // Redirect to login page
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
});
