import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function() {
    // Get user ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (!userId) {
        window.location.href = 'jobs.html';
        return;
    }

    // Get DOM elements
    const loadingSpinner = document.getElementById('loadingSpinner');
    const profileContent = document.querySelector('.profile-content');
    const profileImage = document.getElementById('profileImage');
    const userName = document.getElementById('userName');
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

    // Load user profile
    async function loadUserProfile() {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                window.location.href = 'jobs.html';
                return;
            }

            const userData = userDoc.data();

            // Update profile information
            profileImage.src = userData.profileImage || '../img/logo.png';
            userName.textContent = userData.name || 'No Name';
            userEmail.textContent = userData.email || 'No Email';
            userLocation.textContent = userData.location || 'Location not specified';
            userBio.textContent = userData.bio || 'No bio available';
            userPhone.textContent = userData.phone || 'Phone not specified';
            userWebsite.textContent = userData.website || 'Website not specified';
            userProfession.textContent = userData.title || 'Profession not specified';
            userCompany.textContent = userData.company || 'Company not specified';

            // Update skills
            if (userData.skills && userData.skills.length > 0) {
                skillsList.innerHTML = userData.skills.map(skill => `
                    <div class="skill-tag">${skill}</div>
                `).join('');
            } else {
                skillsList.innerHTML = '<p>No skills listed</p>';
            }

            // Update experience
            if (userData.experience && userData.experience.length > 0) {
                experienceList.innerHTML = userData.experience.map(exp => `
                    <div class="experience-item">
                        <h3>${exp.title}</h3>
                        <p class="company">${exp.company}</p>
                        <p class="duration">${exp.startDate} - ${exp.endDate || 'Present'}</p>
                        <p class="description">${exp.description}</p>
                    </div>
                `).join('');
            } else {
                experienceList.innerHTML = '<p>No experience listed</p>';
            }

            // Update education
            if (userData.education && userData.education.length > 0) {
                educationList.innerHTML = userData.education.map(edu => `
                    <div class="education-item">
                        <h3>${edu.degree}</h3>
                        <p class="institution">${edu.institution}</p>
                        <p class="duration">${edu.startDate} - ${edu.endDate || 'Present'}</p>
                        <p class="description">${edu.description || ''}</p>
                    </div>
                `).join('');
            } else {
                educationList.innerHTML = '<p>No education listed</p>';
            }

            // Load posted jobs
            await loadPostedJobs();

            // Hide loading spinner and show content
            loadingSpinner.style.display = 'none';
            profileContent.style.display = 'block';
        } catch (error) {
            console.error('Error loading user profile:', error);
            showError('Failed to load user profile');
        }
    }

    // Load posted jobs
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

            // Clear existing content
            postedJobs.innerHTML = '';

            if (jobs.length > 0) {
                jobs.forEach(job => {
                    const jobCard = createJobCard(job);
                    postedJobs.appendChild(jobCard);
                });
            } else {
                postedJobs.innerHTML = `
                    <div class="no-jobs-message">
                        <p>No jobs posted yet</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading posted jobs:', error);
            postedJobs.innerHTML = `
                <div class="error-message">
                    <p>Failed to load posted jobs</p>
                </div>
            `;
        }
    }

    // Create job card
    function createJobCard(job) {
        const card = document.createElement('div');
        card.className = 'job-card';
        
        const jobTypeClass = job.jobType.toLowerCase().replace(/\s+/g, '-');
        
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
                            <span>${job.jobType}</span>
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

        // Add click event to the card
        card.addEventListener('click', () => {
            window.location.href = `single-job.html?id=${job.id}`;
        });

        return card;
    }

    // Show error message
    function showError(message) {
        loadingSpinner.style.display = 'none';
        profileContent.innerHTML = `
            <div class="error-message">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
        profileContent.style.display = 'block';
    }

    // Initialize
    loadUserProfile();
}); 