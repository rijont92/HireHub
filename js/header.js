const showMenu = (toggleId, navId) => {
    const toggle = document.getElementById(toggleId);
    const nav = document.getElementById(navId);
    const navRightt = document.querySelector('.nav-rightt');

    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('show-menu');
            
            toggle.classList.toggle('show-icon');
            
            if (navRightt) {
                navRightt.classList.toggle('show');
            }
            
            document.body.style.overflow = nav.classList.contains('show-menu') ? 'hidden' : '';
        });
    }
};

showMenu('nav-toggle', 'nav-menu');

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

document.addEventListener('DOMContentLoaded', () => {
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

  