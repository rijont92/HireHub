import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

function setActiveDropdownLink() {
    const currentPath = window.location.pathname; // Get the current page path
    const dropdownLinks = document.querySelectorAll('.dropdown__link'); // Select all dropdown links

    dropdownLinks.forEach(link => {
        // Remove 'active' class from all links
        link.classList.remove('active');

        // Get the href attribute and normalize it
        const linkHref = link.getAttribute('href');
        if (!linkHref) return;

        // Get the filename from both paths
        const currentPage = currentPath.split('/').pop();
        const linkPage = linkHref.split('/').pop();

        // Check if the link's page matches the current page
        if (linkPage === currentPage && !link.id.includes('logout-btn')) {
            link.classList.add('active');
        }
    });
}

function setDropdownLinks() {
    const currentPath = window.location.pathname; // Get the current page path
    const dropdownLinks = [
        { selector: 'a[href*="profile.html"]', path: 'profile.html' },
        { selector: 'a[href*="settings.html"]', path: 'settings.html' },
        { selector: 'a[href*="my-jobs.html"]', path: 'my-jobs.html' },
        { selector: 'a[href*="saved-jobs.html"]', path: 'saved-jobs.html' },
        { selector: 'a[href*="history.html"]', path: 'history.html' }
    ];

    dropdownLinks.forEach(link => {
        const element = document.querySelector(link.selector);
        if (element) {
            // If on index.html, prepend "html/" to the path
            if (currentPath.endsWith('index.html') || currentPath === '/') {
                element.href = `html/${link.path}`;
            } else {
                element.href = link.path;
            }
        }
    });
}

// Function to update header based on auth state
function updateHeader(user) {
    const dropdownMenu = document.querySelector('.dropdown__menu');
    const currentPath = window.location.pathname; // Get the current page path

    if (user || localStorage.getItem('token')) {
        // User is logged in - show full menu
        dropdownMenu.innerHTML = `
            <li>
                <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/profile.html' : 'profile.html'}" class="dropdown__link">
                    <i class="ri-user-line"></i> Profile
                </a>                          
            </li>
            <li>
                <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/settings.html' : 'settings.html'}" class="dropdown__link">
                    <i class="ri-settings-3-line"></i> Settings
                </a>
            </li>
            <li>
                <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/my-jobs.html' : 'my-jobs.html'}" class="dropdown__link">
                    <i class="ri-file-text-line"></i> My Jobs
                </a>
            </li>
            <li>
                <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/saved-jobs.html' : 'saved-jobs.html'}" class="dropdown__link">
                    <i class="ri-bookmark-line"></i> Saved Jobs
                </a>
            </li>
            <li>
                <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/history.html' : 'history.html'}" class="dropdown__link">
                    <i class="ri-history-line"></i> History
                </a>
            </li>
            <li>
                <a href="#" class="dropdown__link" id="logout-btn">
                    <i class="ri-logout-box-line"></i> Log Out
                </a>
            </li>
        `;

        // Add logout functionality
        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                if (auth.currentUser) {
                    await auth.signOut();
                }
                localStorage.removeItem('token');
                localStorage.setItem("isAuthenticated", "false");
                window.location.href = '../html/login.html';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });

        // Set the correct href paths for dropdown links
        setDropdownLinks();
    } else {
        // User is not logged in - show login/signup menu
        dropdownMenu.innerHTML = `
            <li>
                <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/login.html' : 'login.html'}" class="dropdown__link">
                    <i class="ri-login-box-line"></i> Log In
                </a>
            </li>
            <li>
                <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/sign_up.html' : 'sign_up.html'}" class="dropdown__link">
                    <i class="ri-user-add-line"></i> Sign up
                </a>
            </li>
        `;
    }

    // Call the function to set the active class
    setActiveDropdownLink();
}

// Listen for auth state changes
function initAuthState() {
    // Initial check
    updateHeader(auth.currentUser);

    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
        updateHeader(user);
    });
}

// Initialize auth state
initAuthState();

// Export functions if needed
window.logOut = () => {
    localStorage.removeItem('token');
    updateHeader(null);
    window.location.href = '../html/login.html';
};

export { initAuthState };