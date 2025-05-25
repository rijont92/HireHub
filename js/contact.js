        // Initialize EmailJS
        (function() {
            try {
                emailjs.init("5T7gOiJsCCN0SRMsL");
            } catch (error) {
                console.error("EmailJS initialization failed:", error);
            }
        })();

        document.getElementById('contactForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form elements
            const name = document.getElementById('name');
            const email = document.getElementById('email');
            const subject = document.getElementById('subject');
            const message = document.getElementById('message');
            
            // Reset previous error states
            const errorElements = document.querySelectorAll('.error-message');
            errorElements.forEach(element => element.remove());
            
            let isValid = true;
            
            // Name validation
            if (name.value.trim() === '') {
                showError(name, 'Name is required');
                isValid = false;
            } else if (name.value.trim().length < 2) {
                showError(name, 'Name must be at least 2 characters');
                isValid = false;
            }
            
            // Email validation
            if (email.value.trim() === '') {
                showError(email, 'Email is required');
                isValid = false;
            } else if (!isValidEmail(email.value)) {
                showError(email, 'Please enter a valid email address');
                isValid = false;
            }
            
            // Subject validation
            if (subject.value.trim() === '') {
                showError(subject, 'Subject is required');
                isValid = false;
            } else if (subject.value.trim().length < 5) {
                showError(subject, 'Subject must be at least 5 characters');
                isValid = false;
            }
            
            // Message validation
            if (message.value.trim() === '') {
                showError(message, 'Message is required');
                isValid = false;
            } else if (message.value.trim().length < 10) {
                showError(message, 'Message must be at least 10 characters');
                isValid = false;
            }
            
            if (isValid) {
                // Show loading state
                const submitBtn = document.querySelector('.submit-btn');
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = 'Sending...';
                submitBtn.disabled = true;

                // Prepare email parameters
                const templateParams = {
                    from_name: name.value.trim(),
                    from_email: email.value.trim(),
                    subject: subject.value.trim(),
                    message: message.value.trim()
                };


                // Send email using EmailJS
                emailjs.send('service_nb1jn0a', 'template_9z5n9hn', templateParams)
                    .then(function(response) {
                        // Show success message
                        document.getElementById('successMessage').classList.add('active');
                        // Reset form
                        document.getElementById('contactForm').reset();
                    })
                    .catch(function(error) {
                        console.error('Email sending failed:', error);
                        // Show error message
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'error-message';
                        errorMessage.textContent = 'Failed to send message. Please try again later. Error: ' + error.text;
                        document.querySelector('.contact-form').appendChild(errorMessage);
                    })
                    .finally(function() {
                        // Reset button state
                        submitBtn.textContent = originalBtnText;
                        submitBtn.disabled = false;
                    });
            }
        });
        
        // Helper function to show error messages
        function showError(input, message) {
            const formGroup = input.parentElement;
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = message;
            formGroup.appendChild(errorElement);
            input.classList.add('error');
        }
        
        // Email validation helper function
        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        // Close success message
        document.querySelector('.close-btn').addEventListener('click', function() {
            document.getElementById('successMessage').classList.remove('active');
        });
        
        // Remove error class when user starts typing
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                this.classList.remove('error');
                const errorMessage = this.parentElement.querySelector('.error-message');
                if (errorMessage) {
                    errorMessage.remove();
                }
            });
        });




  var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
      (function(){
      var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
      s1.async=true;
      s1.src='https://embed.tawk.to/6780777649e2fd8dfe056513/1ih6t59ql';
      s1.charset='UTF-8';
      s1.setAttribute('crossorigin','*');
      s0.parentNode.insertBefore(s1,s0);
      })();