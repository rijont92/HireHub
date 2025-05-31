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

    // Show loading state initially
    if (accountText) {
        accountText.innerHTML = 'Loading... <i class="ri-arrow-down-s-line dropdown__arrow"></i>';
    }

    onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const userName = document.getElementById("userName");
                    const userProfileImg = document.getElementById("userProfileImg");

                    if (userName) {
                        const displayName = userData.name || 'User';
                        userName.innerHTML = `Hi, ${displayName.length > 20 ? displayName.substring(0, 20) + '...' : displayName}`;
                    }

                    if (userProfileImg) {
                        userProfileImg.src = userData.profileImage || 'img/useri.png';
                    }

                    // Show profile row and hide account text
                    if (accountText) accountText.style.display = 'none';
                    if (userProfileRow) userProfileRow.style.display = 'flex';

                    // Populate authenticated menu
                    const currentPath = window.location.pathname;
                    if (accountMenu) {
                        accountMenu.innerHTML = `
                            <li><a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/profile.html' : 'profile.html'}" class="dropdown__link"><i class="ri-user-line"></i> Profile</a></li>
                            <li><a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/settings.html' : 'settings.html'}" class="dropdown__link"><i class="ri-settings-3-line"></i> Settings</a></li>
                            <li><a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/my-jobs.html' : 'my-jobs.html'}" class="dropdown__link"><i class="ri-file-text-line"></i> My Jobs</a></li>
                            <li><a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/saved-jobs.html' : 'saved-jobs.html'}" class="dropdown__link"><i class="ri-bookmark-line"></i> Saved Jobs</a></li>
                            <li><a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/history.html' : 'history.html'}" class="dropdown__link"><i class="ri-history-line"></i> History</a></li>
                            <li><a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/dashboard.html' : 'dashboard.html'}" class="dropdown__link"><i class="ri-dashboard-line"></i> Dashboard</a></li>
                            <li><a href="#" class="dropdown__link" id="logout-btn"><i class="ri-logout-box-line"></i> Sign Out</a></li>
                        `;

                        // Add logout event listener
                        const logoutBtn = accountMenu.querySelector('#logout-btn');
                        if (logoutBtn) {
                            logoutBtn.addEventListener('click', async (e) => {
                                e.preventDefault();
                                try {
                                    await auth.signOut();
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

                        // Set active state for dropdown links
                        setActiveDropdownLink();
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        } else {
            // Show account text and hide profile row
            if (accountText) {
                accountText.innerHTML = 'Account <i class="ri-arrow-down-s-line dropdown__arrow"></i>';
                accountText.style.display = 'inline';
            }
            if (userProfileRow) userProfileRow.style.display = 'none';

            // Populate unauthenticated menu
            const currentPath = window.location.pathname;
            if (accountMenu) {
                accountMenu.innerHTML = `
                    <li><a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/login.html' : 'login.html'}" class="dropdown__link"><i class="ri-login-box-line"></i> Log In</a></li>
                    <li><a href="${currentPath.endsWith('index.html') || currentPath === '/' ? 'html/sign_up.html' : 'sign_up.html'}" class="dropdown__link"><i class="ri-user-add-line"></i> Sign Up</a></li>
                `;

                // Set active state for dropdown links
                setActiveDropdownLink();
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
