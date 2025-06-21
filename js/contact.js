import { translations, currentLanguage } from './translations.js';

        (function() {
            try {
                emailjs.init("5T7gOiJsCCN0SRMsL");
            } catch (error) {
                console.error("EmailJS initialization failed:", error);
            }
        })();

        document.getElementById('contactForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name');
            const email = document.getElementById('email');
            const subject = document.getElementById('subject');
            const message = document.getElementById('message');
            
            const errorElements = document.querySelectorAll('.error-message');
            errorElements.forEach(element => element.remove());
            
            let isValid = true;
            
            if (name.value.trim() === '') {
                showError(name, translations[currentLanguage]['error-name-required']);
                isValid = false;
            } else if (name.value.trim().length < 2) {
                showError(name, translations[currentLanguage]['error-name-length']);
                isValid = false;
            }
            
            if (email.value.trim() === '') {
                showError(email, translations[currentLanguage]['error-email-required']);
                isValid = false;
            } else if (!isValidEmail(email.value)) {
                showError(email, translations[currentLanguage]['error-email-invalid']);
                isValid = false;
            }
            
            if (subject.value.trim() === '') {
                showError(subject, translations[currentLanguage]['error-subject-required']);
                isValid = false;
            } else if (subject.value.trim().length < 5) {
                showError(subject, translations[currentLanguage]['error-subject-length']);
                isValid = false;
            }
            
            if (message.value.trim() === '') {
                showError(message, translations[currentLanguage]['error-message-required']);
                isValid = false;
            } else if (message.value.trim().length < 10) {
                showError(message, translations[currentLanguage]['error-message-length']);
                isValid = false;
            }
            
            if (isValid) {
                const submitBtn = document.querySelector('.submit-btn');
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = 'Sending...';
                submitBtn.disabled = true;

                const templateParams = {
                    from_name: name.value.trim(),
                    from_email: email.value.trim(),
                    subject: subject.value.trim(),
                    message: message.value.trim()
                };


                emailjs.send('service_nb1jn0a', 'template_9z5n9hn', templateParams)
                    .then(function(response) {
                        document.getElementById('successMessage').classList.add('active');
                        document.getElementById('contactForm').reset();
                    })
                    .catch(function(error) {
                        console.error('Email sending failed:', error);
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'error-message';
                        errorMessage.textContent = translations[currentLanguage]['error-sending-message'] + error.text;
                        document.querySelector('.contact-form').appendChild(errorMessage);
                    })
                    .finally(function() {
                        submitBtn.textContent = originalBtnText;
                        submitBtn.disabled = false;
                    });
            }
        });
        
        function showError(input, message) {
            const formGroup = input.parentElement;
            const errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = message;
            formGroup.appendChild(errorElement);
            input.classList.add('error');
        }
        
        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        document.querySelector('.close-btn').addEventListener('click', function() {
            document.getElementById('successMessage').classList.remove('active');
        });
        
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




//   var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
//       (function(){
//       var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
//       s1.async=true;
//       s1.src='https://embed.tawk.to/6780777649e2fd8dfe056513/1ih6t59ql';
//       s1.charset='UTF-8';
//       s1.setAttribute('crossorigin','*');
//       s0.parentNode.insertBefore(s1,s0);
//       })();