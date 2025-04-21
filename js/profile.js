import { auth, db } from './firebase-config.js';
import { doc, updateDoc } from 'firebase/firestore';

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
                
                if (editName) editName.value = userData.name || '';
                if (editTitle) editTitle.value = userData.title || '';
                if (editLocation) editLocation.value = userData.location || '';
                if (themeColorInput) themeColorInput.value = userData.themeColor || defaultThemeColor;
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
            
            // Get form values
            const name = document.getElementById('editName').value;
            const title = document.getElementById('editTitle').value;
            const location = document.getElementById('editLocation').value;
            const themeColor = document.getElementById('themeColor').value;
            
            // Update user data
            userData.name = name;
            userData.title = title;
            userData.location = location;
            userData.themeColor = themeColor;
            
            // Update theme color
            updateThemeColor(themeColor);
            
            // Update localStorage
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Update Firestore if user is authenticated
            if (auth.currentUser) {
                try {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    await updateDoc(userRef, {
                        name: name,
                        title: title,
                        location: location,
                        themeColor: themeColor
                    });
                } catch (error) {
                    console.error('Error updating profile:', error);
                }
            }
            
            // Update display
            updateProfileDisplay();
            
            // Close modal
            closeModal('profile');
        });
    }

    if (editAboutForm) {
        editAboutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const bio = document.getElementById('editBio').value;
            
            // Update user data
            userData.bio = bio;
            
            // Update localStorage
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Update Firestore if user is authenticated
            if (auth.currentUser) {
                try {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    await updateDoc(userRef, {
                        bio: bio
                    });
                } catch (error) {
                    console.error('Error updating bio:', error);
                }
            }
            
            // Update display
            updateProfileDisplay();
            
            // Close modal
            closeModal('about');
        });
    }

    if (editSkillsForm) {
        editSkillsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get all skill inputs
            const skillInputs = document.querySelectorAll('#skillsContainer [name="skill"]');
            const skills = Array.from(skillInputs)
                .map(input => input.value.trim())
                .filter(skill => skill !== '');
            
            // Update user data
            userData.skills = skills;
            
            // Update localStorage
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Update Firestore if user is authenticated
            if (auth.currentUser) {
                try {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    await updateDoc(userRef, {
                        skills: skills
                    });
                } catch (error) {
                    console.error('Error updating skills:', error);
                }
            }
            
            // Update display
            updateProfileDisplay();
            
            // Close modal
            closeModal('skills');
        });
    }

    if (editExperienceForm) {
        editExperienceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get all experience entries
            const experienceEntries = document.querySelectorAll('.experience-entry');
            const experience = Array.from(experienceEntries).map(entry => {
                return {
                    title: entry.querySelector('[name="jobTitle"]').value,
                    company: entry.querySelector('[name="company"]').value,
                    location: entry.querySelector('[name="jobLocation"]').value,
                    startDate: entry.querySelector('[name="startDate"]').value,
                    endDate: entry.querySelector('[name="endDate"]').value,
                    current: entry.querySelector('[name="currentJob"]').checked,
                    description: entry.querySelector('[name="jobDescription"]').value
                };
            });
            
            // Update user data
            userData.experience = experience;
            
            // Update localStorage
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Update Firestore if user is authenticated
            if (auth.currentUser) {
                try {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    await updateDoc(userRef, {
                        experience: experience
                    });
                } catch (error) {
                    console.error('Error updating experience:', error);
                }
            }
            
            // Update display
            updateProfileDisplay();
            
            // Close modal
            closeModal('experience');
        });
    }

    if (editEducationForm) {
        editEducationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get all education entries
            const educationEntries = document.querySelectorAll('.education-entry');
            const education = Array.from(educationEntries).map(entry => {
                return {
                    school: entry.querySelector('[name="school"]').value,
                    degree: entry.querySelector('[name="degree"]').value,
                    fieldOfStudy: entry.querySelector('[name="fieldOfStudy"]').value,
                    startDate: entry.querySelector('[name="eduStartDate"]').value,
                    endDate: entry.querySelector('[name="eduEndDate"]').value,
                    current: entry.querySelector('[name="currentEducation"]').checked,
                    description: entry.querySelector('[name="educationDescription"]').value
                };
            });
            
            // Update user data
            userData.education = education;
            
            // Update localStorage
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Update Firestore if user is authenticated
            if (auth.currentUser) {
                try {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    await updateDoc(userRef, {
                        education: education
                    });
                } catch (error) {
                    console.error('Error updating education:', error);
                }
            }
            
            // Update display
            updateProfileDisplay();
            
            // Close modal
            closeModal('education');
        });
    }

    // Function to update profile display
    function updateProfileDisplay() {
        // Update profile image
        if (profileImage && userData.profileImage) {
            profileImage.src = userData.profileImage;
        }
        
        // Update user name
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = userData.name || 'User';
        }
        
        // Update user title
        const userTitle = document.getElementById('userTitle');
        if (userTitle) {
            userTitle.textContent = userData.title || 'No title provided';
        }
        
        // Update user location
        const userLocation = document.getElementById('userLocation');
        if (userLocation) {
            userLocation.textContent = userData.location || 'No location provided';
        }
        
        // Update user bio
        const userBio = document.getElementById('userBio');
        if (userBio) {
            userBio.textContent = userData.bio || 'No bio provided';
        }
        
        // Update skills
        const skillsList = document.getElementById('skillsList');
        if (skillsList) {
            skillsList.innerHTML = '';
            if (userData.skills && userData.skills.length > 0) {
                userData.skills.forEach(skill => {
                    const skillTag = document.createElement('span');
                    skillTag.className = 'skill-tag';
                    skillTag.textContent = skill;
                    skillsList.appendChild(skillTag);
                });
            } else {
                const noSkills = document.createElement('p');
                noSkills.textContent = 'No skills added yet';
                skillsList.appendChild(noSkills);
            }
        }
        
        // Update experience
        const experienceList = document.getElementById('experienceList');
        if (experienceList) {
            experienceList.innerHTML = '';
            if (userData.experience && userData.experience.length > 0) {
                userData.experience.forEach(exp => {
                    const expItem = document.createElement('div');
                    expItem.className = 'experience-item';
                    
                    const title = document.createElement('h3');
                    title.textContent = exp.title;
                    
                    const company = document.createElement('p');
                    company.className = 'company';
                    company.textContent = exp.company;
                    
                    const location = document.createElement('p');
                    location.className = 'location';
                    location.textContent = exp.location;
                    
                    const duration = document.createElement('p');
                    duration.className = 'duration';
                    duration.textContent = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
                    
                    const description = document.createElement('p');
                    description.className = 'description';
                    description.textContent = exp.description;
                    
                    expItem.appendChild(title);
                    expItem.appendChild(company);
                    expItem.appendChild(location);
                    expItem.appendChild(duration);
                    expItem.appendChild(description);
                    
                    experienceList.appendChild(expItem);
                });
            } else {
                const noExp = document.createElement('p');
                noExp.textContent = 'No experience added yet';
                experienceList.appendChild(noExp);
            }
        }
        
        // Update education
        const educationList = document.getElementById('educationList');
        if (educationList) {
            educationList.innerHTML = '';
            if (userData.education && userData.education.length > 0) {
                userData.education.forEach(edu => {
                    const eduItem = document.createElement('div');
                    eduItem.className = 'education-item';
                    
                    const school = document.createElement('h3');
                    school.textContent = edu.school;
                    
                    const degree = document.createElement('p');
                    degree.className = 'degree';
                    degree.textContent = `${edu.degree} in ${edu.fieldOfStudy}`;
                    
                    const duration = document.createElement('p');
                    duration.className = 'duration';
                    duration.textContent = `${edu.startDate} - ${edu.current ? 'Present' : edu.endDate}`;
                    
                    const description = document.createElement('p');
                    description.className = 'description';
                    description.textContent = edu.description;
                    
                    eduItem.appendChild(school);
                    eduItem.appendChild(degree);
                    eduItem.appendChild(duration);
                    eduItem.appendChild(description);
                    
                    educationList.appendChild(eduItem);
                });
            } else {
                const noEdu = document.createElement('p');
                noEdu.textContent = 'No education added yet';
                educationList.appendChild(noEdu);
            }
        }
    }

    // Initialize theme color
    function initializeThemeColor() {
        // Get theme color from user data or use default
        const themeColor = userData.themeColor || defaultThemeColor;
        
        // Update theme color
        updateThemeColor(themeColor);
        
        // Set theme color input value
        if (themeColorInput) {
            themeColorInput.value = themeColor;
        }
    }

    // Function to add experience entry
    function addExperienceEntry(data = {}) {
        const experienceContainer = document.getElementById('experienceContainer');
        if (!experienceContainer) return;
        
        const entry = document.createElement('div');
        entry.className = 'experience-entry';
        
        entry.innerHTML = `
            <button type="button" class="remove-experience">Remove</button>
            <div class="form-group">
                <label for="jobTitle">Job Title</label>
                <input type="text" id="jobTitle" name="jobTitle" value="${data.title || ''}" required>
            </div>
            <div class="form-group">
                <label for="company">Company</label>
                <input type="text" id="company" name="company" value="${data.company || ''}" required>
            </div>
            <div class="form-group">
                <label for="jobLocation">Location</label>
                <input type="text" id="jobLocation" name="jobLocation" value="${data.location || ''}">
            </div>
            <div class="form-group">
                <label for="startDate">Start Date</label>
                <input type="date" id="startDate" name="startDate" value="${data.startDate || ''}" required>
            </div>
            <div class="form-group">
                <label for="endDate">End Date</label>
                <input type="date" id="endDate" name="endDate" value="${data.endDate || ''}" ${data.current ? 'disabled' : ''}>
            </div>
            <div class="checkbox-group">
                <input type="checkbox" id="currentJob" name="currentJob" ${data.current ? 'checked' : ''}>
                <label for="currentJob">I currently work here</label>
            </div>
            <div class="form-group">
                <label for="jobDescription">Description</label>
                <textarea id="jobDescription" name="jobDescription">${data.description || ''}</textarea>
            </div>
        `;
        
        experienceContainer.appendChild(entry);
        
        // Add event listener for current job checkbox
        const currentJobCheckbox = entry.querySelector('#currentJob');
        const endDateInput = entry.querySelector('#endDate');
        
        currentJobCheckbox.addEventListener('change', () => {
            endDateInput.disabled = currentJobCheckbox.checked;
            if (currentJobCheckbox.checked) {
                endDateInput.value = '';
            }
        });
        
        // Add event listener for remove button
        const removeButton = entry.querySelector('.remove-experience');
        removeButton.addEventListener('click', () => {
            entry.remove();
        });
    }

    // Function to add education entry
    function addEducationEntry(data = {}) {
        const educationContainer = document.getElementById('educationContainer');
        if (!educationContainer) return;
        
        const entry = document.createElement('div');
        entry.className = 'education-entry';
        
        entry.innerHTML = `
            <button type="button" class="remove-education">Remove</button>
            <div class="form-group">
                <label for="school">School</label>
                <input type="text" id="school" name="school" value="${data.school || ''}" required>
            </div>
            <div class="form-group">
                <label for="degree">Degree</label>
                <input type="text" id="degree" name="degree" value="${data.degree || ''}" required>
            </div>
            <div class="form-group">
                <label for="fieldOfStudy">Field of Study</label>
                <input type="text" id="fieldOfStudy" name="fieldOfStudy" value="${data.fieldOfStudy || ''}" required>
            </div>
            <div class="form-group">
                <label for="eduStartDate">Start Date</label>
                <input type="date" id="eduStartDate" name="eduStartDate" value="${data.startDate || ''}" required>
            </div>
            <div class="form-group">
                <label for="eduEndDate">End Date</label>
                <input type="date" id="eduEndDate" name="eduEndDate" value="${data.endDate || ''}" ${data.current ? 'disabled' : ''}>
            </div>
            <div class="checkbox-group">
                <input type="checkbox" id="currentEducation" name="currentEducation" ${data.current ? 'checked' : ''}>
                <label for="currentEducation">I am currently studying here</label>
            </div>
            <div class="form-group">
                <label for="educationDescription">Description</label>
                <textarea id="educationDescription" name="educationDescription">${data.description || ''}</textarea>
            </div>
        `;
        
        educationContainer.appendChild(entry);
        
        // Add event listener for current education checkbox
        const currentEducationCheckbox = entry.querySelector('#currentEducation');
        const endDateInput = entry.querySelector('#eduEndDate');
        
        currentEducationCheckbox.addEventListener('change', () => {
            endDateInput.disabled = currentEducationCheckbox.checked;
            if (currentEducationCheckbox.checked) {
                endDateInput.value = '';
            }
        });
        
        // Add event listener for remove button
        const removeButton = entry.querySelector('.remove-education');
        removeButton.addEventListener('click', () => {
            entry.remove();
        });
    }

    // Handle responsive design
    function handleResponsive() {
        const profilePicture = document.querySelector('.profile-picture');
        const profileInfo = document.querySelector('.profile-info');
        
        if (window.innerWidth <= 768) {
            if (profilePicture) {
                profilePicture.style.left = '50%';
                profilePicture.style.transform = 'translateX(-50%)';
                profilePicture.style.bottom = '-75px';
            }
            
            if (profileInfo) {
                profileInfo.style.paddingTop = '100px';
                profileInfo.style.textAlign = 'center';
            }
            
            const profileStats = document.querySelector('.profile-stats');
            if (profileStats) {
                profileStats.style.justifyContent = 'center';
            }
            
            const editProfileBtn = document.querySelector('.edit-profile-btn');
            if (editProfileBtn) {
                editProfileBtn.style.margin = '0 auto';
            }
        } else {
            if (profilePicture) {
                profilePicture.style.left = '50px';
                profilePicture.style.transform = 'none';
                profilePicture.style.bottom = '-50px';
            }
            
            if (profileInfo) {
                profileInfo.style.paddingTop = '70px';
                profileInfo.style.textAlign = 'left';
            }
            
            const profileStats = document.querySelector('.profile-stats');
            if (profileStats) {
                profileStats.style.justifyContent = 'flex-start';
            }
            
            const editProfileBtn = document.querySelector('.edit-profile-btn');
            if (editProfileBtn) {
                editProfileBtn.style.margin = '20px 0';
            }
        }
    }

    // Add event listener for window resize
    window.addEventListener('resize', handleResponsive);

    // Initialize
    updateProfileDisplay();
    initializeThemeColor();
    handleResponsive();
});
