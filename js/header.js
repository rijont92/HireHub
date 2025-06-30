import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"

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

function setActiveDropdownLink() {
    const currentPath = window.location.pathname;
    const dropdownLinks = document.querySelectorAll('.dropdown__link');

    dropdownLinks.forEach(link => {
        // Remove active class from all links
        link.classList.remove('active');

        const linkHref = link.getAttribute('href');
        if (!linkHref) return;

        // Get the current page name and link page name
        const currentPage = currentPath.split('/').pop() || 'index.html';
        const linkPage = linkHref.split('/').pop();

        // Check if the current page matches the link page
        if (linkPage === currentPage && !link.id.includes('logout-btn')) {
            link.classList.add('active');
        }
    });
}

// Initialize user data display
function initializeUserData() {
    const accountText = document.getElementById('accountText');
    const userProfileRow = document.getElementById('userProfileRow');
    const accountMenu = document.getElementById('accountMenu');

    // Hide menu initially until translations are ready
    if (accountMenu) {
        accountMenu.style.visibility = 'hidden';
    }

    // Apply translations before showing any content
    if (window.updateTranslations) {
        window.updateTranslations();
    }

    // Try to load from cache first
    const cachedUserData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (cachedUserData.name || cachedUserData.profileImage) {
        const userName = document.getElementById('userName');
        const userProfileImg = document.getElementById('userProfileImg');

        if (userName) {
            userName.textContent = cachedUserData.name || 'User';
        }
        if (userProfileImg) {
            userProfileImg.src = cachedUserData.profileImage || 'img/useri.png';
        }
        if (accountText) accountText.style.display = 'none';
        if (userProfileRow) userProfileRow.style.display = 'flex';
    }

    onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
            // Show profile row and hide account text
            if (userProfileRow) {
                userProfileRow.style.display = 'flex';
            }
            if (accountText) {
                accountText.style.display = 'none';
            }

            // Only fetch user data if cache is empty or user data has changed
            const lastUpdate = localStorage.getItem('userDataLastUpdate');
            const now = Date.now();
            if (!lastUpdate || (now - parseInt(lastUpdate)) > 300000) { // Update cache every 5 minutes
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const userName = document.getElementById('userName');
                        const userProfileImg = document.getElementById('userProfileImg');

                        // Update cache
                        localStorage.setItem('userData', JSON.stringify(userData));
                        localStorage.setItem('userDataLastUpdate', now.toString());

                        if (userName) {
                            userName.textContent = userData.name || 'User';
                        }
                        if (userProfileImg && userData.profileImage) {
                            userProfileImg.src = userData.profileImage;
                        }
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            }

            // Populate authenticated menu
            const currentPath = window.location.pathname;
            if (accountMenu) {
                accountMenu.innerHTML = `
                    <li>
                        <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/profile.html' : 'profile.html'}" class="dropdown__link">
                            <i class="ri-user-line"></i> <span data-translate="Profile">Profile</span>
                        </a>
                    </li>
                    <li>
                        <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/settings.html' : 'settings.html'}" class="dropdown__link">
                            <i class="ri-settings-4-line"></i> <span data-translate="Settings">Settings</span>
                        </a>
                    </li>
                    <li>
                        <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/my-jobs.html' : 'my-jobs.html'}" class="dropdown__link">
                            <i class="ri-briefcase-line"></i> <span data-translate="My Jobs">My Jobs</span>
                        </a>
                    </li>
                    <li>
                        <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/saved-jobs.html' : 'saved-jobs.html'}" class="dropdown__link">
                            <i class="ri-bookmark-line"></i> <span data-translate="Saved Jobs">Saved Jobs</span>
                        </a>
                    </li>
                    <li>
                        <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/history.html' : 'history.html'}" class="dropdown__link">
                            <i class="ri-history-line"></i> <span data-translate="History">History</span>
                        </a>
                    </li>
                    <li>
                        <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/dashboard.html' : 'dashboard.html'}" class="dropdown__link">
                            <i class="ri-dashboard-line"></i> <span data-translate="Dashboard">Dashboard</span>
                        </a>
                    </li>
                    <li>
                        <a href="#" class="dropdown__link" id="logout-btn">
                            <i class="ri-logout-box-line"></i> <span data-translate="Sign Out">Sign Out</span>
                        </a>
                    </li>
                `;

                // Apply translations after menu is populated
                if (window.updateTranslations) {
                    window.updateTranslations();
                }

                // Show menu after translations are applied
                accountMenu.style.visibility = 'visible';

                // Set active state for dropdown links
                setActiveDropdownLink();

                // Add logout functionality
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        try {
                            await auth.signOut();
                            localStorage.removeItem('userData');
                            localStorage.removeItem('userDataLastUpdate');
                            if(currentPath.endsWith('index.html') || currentPath === '/') {
                                window.location.href = 'html/login.html';
                            } else {
                                window.location.href = 'login.html';
                            }
                        } catch (error) {
                            console.error('Error signing out:', error);
                        }
                    });
                }
            }
        } else {
            // Clear cache when user is not authenticated
            localStorage.removeItem('userData');
            localStorage.removeItem('userDataLastUpdate');

            // Show account text and hide profile row
            if (accountText) {
                accountText.innerHTML = '<span data-translate="Account">Account</span> <i class="ri-arrow-down-s-line dropdown__arrow"></i>';
                accountText.style.display = 'inline';
            }
            if (userProfileRow) userProfileRow.style.display = 'none';

            // Populate unauthenticated menu
            const currentPath = window.location.pathname;
            if (accountMenu) {
                accountMenu.innerHTML = `
                    <li>
                        <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/login.html' : 'login.html'}" class="dropdown__link">
                            <i class="ri-login-box-line"></i> <span data-translate="Log In">Log In</span>
                        </a>
                    </li>
                    <li>
                        <a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/sign_up.html' : 'sign_up.html'}" class="dropdown__link">
                            <i class="ri-user-add-line"></i> <span data-translate="Sign Up">Sign Up</span>
                        </a>
                    </li>
                `;

                // Apply translations after menu is populated
                if (window.updateTranslations) {
                    window.updateTranslations();
                }

                // Show menu after translations are applied
                accountMenu.style.visibility = 'visible';
            }
        }
    });
}

