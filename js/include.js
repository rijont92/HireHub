// Function to include HTML content
function includeHTML() {
    const headerElement = document.querySelector('header');
    const footerElement = document.querySelector('footer');
    
    if (headerElement) {
        fetch('../html/header.html')
            .then(response => response.text())
            .then(data => {
                headerElement.innerHTML = data;
                // Load header.js after header is inserted
                const script = document.createElement('script');
                script.src = '../js/header.js';
                document.body.appendChild(script);

                // Add active class to current page
                const currentPage = window.location.pathname.split('/').pop();
                const navLinks = document.querySelectorAll('.nav__link');
                
                navLinks.forEach(link => {
                    const linkHref = link.getAttribute('href');
                    if (linkHref && linkHref.includes(currentPage)) {
                        link.classList.add('active');
                    }
                });
            });
    }
    
    if (footerElement) {
        fetch('../html/footer.html')
            .then(response => response.text())
            .then(data => {
                footerElement.innerHTML = data;
            });
    }
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', includeHTML); 