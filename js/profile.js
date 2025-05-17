import { auth, db } from './firebase-config.js';
import { doc, updateDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { arrayRemove, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const profileImage = document.getElementById('profileImage');
    const editProfilePic = document.querySelector('.edit-profile-pic');
    const editProfileBtn = document.querySelector('.edit-profile-btn');
    const editAboutBtn = document.querySelector('.edit-about-btn');
    const editSkillsBtn = document.querySelector('.edit-skills-btn');
    const editExperienceBtn = document.querySelector('.edit-experience-btn');
    const editEducationBtn = document.querySelector('.edit-education-btn');
    
    const modals = {
        profile: document.getElementById('editProfileModal'),
        about: document.getElementById('editAboutModal'),
        skills: document.getElementById('editSkillsModal'),
        experience: document.getElementById('editExperienceModal'),
        education: document.getElementById('editEducationModal')
    };

    const forms = {
        profile: document.getElementById('editProfileForm'),
        about: document.getElementById('editAboutForm'),
        skills: document.getElementById('editSkillsForm'),
        experience: document.getElementById('editExperienceForm'),
        education: document.getElementById('editEducationForm')
    };

    const closeButtons = document.querySelectorAll('.close-modal');
    const cancelButtons = document.querySelectorAll('.cancel-btn');
    const themeColorInput = document.getElementById('themeColor');

    // Default theme color (matching other pages)
    const defaultThemeColor = '#755ea3';

    // Check if user is authenticated
    if (localStorage.getItem('isAuthenticated') !== 'true') {
        window.location.href = '/html/login.html';
        return;
    }

    // Get user data from localStorage
    let userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    // Set up auth state listener and Firestore real-time listener
    let unsubscribeFirestore;
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            
            // Set up real-time listener for Firestore changes
            const userRef = doc(db, 'users', user.uid);
            
            // First, get the latest data from Firestore
            getDoc(userRef).then((docSnapshot) => {
                if (docSnapshot.exists()) {
                    const firestoreData = docSnapshot.data();
                    
                    // Update userData with Firestore data
                    userData = { ...userData, ...firestoreData };
                    
                    // Update localStorage
                    localStorage.setItem('userData', JSON.stringify(userData));
                    
                    // Update UI
                    updateProfileDisplay();
                }
            }).catch(error => {
                console.error("Error fetching initial user data:", error);
            });
            
            // Set up real-time listener
            unsubscribeFirestore = onSnapshot(userRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const firestoreData = docSnapshot.data();
                    
                    // Update userData with Firestore data
                    userData = { ...userData, ...firestoreData };
                    
                    // Update localStorage
                    localStorage.setItem('userData', JSON.stringify(userData));
                    
                    // Update UI
                    updateProfileDisplay();
                }
            }, (error) => {
                console.error("Error listening to Firestore changes:", error);
            });
        } else {
            window.location.href = '/html/login.html';
        }
    });

    // Function to update theme color
    function updateThemeColor(color) {
        // If no color is provided, use the default color #755ea3
        const themeColor = color || '#755ea3';
        
        // Update CSS variable
        document.documentElement.style.setProperty('--primary-color', themeColor);
        
        // Update profile banner
        const profileBanner = document.querySelector('.profile-banner');
        if (profileBanner) {
            profileBanner.style.background = `var(--primary-color)`;
            profileBanner.style.backgroundColor = `var(--primary-color)`;
        }

        // Update user name
        const userName = document.getElementById('userName');
        if (userName) {
            userName.style.color = `var(--primary-color)`;
        }

        // Update profile section headings
        const profileHeadings = document.querySelectorAll('.profile-section h2');
        profileHeadings.forEach(heading => {
            heading.style.color = `var(--primary-color)`;
        });

        // Update other profile-specific elements with specific colors
        const profileElements = document.querySelectorAll(`
            .profile-info .title,
            .profile-info .location,
            .profile-info .email,
            .profile-info .bio,
            .profile-info .skill-tag,
            .profile-info .experience-item h3,
            .profile-info .education-item h3,
            .profile-info .tab-btn,
            .profile-info .edit-profile-btn,
            .profile-info .save-btn,
            .profile-info .add-experience,
            .profile-info .add-education
        `);

        profileElements.forEach(el => {
            if (el.classList.contains('skill-tag')) {
                el.style.borderColor = `var(--primary-color)`;
                el.style.color = `var(--primary-color)`;
            } else if (el.classList.contains('tab-btn') && !el.classList.contains('active')) {
                el.style.borderBottomColor = `var(--primary-color)`;
                el.style.color = `var(--primary-color)`;
            } else if (el.classList.contains('edit-profile-btn') || 
                      el.classList.contains('save-btn') || 
                      el.classList.contains('add-experience') || 
                      el.classList.contains('add-education')) {
                el.style.backgroundColor = `var(--primary-color)`;
                el.style.color = '#ffffff';
            } else {
                el.style.color = `var(--primary-color)`;
            }
        });

        // Update modal elements
        const modalElements = document.querySelectorAll(`
            .modal-content h2,
            .modal-content .save-btn,
            .modal-content .add-experience,
            .modal-content .add-education
        `);

        modalElements.forEach(el => {
            if (el.classList.contains('save-btn') || 
                el.classList.contains('add-experience') || 
                el.classList.contains('add-education')) {
                el.style.backgroundColor = `var(--primary-color)`;
                el.style.color = '#ffffff';
            } else {
                el.style.color = `var(--primary-color)`;
            }
        });
    }

    // Function to open modal
    function openModal(modalType) {
        const modal = modals[modalType];
        if (!modal) return;

        // Populate form with current data
        switch (modalType) {
            case 'profile':
                const editName = document.getElementById('editName');
                const editTitle = document.getElementById('editTitle');
                const editLocation = document.getElementById('editLocation');
                const themeColorInput = document.getElementById('themeColor');
                const editCompany = document.getElementById('editCompany');
                const editPhone = document.getElementById('editPhone');
                const editWebsite = document.getElementById('editWebsite');
                
                if (editName) editName.value = userData.name || '';
                if (editTitle) editTitle.value = userData.title || '';
                if (editLocation) editLocation.value = userData.location || '';
                if (themeColorInput) themeColorInput.value = userData.themeColor || defaultThemeColor;
                if (editCompany) editCompany.value = userData.company || '';
                if (editPhone) editPhone.value = userData.phone || '';
                if (editWebsite) editWebsite.value = userData.website || '';
                break;
            case 'about':
                const editBio = document.getElementById('editBio');
                if (editBio) editBio.value = userData.bio || '';
                break;
            case 'skills':
                const skillsContainer = document.getElementById('skillsContainer');
                if (skillsContainer) {
                    skillsContainer.innerHTML = '';
                    if (userData.skills && userData.skills.length > 0) {
                        userData.skills.forEach(skill => {
                            const entry = document.createElement('div');
                            entry.innerHTML = skillTemplate;
                            skillsContainer.appendChild(entry);
                            entry.querySelector('[name="skill"]').value = skill;
                        });
                    } else {
                        const entry = document.createElement('div');
                        entry.innerHTML = skillTemplate;
                        skillsContainer.appendChild(entry);
                    }
                }
                break;
            case 'experience':
                const experienceContainer = document.getElementById('experienceContainer');
                if (experienceContainer) {
                    experienceContainer.innerHTML = '';
                    if (userData.experience && userData.experience.length > 0) {
                        userData.experience.forEach(exp => {
                            addExperienceEntry(exp);
                        });
                    } else {
                        addExperienceEntry();
                    }
                }
                break;
            case 'education':
                const educationContainer = document.getElementById('educationContainer');
                if (educationContainer) {
                    educationContainer.innerHTML = '';
                    if (userData.education && userData.education.length > 0) {
                        userData.education.forEach(edu => {
                            addEducationEntry(edu);
                        });
                    } else {
                        addEducationEntry();
                    }
                }
                break;
        }

        modal.style.display = 'block';
    }

    // Function to close modal
    function closeModal(modalType) {
        const modal = modals[modalType];
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Function to close all modals
    function closeAllModals() {
        Object.values(modals).forEach(modal => {
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Add event listeners for edit buttons
    editProfileBtn.addEventListener('click', () => openModal('profile'));
    editAboutBtn.addEventListener('click', () => openModal('about'));
    editSkillsBtn.addEventListener('click', () => openModal('skills'));
    editExperienceBtn.addEventListener('click', () => openModal('experience'));
    editEducationBtn.addEventListener('click', () => openModal('education'));

    // Add event listeners for close buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Add event listeners for cancel buttons
    cancelButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Add event listener for clicking outside modals
    window.addEventListener('click', (e) => {
        Object.values(modals).forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Handle form submissions
    const editProfileForm = document.getElementById('editProfileForm');
    const editAboutForm = document.getElementById('editAboutForm');
    const editSkillsForm = document.getElementById('editSkillsForm');
    const editExperienceForm = document.getElementById('editExperienceForm');
    const editEducationForm = document.getElementById('editEducationForm');

    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('editName').value;
            const title = document.getElementById('editTitle').value;
            const location = document.getElementById('editLocation').value;
            const themeColor = document.getElementById('themeColor').value;
            const company = document.getElementById('editCompany').value;
            const phone = document.getElementById('editPhone').value;
            const website = document.getElementById('editWebsite').value;

            // Update userData object
            userData.name = name;
            userData.title = title;
            userData.location = location;
            userData.themeColor = themeColor;
            userData.company = company || 'Company not specified';
            userData.phone = phone || 'Phone not specified';
            userData.website = website || 'Website not specified';

            try {
                // Update Firestore
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    name: name,
                    title: title,
                    location: location,
                    themeColor: themeColor,
                    company: company || 'Company not specified',
                    phone: phone || 'Phone not specified',
                    website: website || 'Website not specified'
                });

                // Update localStorage
                localStorage.setItem('userData', JSON.stringify(userData));
                
                // Update UI
                updateProfileDisplay();
                closeModal('profile');
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('Error updating profile. Please try again.');
            }
        });
    }

    if (editAboutForm) {
        editAboutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const bio = document.getElementById('editBio').value;

            // Update userData object
            userData.bio = bio;

            try {
                // Update Firestore
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    bio: bio
                });

                // Update localStorage
                localStorage.setItem('userData', JSON.stringify(userData));
                
                // Update UI
                updateProfileDisplay();
                closeModal('about');
            } catch (error) {
                console.error('Error updating bio:', error);
                alert('Error updating bio. Please try again.');
            }
        });
    }

    if (editSkillsForm) {
        editSkillsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const skills = Array.from(document.querySelectorAll('[name="skill"]'))
                .map(input => input.value)
                .filter(skill => skill.trim() !== '');

            // Update userData object
            userData.skills = skills;

            try {
                // Update Firestore
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    skills: skills
                });

                // Update localStorage
                localStorage.setItem('userData', JSON.stringify(userData));
                
                // Update UI
                updateProfileDisplay();
                closeModal('skills');
            } catch (error) {
                console.error('Error updating skills:', error);
                alert('Error updating skills. Please try again.');
            }
        });
    }

    if (editExperienceForm) {
        editExperienceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const experienceEntries = Array.from(document.querySelectorAll('.experience-entry'));
            const experience = experienceEntries.map(entry => {
                const currentJob = entry.querySelector('.current-job').checked;
                return {
                    title: entry.querySelector('[name="jobTitle"]').value,
                    company: entry.querySelector('[name="company"]').value,
                    location: entry.querySelector('[name="jobLocation"]').value,
                    startDate: entry.querySelector('[name="startDate"]').value,
                    endDate: currentJob ? null : entry.querySelector('[name="endDate"]').value,
                    description: entry.querySelector('[name="jobDescription"]').value
                };
            }).filter(exp => exp.title && exp.company); // Only include entries with at least title and company

            // Update userData object
            userData.experience = experience;

            try {
                // Update Firestore
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    experience: experience
                });

                // Update localStorage
                localStorage.setItem('userData', JSON.stringify(userData));
                
                // Update UI
                updateProfileDisplay();
                closeModal('experience');
            } catch (error) {
                console.error('Error updating experience:', error);
                alert('Error updating experience. Please try again.');
            }
        });
    }

    if (editEducationForm) {
        editEducationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const educationEntries = Array.from(document.querySelectorAll('.education-entry'));
            const education = educationEntries.map(entry => {
                const currentlyStudying = entry.querySelector('.current-study').checked;
                return {
                    school: entry.querySelector('[name="school"]').value,
                    degree: entry.querySelector('[name="degree"]').value,
                    field: entry.querySelector('[name="field"]').value,
                    startDate: entry.querySelector('[name="eduStartDate"]').value,
                    endDate: currentlyStudying ? null : entry.querySelector('[name="eduEndDate"]').value,
                    description: entry.querySelector('[name="eduDescription"]').value
                };
            }).filter(edu => edu.school && edu.degree); // Only include entries with at least school and degree

            // Update userData object
            userData.education = education;

            try {
                // Update Firestore
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    education: education
                });

                // Update localStorage
                localStorage.setItem('userData', JSON.stringify(userData));
                
                // Update UI
                updateProfileDisplay();
                closeModal('education');
            } catch (error) {
                console.error('Error updating education:', error);
                alert('Error updating education. Please try again.');
            }
        });
    }

    // Function to update profile information
    function updateProfileDisplay() {
        // Update profile information
        document.getElementById('userName').textContent = userData.name || 'User Name';
        document.getElementById('userTitle').textContent = userData.title || 'Professional Title';
        document.getElementById('userLocation').textContent = userData.location || 'Location';
        document.getElementById('userEmail').textContent = userData.email || 'Email';
        document.getElementById('userCompany').textContent = userData.company || 'Company not specified';
        document.getElementById('userPhone').textContent = userData.phone || 'Phone not specified';
        document.getElementById('userWebsite').textContent = userData.website || 'Website not specified';

        // Update profile picture if exists
        if (userData.profileImage) {
            document.getElementById('profileImage').src = userData.profileImage;
        }

        // Update skills
        const skillsList = document.getElementById('skillsList');
        if (userData.skills && userData.skills.length > 0) {
            skillsList.innerHTML = userData.skills
                .map(skill => `<span class="skill-tag">${skill}</span>`)
                .join('');
        } else {
            skillsList.innerHTML = '<p>No skills added yet</p>';
        }

        // Update experience
        const experienceList = document.getElementById('experienceList');
        if (userData.experience && userData.experience.length > 0) {
            experienceList.innerHTML = userData.experience
                .map(exp => `
                    <div class="experience-item">
                        <h3>${exp.title}</h3>
                        <p class="company">${exp.company}</p>
                        <p class="duration">${exp.startDate} - ${exp.endDate || 'Present'}</p>
                        <p class="description">${exp.description}</p>
                    </div>
                `)
                .join('');
        } else {
            experienceList.innerHTML = '<p>No experience added yet</p>';
        }

        // Update education
        const educationList = document.getElementById('educationList');
        if (userData.education && userData.education.length > 0) {
            educationList.innerHTML = userData.education
                .map(edu => `
                    <div class="education-item">
                        <h3>${edu.degree}</h3>
                        <p class="institution">${edu.school}</p>
                        <p class="duration">${edu.startDate} - ${edu.endDate || 'Present'}</p>
                    </div>
                `)
                .join('');
        } else {
            educationList.innerHTML = '<p>No education added yet</p>';
        }

        // Update theme color
        const themeColor = userData.themeColor || defaultThemeColor;
        updateThemeColor(themeColor);

        // Fetch and display applied jobs
        fetchAppliedJobs();
    }

    // Function to fetch and display applied jobs
    async function fetchAppliedJobs() {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const applicationsRef = collection(db, 'applications');
            const q = query(applicationsRef, where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);
            
            const applications = [];
            querySnapshot.forEach((doc) => {
                applications.push({ id: doc.id, ...doc.data() });
            });

            // Get the jobs list container
            const appliedJobsContainer = document.getElementById('appliedJobs');
            if (!appliedJobsContainer) return;

            if (applications.length === 0) {
                appliedJobsContainer.innerHTML = `
                    <div class="no-jobs-message">
                        <i class="fas fa-file-alt"></i>
                        <h3>No Applications Yet</h3>
                        <p>You haven't applied to any jobs yet.</p>
                    </div>
                `;
                return;
            }

            // Fetch job details for each application
            const jobsPromises = applications.map(async (application) => {
                const jobRef = doc(db, 'jobs', application.jobId);
                const jobDoc = await getDoc(jobRef);
                if (jobDoc.exists()) {
                    return {
                        ...jobDoc.data(),
                        applicationId: application.id,
                        status: application.status,
                        appliedAt: application.appliedAt
                    };
                }
                return null;
            });

            const jobs = (await Promise.all(jobsPromises)).filter(job => job !== null);

            // Display the jobs
            appliedJobsContainer.innerHTML = jobs.map(job => `
                <div class="job-card">
                    <div class="job-header">
                        <h3>${job.jobTitle}</h3>
                        <span class="status ${job.status}">${job.status}</span>
                    </div>
                    <div class="job-details">
                        <p><strong>Company:</strong> ${job.companyName}</p>
                        <p><strong>Location:</strong> ${job.location}</p>
                        <p><strong>Applied on:</strong> ${new Date(job.appliedAt).toLocaleDateString()}</p>
                    </div>
                    <div class="job-actions">
                        <a href="single-job.html?id=${job.id}" class="view-job-btn">View Job</a>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error fetching applied jobs:', error);
            const appliedJobsContainer = document.getElementById('appliedJobs');
            if (appliedJobsContainer) {
                appliedJobsContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>Error Loading Applications</h3>
                        <p>There was an error loading your job applications. Please try again later.</p>
                    </div>
                `;
            }
        }
    }

    // Function to fetch and display saved jobs
    async function fetchSavedJobs() {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) return;

            const savedJobs = userDoc.data().savedJobs || [];
            const savedJobsContainer = document.getElementById('savedJobs');
            if (!savedJobsContainer) return;

            if (savedJobs.length === 0) {
                savedJobsContainer.innerHTML = `
                    <div class="no-jobs-message">
                        <i class="fas fa-bookmark"></i>
                        <h3>No Saved Jobs</h3>
                        <p>You haven't saved any jobs yet.</p>
                    </div>
                `;
                return;
            }

            // Fetch job details for each saved job
            const jobsPromises = savedJobs.map(async (jobId) => {
                const jobRef = doc(db, 'jobs', jobId);
                const jobDoc = await getDoc(jobRef);
                if (jobDoc.exists()) {
                    return {
                        ...jobDoc.data(),
                        id: jobId
                    };
                }
                return null;
            });

            const jobs = (await Promise.all(jobsPromises)).filter(job => job !== null);

            // Display the jobs
            savedJobsContainer.innerHTML = jobs.map(job => `
                <div class="job-card">
                    <div class="job-header">
                        <h3>${job.jobTitle}</h3>
                        ${job.status === 'closed' ? '<span class="status closed">Closed</span>' : ''}
                    </div>
                    <div class="job-details">
                        <p><strong>Company:</strong> ${job.companyName}</p>
                        <p><strong>Location:</strong> ${job.location}</p>
                        <p><strong>Type:</strong> ${job.jobType}</p>
                        <p><strong>Salary:</strong> ${job.salary}</p>
                    </div>
                    <div class="job-actions">
                        <a href="single-job.html?id=${job.id}" class="view-job-btn">View Job</a>
                        <button class="unsave-btn" data-job-id="${job.id}">
                            <i class="fas fa-bookmark"></i> Unsave
                        </button>
                    </div>
                </div>
            `).join('');

            // Add event listeners to unsave buttons
            const unsaveButtons = savedJobsContainer.querySelectorAll('.unsave-btn');
            unsaveButtons.forEach(button => {
                button.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const jobId = button.dataset.jobId;
                    await toggleSaveJob(jobId);
                    // Refresh the saved jobs list
                    fetchSavedJobs();
                });
            });
        } catch (error) {
            console.error('Error fetching saved jobs:', error);
            const savedJobsContainer = document.getElementById('savedJobs');
            if (savedJobsContainer) {
                savedJobsContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>Error Loading Saved Jobs</h3>
                        <p>There was an error loading your saved jobs. Please try again later.</p>
                    </div>
                `;
            }
        }
    }

    // Function to toggle save job
    async function toggleSaveJob(jobId) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const savedJobs = userData.savedJobs || [];
                
                if (savedJobs.includes(jobId)) {
                    await updateDoc(userRef, {
                        savedJobs: arrayRemove(jobId)
                    });
                } else {
                    await updateDoc(userRef, {
                        savedJobs: arrayUnion(jobId)
                    });
                }
            }
        } catch (error) {
            console.error('Error toggling save job:', error);
        }
    }

    // Add tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const jobLists = document.querySelectorAll('.jobs-list');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Show/hide job lists
            const tab = button.dataset.tab;
            jobLists.forEach(list => {
                if (list.id === `${tab}Jobs`) {
                    list.classList.remove('hidden');
                } else {
                    list.classList.add('hidden');
                }
            });

            // Load appropriate jobs
            if (tab === 'applied') {
                fetchAppliedJobs();
            } else if (tab === 'saved') {
                fetchSavedJobs();
            }
        });
    });

    // Initialize profile display
    updateProfileDisplay();

    // Initialize theme color
    function initializeThemeColor() {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const themeColor = userData.themeColor || '#755ea3';
        updateThemeColor(themeColor);
    }

    // Call initializeThemeColor when the page loads
    initializeThemeColor();

    // Update theme color when user changes it
    document.getElementById('themeColor')?.addEventListener('input', async (e) => {
        const color = e.target.value;
        updateThemeColor(color);

        try {
            // Update Firestore
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
                themeColor: color
            });

            // Update localStorage
            userData.themeColor = color;
            localStorage.setItem('userData', JSON.stringify(userData));
        } catch (error) {
            console.error('Error saving theme color:', error);
        }
    });

    // Add experience entry
    function addExperienceEntry(data = {}) {
        const container = document.getElementById('experienceContainer');
        const entry = document.createElement('div');
        entry.className = 'experience-entry';
        entry.innerHTML = `
            <div class="form-group">
                <input type="text" name="jobTitle" placeholder="Job Title" value="${data.title || ''}" required>
            </div>
            <div class="form-group">
                <input type="text" name="company" placeholder="Company" value="${data.company || ''}" required>
            </div>
            <div class="form-group">
                <input type="text" name="jobLocation" placeholder="Location" value="${data.location || ''}">
            </div>
            <div class="form-group">
                <input type="date" name="startDate" placeholder="Start Date" value="${data.startDate || ''}" required>
            </div>
            <div class="form-group">
                <input type="date" name="endDate" placeholder="End Date" value="${data.endDate || ''}">
                <div class="checkbox-group">
                    <input type="checkbox" name="currentJob" class="current-job">
                    <label>I currently work here</label>
                </div>
            </div>
            <div class="form-group">
                <textarea name="jobDescription" placeholder="Description">${data.description || ''}</textarea>
            </div>
            <button type="button" class="remove-experience">Remove</button>
        `;

        // Add event listener for current job checkbox
        const currentJobCheckbox = entry.querySelector('.current-job');
        const endDateInput = entry.querySelector('[name="endDate"]');
        
        currentJobCheckbox.addEventListener('change', () => {
            endDateInput.disabled = currentJobCheckbox.checked;
            if (currentJobCheckbox.checked) {
                endDateInput.value = '';
            }
        });

        // Add event listener for remove button
        entry.querySelector('.remove-experience').addEventListener('click', () => {
            entry.remove();
        });

        container.appendChild(entry);
    }

    // Add education entry
    function addEducationEntry(data = {}) {
        const container = document.getElementById('educationContainer');
        const entry = document.createElement('div');
        entry.className = 'education-entry';
        entry.innerHTML = `
            <div class="form-group">
                <input type="text" name="school" placeholder="School/University" value="${data.school || ''}" required>
            </div>
            <div class="form-group">
                <input type="text" name="degree" placeholder="Degree" value="${data.degree || ''}" required>
            </div>
            <div class="form-group">
                <input type="text" name="field" placeholder="Field of Study" value="${data.field || ''}">
            </div>
            <div class="form-group">
                <input type="date" name="eduStartDate" placeholder="Start Date" value="${data.startDate || ''}" required>
            </div>
            <div class="form-group">
                <input type="date" name="eduEndDate" placeholder="End Date" value="${data.endDate || ''}">
                <div class="checkbox-group">
                    <input type="checkbox" name="currentlyStudying" class="current-study">
                    <label>I am currently studying here</label>
                </div>
            </div>
            <div class="form-group">
                <textarea name="eduDescription" placeholder="Description">${data.description || ''}</textarea>
            </div>
            <button type="button" class="remove-education">Remove</button>
        `;

        // Add event listener for currently studying checkbox
        const currentStudyCheckbox = entry.querySelector('.current-study');
        const endDateInput = entry.querySelector('[name="eduEndDate"]');
        
        currentStudyCheckbox.addEventListener('change', () => {
            endDateInput.disabled = currentStudyCheckbox.checked;
            if (currentStudyCheckbox.checked) {
                endDateInput.value = '';
            }
        });

        // Add event listener for remove button
        entry.querySelector('.remove-education').addEventListener('click', () => {
            entry.remove();
        });

        container.appendChild(entry);
    }

    // Add event listeners for add buttons
    document.querySelector('.add-experience')?.addEventListener('click', () => {
        addExperienceEntry();
    });

    document.querySelector('.add-education')?.addEventListener('click', () => {
        addEducationEntry();
    });

    // Function to show popup notification
    function showNotification(message, type = 'success') {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.popup-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `popup-notification ${type}`;
        
        // Add icon based on type
        const icon = type === 'success' ? '✓' : '✕';
        
        notification.innerHTML = `
            <i>${icon}</i>
            <span class="message">${message}</span>
        `;

        // Add to document
        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Profile picture upload functionality
    editProfilePic.addEventListener('click', () => {
        // Create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        // For mobile devices, use the camera
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            input.capture = 'environment';
        }
        
        // Hide the input but keep it in the DOM
        input.style.display = 'none';
        input.style.position = 'absolute';
        input.style.opacity = '0';
        input.style.width = '100%';
        input.style.height = '100%';
        input.style.top = '0';
        input.style.left = '0';
        input.style.cursor = 'pointer';
        
        // Add the input to the document
        document.body.appendChild(input);
        
        // Trigger the file input click
        setTimeout(() => {
            input.click();
        }, 100);
        
        // Handle file selection
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    // Show loading indicator
                    const loadingIndicator = document.createElement('div');
                    loadingIndicator.className = 'loading-indicator';
                    loadingIndicator.innerHTML = 'Uploading image...';
                    document.body.appendChild(loadingIndicator);
                    
                    // Check file size and type
                    if (file.size > 10 * 1024 * 1024) {
                        throw new Error('File size too large. Please select an image under 10MB.');
                    }
                    
                    if (!file.type.match('image.*')) {
                        throw new Error('Please select an image file.');
                    }
                    
                    // Convert file to base64 with compression
                    const reader = new FileReader();
                    
                    reader.onload = async (e) => {
                        try {
                            // Create an image element to get dimensions
                            const img = new Image();
                            img.src = e.target.result;
                            
                            img.onload = async () => {
                                // Create a canvas to compress the image
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                
                                // Calculate new dimensions while maintaining aspect ratio
                                let width = img.width;
                                let height = img.height;
                                
                                // Max dimensions for profile image
                                const maxDimension = 800;
                                
                                if (width > height && width > maxDimension) {
                                    height = Math.round((height * maxDimension) / width);
                                    width = maxDimension;
                                } else if (height > maxDimension) {
                                    width = Math.round((width * maxDimension) / height);
                                    height = maxDimension;
                                }
                                
                                // Set canvas dimensions
                                canvas.width = width;
                                canvas.height = height;
                                
                                // Draw the image on the canvas
                                ctx.drawImage(img, 0, 0, width, height);
                                
                                // Get the compressed image as base64
                                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                                
                                // Check if the compressed image is still too large
                                const estimatedSize = Math.ceil(compressedBase64.length * 0.75);
                                
                                if (estimatedSize > 900000) {
                                    throw new Error('Image is still too large after compression. Please try a smaller image.');
                                }
                                
                                // Update profile image in UI
                                profileImage.src = compressedBase64;
                                
                                // Update userData in localStorage
                                userData.profileImage = compressedBase64;
                                localStorage.setItem('userData', JSON.stringify(userData));
                                
                                // Update Firestore
                                const userRef = doc(db, 'users', auth.currentUser.uid);
                                await updateDoc(userRef, {
                                    profileImage: compressedBase64
                                });
                                
                                // Remove loading indicator
                                loadingIndicator.remove();
                                
                                // Show success notification
                                showNotification('Profile picture updated successfully!', 'success');
                            };
                            
                            img.onerror = () => {
                                throw new Error('Error loading image for compression.');
                            };
                        } catch (error) {
                            console.error('Error processing image:', error);
                            loadingIndicator.remove();
                            showNotification(error.message, 'error');
                        }
                    };
                    
                    reader.onerror = () => {
                        console.error('Error reading file');
                        loadingIndicator.remove();
                        showNotification('Error reading file. Please try again.', 'error');
                    };
                    
                    // Read the file as data URL
                    reader.readAsDataURL(file);
                } catch (error) {
                    console.error('Error handling file selection:', error);
                    showNotification(error.message || 'Error handling file selection. Please try again.', 'error');
                }
            }
            
            // Clean up the input element
            setTimeout(() => {
                if (document.body.contains(input)) {
                    document.body.removeChild(input);
                }
            }, 1000);
        });
    });

    // Add a fallback method for Safari on iOS
    document.addEventListener('DOMContentLoaded', () => {
        // Check if the device is iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS) {
            // Add a direct click handler to the profile image container for iOS
            const profileImageContainer = document.querySelector('.profile-image-container');
            if (profileImageContainer) {
                profileImageContainer.addEventListener('click', (e) => {
                    // Only trigger if the click is not on the edit button
                    if (!e.target.closest('.edit-profile-pic')) {
                        const editProfilePic = document.querySelector('.edit-profile-pic');
                        if (editProfilePic) {
                            editProfilePic.click();
                        }
                    }
                });
            }
        }
    });

    // Handle responsive design
    function handleResponsive() {
        const profileInfo = document.querySelector('.profile-info');
        if (window.innerWidth <= 768) {
            profileInfo.style.flexDirection = 'column';
            profileInfo.style.alignItems = 'center';
            profileInfo.style.textAlign = 'center';
        } else {
            profileInfo.style.flexDirection = 'row';
            profileInfo.style.alignItems = 'flex-start';
            profileInfo.style.textAlign = 'left';
        }
    }

    handleResponsive();
    window.addEventListener('resize', handleResponsive);

    // Experience and Education entry templates
    const experienceTemplate = `
        <div class="experience-entry">
            <div class="form-group">
                <label>Title</label>
                <input type="text" name="title" required>
            </div>
            <div class="form-group">
                <label>Company</label>
                <input type="text" name="company" required>
            </div>
            <div class="form-group">
                <label>Start Date</label>
                <input type="date" name="startDate" required>
            </div>
            <div class="form-group">
                <label>End Date</label>
                <input type="date" name="endDate">
                <div class="checkbox-group">
                    <input type="checkbox" name="currentJob" class="current-job">
                    <label>I currently work here</label>
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" rows="3"></textarea>
            </div>
            <button type="button" class="remove-experience">Remove</button>
        </div>
    `;

    const educationTemplate = `
        <div class="education-entry">
            <div class="form-group">
                <label>Degree</label>
                <input type="text" name="degree" required>
            </div>
            <div class="form-group">
                <label>Institution</label>
                <input type="text" name="institution" required>
            </div>
            <div class="form-group">
                <label>Start Date</label>
                <input type="date" name="startDate" required>
            </div>
            <div class="form-group">
                <label>End Date</label>
                <input type="date" name="endDate">
                <div class="checkbox-group">
                    <input type="checkbox" name="currentlyStudying" class="current-study">
                    <label>I currently study here</label>
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="description" rows="3"></textarea>
            </div>
            <button type="button" class="remove-education">Remove</button>
        </div>
    `;

    // Skills entry template
    const skillTemplate = `
        <div class="skill-entry">
            <div class="form-group">
                <input type="text" name="skill" placeholder="Enter skill" required>
                <button type="button" class="remove-skill">Remove</button>
            </div>
        </div>
    `;

    // Add Skill button functionality
    document.querySelector('.add-skill')?.addEventListener('click', () => {
        const container = document.getElementById('skillsContainer');
        const entry = document.createElement('div');
        entry.innerHTML = skillTemplate;
        container.appendChild(entry);
        
        // Add remove functionality to the new entry
        entry.querySelector('.remove-skill').addEventListener('click', () => {
            entry.remove();
        });
    });

    // Load existing skills when opening modal
    document.querySelector('.edit-skills-btn')?.addEventListener('click', () => {
        const container = document.getElementById('skillsContainer');
        container.innerHTML = ''; // Clear existing entries
        
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const skills = userData.skills || [];
        
        if (skills.length === 0) {
            // Add one empty entry if no skills exist
            const entry = document.createElement('div');
            entry.innerHTML = skillTemplate;
            container.appendChild(entry);
        } else {
            // Add existing skills
            skills.forEach(skill => {
                const entry = document.createElement('div');
                entry.innerHTML = skillTemplate;
                container.appendChild(entry);
                
                // Fill in the value
                entry.querySelector('[name="skill"]').value = skill;
            });
        }
        
        // Add remove functionality to all entries
        container.querySelectorAll('.remove-skill').forEach(button => {
            button.addEventListener('click', () => {
                button.closest('.skill-entry').remove();
            });
        });
    });

    // Update the updateUserData function
    function updateUserData(newData) {
        // Get current user data from localStorage
        const currentData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        // Merge new data with current data
        const updatedData = { ...currentData, ...newData };
        
        // Save to localStorage
        localStorage.setItem('userData', JSON.stringify(updatedData));
        
        // Update the global userData variable
        userData = updatedData;
        
        // Update the profile display
        updateProfileDisplay();
    }
});