// Call the initialization function
initializeUserData();

// Add event listener for dropdown menu visibility changes
document.addEventListener('click', (e) => {
    const dropdownItem = e.target.closest('.dropdown__item');
    if (dropdownItem) {
        // Wait for the dropdown menu to be visible
        setTimeout(() => {
            setActiveDropdownLink();
        }, 100);
    }
});

// Add event listener for page load to set active state
window.addEventListener('load', () => {
    setActiveDropdownLink();
});

// Make toggleLanguage function globally available
window.toggleLanguage = function() {
    const currentLang = localStorage.getItem('preferredLanguage') || 'sq';
    const newLang = currentLang === 'en' ? 'sq' : 'en';
    setLanguage(newLang);
}

function setLanguage(lang) {
    // Store the selected language
    localStorage.setItem('preferredLanguage', lang);
    
    // Update the flag
    const languageFlag = document.getElementById('languageFlag');
    if (languageFlag) {
        const currentPath = window.location.pathname;
        const isInHtmlFolder = currentPath.includes('/html/');
        const imgPath = isInHtmlFolder ? '../img/' : 'img/';
        languageFlag.src = lang === 'en' ? `${imgPath}albanian-flag.svg` : `${imgPath}uk-flag.svg`;
        languageFlag.alt = lang === 'en' ? 'English' : 'Albanian';
    }
    
    // Call the global setLanguage function from translations.js
    if (typeof window.setLanguage === 'function') {
        window.setLanguage(lang);
    }
}

// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
    const savedLanguage = localStorage.getItem('preferredLanguage') || 'en'; // Default to English
    setLanguage(savedLanguage);
});

// Function to update header name
export function updateHeaderName(newName) {
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = newName || 'User';
    }
}

// Function to update header profile image
export function updateHeaderProfileImage(newUrl) {
    const userProfileImg = document.getElementById('userProfileImg');
    if (userProfileImg) {
        userProfileImg.src = newUrl || 'img/useri.png';
    }
}
