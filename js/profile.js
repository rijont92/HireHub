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

    const defaultThemeColor = '#755ea3';

    if (localStorage.getItem('isAuthenticated') !== 'true') {
        window.location.href = '/html/login.html';
        return;
    }

    let userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    let unsubscribeFirestore;
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            
            const userRef = doc(db, 'users', user.uid);
            
            getDoc(userRef).then((docSnapshot) => {
                if (docSnapshot.exists()) {
                    const firestoreData = docSnapshot.data();
                    
                    userData = { ...userData, ...firestoreData };
                    
                    localStorage.setItem('userData', JSON.stringify(userData));
                    
                    updateProfileDisplay();
                }
            }).catch(error => {
                console.error("Error fetching initial user data:", error);
            });
            
            unsubscribeFirestore = onSnapshot(userRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const firestoreData = docSnapshot.data();
                    
                    userData = { ...userData, ...firestoreData };
                    
                    localStorage.setItem('userData', JSON.stringify(userData));
                    
                    updateProfileDisplay();
                }
            }, (error) => {
                console.error("Error listening to Firestore changes:", error);
            });
        } else {
            window.location.href = '/html/login.html';
        }
    });

    function updateThemeColor(color) {
        const themeColor = color || '#755ea3';
        
        document.documentElement.style.setProperty('--primary-color', themeColor);
        
        const profileBanner = document.querySelector('.profile-banner');
        if (profileBanner) {
            profileBanner.style.background = `var(--primary-color)`;
            profileBanner.style.backgroundColor = `var(--primary-color)`;
        }

        const userName = document.getElementById('userName');
        if (userName) {
            userName.style.color = `var(--primary-color)`;
        }

        const profileHeadings = document.querySelectorAll('.profile-section h2');
        profileHeadings.forEach(heading => {
            heading.style.color = `var(--primary-color)`;
        });

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

    function openModal(modalType) {
        const modal = modals[modalType];
        if (!modal) return;

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

    function closeModal(modalType) {
        const modal = modals[modalType];
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function closeAllModals() {
        Object.values(modals).forEach(modal => {
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }

    editProfileBtn.addEventListener('click', () => openModal('profile'));
    editAboutBtn.addEventListener('click', () => openModal('about'));
    editSkillsBtn.addEventListener('click', () => openModal('skills'));
    editExperienceBtn.addEventListener('click', () => openModal('experience'));
    editEducationBtn.addEventListener('click', () => openModal('education'));

    closeButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    cancelButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    window.addEventListener('click', (e) => {
        Object.values(modals).forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

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

            userData.name = name;
            userData.title = title;
            userData.location = location;
            userData.themeColor = themeColor;
            userData.company = company || 'Company not specified';
            userData.phone = phone || 'Phone not specified';
            userData.website = website || 'Website not specified';

            try {
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

                localStorage.setItem('userData', JSON.stringify(userData));
                
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

            userData.bio = bio;

            try {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    bio: bio
                });

                localStorage.setItem('userData', JSON.stringify(userData));
                
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

            userData.skills = skills;

            try {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    skills: skills
                });

                localStorage.setItem('userData', JSON.stringify(userData));
                
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
            }).filter(exp => exp.title && exp.company);

            userData.experience = experience;

            try {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    experience: experience
                });

                localStorage.setItem('userData', JSON.stringify(userData));
                
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
            }).filter(edu => edu.school && edu.degree); 

            userData.education = education;

            try {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    education: education
                });

                localStorage.setItem('userData', JSON.stringify(userData));
                
                updateProfileDisplay();
                closeModal('education');
            } catch (error) {
                console.error('Error updating education:', error);
                alert('Error updating education. Please try again.');
            }
        });
    }

    function updateProfileDisplay() {
        document.getElementById('userName').textContent = userData.name || 'User Name';
        document.getElementById('userTitle').textContent = userData.title || 'Professional Title';
        document.getElementById('userLocation').textContent = userData.location || 'Location';
        document.getElementById('userEmail').textContent = userData.email || 'Email';
        document.getElementById('userCompany').textContent = userData.company || 'Company not specified';
        document.getElementById('userPhone').textContent = userData.phone || 'Phone not specified';
        document.getElementById('userWebsite').textContent = userData.website || 'Website not specified';

        if (userData.profileImage) {
            document.getElementById('profileImage').src = userData.profileImage;
        }

        const skillsList = document.getElementById('skillsList');
        if (userData.skills && userData.skills.length > 0) {
            skillsList.innerHTML = userData.skills
                .map(skill => `<span class="skill-tag">${skill}</span>`)
                .join('');
        } else {
            skillsList.innerHTML = '<p>No skills added yet</p>';
        }

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

        const themeColor = userData.themeColor || defaultThemeColor;
        updateThemeColor(themeColor);

        fetchAppliedJobs();
    }

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

            const unsaveButtons = savedJobsContainer.querySelectorAll('.unsave-btn');
            unsaveButtons.forEach(button => {
                button.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const jobId = button.dataset.jobId;
                    await toggleSaveJob(jobId);
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

    const tabButtons = document.querySelectorAll('.tab-btn');
    const jobLists = document.querySelectorAll('.jobs-list');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const tab = button.dataset.tab;
            jobLists.forEach(list => {
                if (list.id === `${tab}Jobs`) {
                    list.classList.remove('hidden');
                } else {
                    list.classList.add('hidden');
                }
            });

            if (tab === 'applied') {
                fetchAppliedJobs();
            } else if (tab === 'saved') {
                fetchSavedJobs();
            }
        });
    });

    updateProfileDisplay();

    function initializeThemeColor() {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const themeColor = userData.themeColor || '#755ea3';
        updateThemeColor(themeColor);
    }

    initializeThemeColor();

    document.getElementById('themeColor')?.addEventListener('input', async (e) => {
        const color = e.target.value;
        updateThemeColor(color);

        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
                themeColor: color
            });

            userData.themeColor = color;
            localStorage.setItem('userData', JSON.stringify(userData));
        } catch (error) {
            console.error('Error saving theme color:', error);
        }
    });

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

        const currentJobCheckbox = entry.querySelector('.current-job');
        const endDateInput = entry.querySelector('[name="endDate"]');
        
        currentJobCheckbox.addEventListener('change', () => {
            endDateInput.disabled = currentJobCheckbox.checked;
            if (currentJobCheckbox.checked) {
                endDateInput.value = '';
            }
        });

        entry.querySelector('.remove-experience').addEventListener('click', () => {
            entry.remove();
        });

        container.appendChild(entry);
    }

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

        const currentStudyCheckbox = entry.querySelector('.current-study');
        const endDateInput = entry.querySelector('[name="eduEndDate"]');
        
        currentStudyCheckbox.addEventListener('change', () => {
            endDateInput.disabled = currentStudyCheckbox.checked;
            if (currentStudyCheckbox.checked) {
                endDateInput.value = '';
            }
        });

        entry.querySelector('.remove-education').addEventListener('click', () => {
            entry.remove();
        });

        container.appendChild(entry);
    }

    document.querySelector('.add-experience')?.addEventListener('click', () => {
        addExperienceEntry();
    });

    document.querySelector('.add-education')?.addEventListener('click', () => {
        addEducationEntry();
    });

    function showNotification(message, type = 'success') {
        const existingNotification = document.querySelector('.popup-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `popup-notification ${type}`;
        
        const icon = type === 'success' ? '✓' : '✕';
        
        notification.innerHTML = `
            <i>${icon}</i>
            <span class="message">${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    editProfilePic.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            input.capture = 'environment';
        }
        
        input.style.display = 'none';
        input.style.position = 'absolute';
        input.style.opacity = '0';
        input.style.width = '100%';
        input.style.height = '100%';
        input.style.top = '0';
        input.style.left = '0';
        input.style.cursor = 'pointer';
        
        document.body.appendChild(input);
        
        setTimeout(() => {
            input.click();
        }, 100);
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const loadingIndicator = document.createElement('div');
                    loadingIndicator.className = 'loading-indicator';
                    loadingIndicator.innerHTML = 'Uploading image...';
                    document.body.appendChild(loadingIndicator);
                    
                    if (file.size > 10 * 1024 * 1024) {
                        throw new Error('File size too large. Please select an image under 10MB.');
                    }
                    
                    if (!file.type.match('image.*')) {
                        throw new Error('Please select an image file.');
                    }
                    
                    const reader = new FileReader();
                    
                    reader.onload = async (e) => {
                        try {
                            const img = new Image();
                            img.src = e.target.result;
                            
                            img.onload = async () => {
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                
                                let width = img.width;
                                let height = img.height;
                                
                                const maxDimension = 800;
                                
                                if (width > height && width > maxDimension) {
                                    height = Math.round((height * maxDimension) / width);
                                    width = maxDimension;
                                } else if (height > maxDimension) {
                                    width = Math.round((width * maxDimension) / height);
                                    height = maxDimension;
                                }
                                
                                canvas.width = width;
                                canvas.height = height;
                                
                                ctx.drawImage(img, 0, 0, width, height);
                                
                                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                                
                                const estimatedSize = Math.ceil(compressedBase64.length * 0.75);
                                
                                if (estimatedSize > 900000) {
                                    throw new Error('Image is still too large after compression. Please try a smaller image.');
                                }
                                
                                profileImage.src = compressedBase64;
                                
                                userData.profileImage = compressedBase64;
                                localStorage.setItem('userData', JSON.stringify(userData));
                                
                                const userRef = doc(db, 'users', auth.currentUser.uid);
                                await updateDoc(userRef, {
                                    profileImage: compressedBase64
                                });
                                
                                loadingIndicator.remove();
                                
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
                    
                    reader.readAsDataURL(file);
                } catch (error) {
                    console.error('Error handling file selection:', error);
                    showNotification(error.message || 'Error handling file selection. Please try again.', 'error');
                }
            }
            
            setTimeout(() => {
                if (document.body.contains(input)) {
                    document.body.removeChild(input);
                }
            }, 1000);
        });
    });

    document.addEventListener('DOMContentLoaded', () => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS) {
            const profileImageContainer = document.querySelector('.profile-image-container');
            if (profileImageContainer) {
                profileImageContainer.addEventListener('click', (e) => {
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

    const skillTemplate = `
        <div class="skill-entry">
            <div class="form-group">
                <input type="text" name="skill" placeholder="Enter skill" required>
                <button type="button" class="remove-skill">Remove</button>
            </div>
        </div>
    `;

    document.querySelector('.add-skill')?.addEventListener('click', () => {
        const container = document.getElementById('skillsContainer');
        const entry = document.createElement('div');
        entry.innerHTML = skillTemplate;
        container.appendChild(entry);
        
        entry.querySelector('.remove-skill').addEventListener('click', () => {
            entry.remove();
        });
    });

    document.querySelector('.edit-skills-btn')?.addEventListener('click', () => {
        const container = document.getElementById('skillsContainer');
        container.innerHTML = '';
        
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const skills = userData.skills || [];
        
        if (skills.length === 0) {
            const entry = document.createElement('div');
            entry.innerHTML = skillTemplate;
            container.appendChild(entry);
        } else {
            skills.forEach(skill => {
                const entry = document.createElement('div');
                entry.innerHTML = skillTemplate;
                container.appendChild(entry);
                
                entry.querySelector('[name="skill"]').value = skill;
            });
        }
        
        container.querySelectorAll('.remove-skill').forEach(button => {
            button.addEventListener('click', () => {
                button.closest('.skill-entry').remove();
            });
        });
    });

    function updateUserData(newData) {
        const currentData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        const updatedData = { ...currentData, ...newData };
        
        localStorage.setItem('userData', JSON.stringify(updatedData));
        
        userData = updatedData;
        
        updateProfileDisplay();
    }
});
