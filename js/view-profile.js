import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { createNewChat, openChat } from './chat.js';
import { translations, currentLanguage } from './translations.js';

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (!userId) {
        window.location.href = 'jobs.html';
        return;
    }

    const loadingSpinner = document.getElementById('loadingSpinner');
    const profileContent = document.querySelector('.profile-content');
    const profileImage = document.getElementById('profileImage');
    const userName3 = document.getElementById('userName3');
    const userEmail = document.getElementById('userEmail');
    const userLocation = document.getElementById('userLocation');
    const userBio = document.getElementById('userBio');
    const userPhone = document.getElementById('userPhone');
    const userWebsite = document.getElementById('userWebsite');
    const userProfession = document.getElementById('userProfession');
    const userCompany = document.getElementById('userCompany');
    const skillsList = document.getElementById('skillsList');
    const experienceList = document.getElementById('experienceList');
    const educationList = document.getElementById('educationList');
    const postedJobs = document.getElementById('postedJobs');
    const startChatBtn = document.getElementById('startChatBtn');

    // Add translation attributes to elements
    userLocation.setAttribute('data-translate', 'location-not-specified');
    userBio.setAttribute('data-translate', 'no-bio');
    userPhone.setAttribute('data-translate', 'phone-not-specified');
    userWebsite.setAttribute('data-translate', 'website-not-specified');
    userProfession.setAttribute('data-translate', 'profession-not-specified');
    userCompany.setAttribute('data-translate', 'company-not-specified');

    // Update translations when language changes
    window.addEventListener('languageChanged', () => {
        if (window.updateTranslations) {
            window.updateTranslations();
        }
    });

    // Initial translation update
    if (window.updateTranslations) {
        window.updateTranslations();
    }

    startChatBtn.addEventListener('click', async () => {
        if (!auth.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            const userData = userDoc.data();
            
            const displayName = userData.name || 'User';
            const companyName = userData.company || '';

            const chatId = await createNewChat(userId, displayName, companyName);
            if (chatId) {
                const chatWidget = document.getElementById('chatWidget');
                if (chatWidget) {
                    chatWidget.classList.add('active');
                }
                openChat(chatId, userId);
            }
        } catch (error) {
            console.error('Error starting chat:', error);
            alert('Failed to start chat. Please try again.');
        }
    });

    async function loadUserProfile() {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                window.location.href = 'jobs.html';
                return;
            }

            const userData = userDoc.data();

            profileImage.src = userData.profileImage || '../img/logo.png';
            userName3.textContent = userData.name || 'No Name';
            userEmail.textContent = userData.email || 'No Email';
            userLocation.innerHTML = userData.location || '<span data-translate="location-not-specified">Location not specified</span>';
            userBio.innerHTML = userData.bio || '<span data-translate="no-bio">No bio available</span>';
            userPhone.innerHTML = userData.phone || '<span data-translate="phone-not-specified">Phone not specified</span>';
            userWebsite.innerHTML = userData.website || '<span data-translate="website-not-specified">Website not specified</span>';
            userProfession.innerHTML = userData.title || '<span data-translate="profession-not-specified">Profession not specified</span>';
            userCompany.innerHTML = userData.company || '<span data-translate="company-not-specified">Company not specified</span>';


            if (userData.skills && userData.skills.length > 0) {
                skillsList.innerHTML = userData.skills.map(skill => `
                    <div class="skill-tag">${skill}</div>
                `).join('');
            } else {
                skillsList.innerHTML = '<p data-translate="no-skills">No skills listed</p>';
            }

            if (userData.experience && userData.experience.length > 0) {
                experienceList.innerHTML = userData.experience.map(exp => `
                    <div class="experience-item">
                        <h3>${exp.title}</h3>
                        <p class="company">${exp.company}</p>
                        <p class="duration">${exp.startDate} - ${exp.endDate || translations[currentLanguage]['present']}</p>
                        <p class="description">${exp.description}</p>
                    </div>
                `).join('');
            } else {
                experienceList.innerHTML = '<p data-translate="no-experience">No experience listed</p>';
            }

            if (userData.education && userData.education.length > 0) {
                educationList.innerHTML = userData.education.map(edu => `
                    <div class="education-item">
                        <h3>${edu.degree || translations[currentLanguage]['degree']}</h3>
                        <p class="institution">${edu.school || translations[currentLanguage]['school-university']}</p>
                        <p class="duration">${edu.startDate || ''} - ${edu.endDate || translations[currentLanguage]['present']}</p>
                        <p class="description">${edu.description || ''}</p>
                    </div>
                `).join('');
            } else {
                educationList.innerHTML = '<p data-translate="no-education">No education listed</p>';
            }

            await loadPostedJobs();

            loadingSpinner.style.display = 'none';
            profileContent.style.display = 'block';
        } catch (error) {
            console.error('Error loading user profile:', error);
            showError(translations[currentLanguage]['error-loading-profile']);
        }
    }

    async function loadPostedJobs() {
        try {
            const jobsQuery = query(
                collection(db, 'jobs'),
                where('postedBy', '==', userId)
            );

            const querySnapshot = await getDocs(jobsQuery);
            const jobs = [];

            querySnapshot.forEach((doc) => {
                jobs.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            postedJobs.innerHTML = '';

            if (jobs.length > 0) {
                jobs.forEach(job => {
                    const jobCard = createJobCard(job);
                    postedJobs.appendChild(jobCard);
                });
            } else {
                postedJobs.innerHTML = `
                    <div class="no-jobs-message">
                        <p data-translate="no-jobs-posted">No jobs posted yet</p>
                    </div>
                `;
                if (window.updateTranslations) {
                            window.updateTranslations();
                        }
            }
        } catch (error) {
            console.error('Error loading posted jobs:', error);
            postedJobs.innerHTML = `
                <div class="error-message">
                    <p data-translate="error-loading-jobs">Failed to load posted jobs</p>
                </div>
            `;
        }
    }

    function createJobCard(job) {
        const card = document.createElement('div');
        card.className = 'job-card';
        
        const jobTypeClass = job.jobType.toLowerCase().replace(/\s+/g, '-');
          const status_r = {
            "full-time": "Full Time",
            "part-time": "Part Time",
            "contract": "Contract",
            "internship": "Internship"
        }
        
        card.innerHTML = `
            <div class="job-card-content">
                <div class="job-header">
                    <div class="company-logo-wrapper">
                        <img src="${job.companyLogo || '../img/logo.png'}" alt="${job.companyName} logo" class="company-logo">
                    </div>
                </div>
                <div class="job-title-section">
                    <h3 class="job-title">${job.jobTitle}</h3>
                    <p class="company-name">${job.companyName}</p>
                    
                    <div class="job-meta-info">
                        <div class="meta-item job-type ${jobTypeClass}">
                            <i class="fas fa-briefcase"></i>
                            <span data-translate="${status_r[job.jobType]}">${status_r[job.jobType]}</span>
                        </div>
                        <div class="meta-item location">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${job.location}</span>
                        </div>
                        <div class="meta-item salary">
                            <i class="fas fa-money-bill-wave"></i>
                            <span>${job.salary}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            window.location.href = `single-job.html?id=${job.id}`;
        });

         if (window.updateTranslations) {
                            window.updateTranslations();
                        }

        return card;
    }

    function showError(message) {
        loadingSpinner.style.display = 'none';
        profileContent.innerHTML = `
            <div class="error-message">
                <h3 data-translate="error">Error</h3>
                <p>${message}</p>
            </div>
        `;
        profileContent.style.display = 'block';
        if (window.updateTranslations) {
            window.updateTranslations();
        }
    }

    loadUserProfile();
}); 