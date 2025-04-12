const showMenu = (toggleId, navId) => {
    const toggle = document.getElementById(toggleId);
    const nav = document.getElementById(navId);
    const navRightt = document.querySelector('.nav-rightt');

    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            // Toggle the menu
            nav.classList.toggle('show-menu');
            
            // Toggle the icon
            toggle.classList.toggle('show-icon');
            
            // Toggle nav-rightt visibility
            if (navRightt) {
                navRightt.classList.toggle('show');
            }
            
            // Prevent body scroll when menu is open
            document.body.style.overflow = nav.classList.contains('show-menu') ? 'hidden' : '';
        });
    }
};

// Initialize the menu
showMenu('nav-toggle', 'nav-menu');

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const nav = document.getElementById('nav-menu');
    const toggle = document.getElementById('nav-toggle');
    const navRightt = document.querySelector('.nav-rightt');
    
    if (nav && toggle && !nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove('show-menu');
        toggle.classList.remove('show-icon');
        if (navRightt) {
            navRightt.classList.remove('show');
        }
        document.body.style.overflow = '';
    }
});

// Handle authentication state changes
function updateAuthState(isAuthenticated) {
    const navRightt = document.querySelector('.nav-rightt');
    const navLiRight = document.querySelector('.nav-li-right');
    
    if (isAuthenticated) {
        if (navRightt) {
            navRightt.classList.add('show');
        }
        if (navLiRight) {
            navLiRight.classList.add('show');
        }
    } else {
        if (navRightt) {
            navRightt.classList.remove('show');
        }
        if (navLiRight) {
            navLiRight.classList.remove('show');
        }
    }
}

// Initialize the menu state
document.addEventListener('DOMContentLoaded', () => {
    // Update all navigation links to use correct paths
    const loginLinks = document.querySelectorAll('a[href*="login.html"]');
    const signupLinks = document.querySelectorAll('a[href*="sign_up.html"]');
    
    loginLinks.forEach(link => {
        if (!link.href.includes('http')) {
            link.href = '../html/login.html';
        }
    });
    
    signupLinks.forEach(link => {
        if (!link.href.includes('http')) {
            link.href = '../html/sign_up.html';
        }
    });
});

  