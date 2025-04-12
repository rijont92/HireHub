import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Function to update header based on auth state
function updateHeader(user) {
    const navRightt = document.querySelector('.nav-rightt');
    const navLiRight = document.querySelector('.nav-li-right');
    const noneElements = document.querySelectorAll('.nonee');
    const none2Elements = document.querySelectorAll('.none2');
    const dropdownMenu = document.querySelector('.dropdown__menu');
    
    if (user || localStorage.getItem('token')) {
        // User is logged in - show full menu
        dropdownMenu.innerHTML = `
            <li>
                <a href="#" class="dropdown__link">
                    <i class="ri-user-line"></i> Profile
                </a>                          
            </li>

            <li>
                <a href="#" class="dropdown__link">
                    <i class="ri-settings-3-line"></i> Settings
                </a>
            </li>

            <li>
                <a href="#" class="dropdown__link">
                    <i class="ri-file-text-line"></i> My Jobs
                </a>
            </li>

            <li>
                <a href="#" class="dropdown__link">
                    <i class="ri-bookmark-line"></i> Saved Jobs
                </a>
            </li>

            <li>
                <a href="#" class="dropdown__link">
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
                window.location.href = '../html/login.html';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });

        // Show elements when authenticated
        navRightt.classList.add('show');
        navLiRight.classList.add('show');
        noneElements.forEach(element => {
            element.classList.add('show');
        });
        none2Elements.forEach(element => {
            element.classList.add('show');
        });

    } else {
        // User is not logged in - show login/signup menu
        dropdownMenu.innerHTML = `
            <li>
                <a href="../html/login.html" class="dropdown__link">
                    <i class="ri-login-box-line"></i> Log In
                </a>
            </li>

            <li>
                <a href="../html/sign_up.html" class="dropdown__link">
                    <i class="ri-user-add-line"></i> Sign up
                </a>
            </li>
        `;

        // Hide elements when not authenticated
        navRightt.classList.remove('show');
        navLiRight.classList.remove('show');
        noneElements.forEach(element => {
            element.classList.remove('show');
        });
        none2Elements.forEach(element => {
            element.classList.remove('show');
        });
    }
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