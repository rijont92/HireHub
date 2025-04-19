import { auth } from './firebase-config.js';

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
        editProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('editName');
            const titleInput = document.getElementById('editTitle');
            const locationInput = document.getElementById('editLocation');
            const themeColorInput = document.getElementById('themeColor');

            if (!nameInput || !titleInput || !locationInput || !themeColorInput) {
                console.error('Required form elements not found');
                return;
            }

            const newData = {
                name: nameInput.value,
                title: titleInput.value,
                location: locationInput.value,
                themeColor: themeColorInput.value
            };
            updateUserData(newData);
            modals.profile.style.display = 'none';
        });
    }

    if (editAboutForm) {
        editAboutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const bioInput = document.getElementById('editBio');
            if (!bioInput) {
                console.error('Bio input not found');
                return;
            }

            const newData = { bio: bioInput.value };
            updateUserData(newData);
            modals.about.style.display = 'none';
        });
    }

    if (editSkillsForm) {
        editSkillsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const skills = Array.from(document.querySelectorAll('.skill-entry [name="skill"]'))
                .map(input => input.value.trim())
                .filter(skill => skill); // Remove empty skills
            
            const newData = { skills };
            updateUserData(newData);
            modals.skills.style.display = 'none';
        });
    }

    if (editExperienceForm) {
        editExperienceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const experiences = Array.from(document.querySelectorAll('.experience-entry')).map(entry => {
                const titleInput = entry.querySelector('[name="title"]');
                const companyInput = entry.querySelector('[name="company"]');
                const startDateInput = entry.querySelector('[name="startDate"]');
                const endDateInput = entry.querySelector('[name="endDate"]');
                const descriptionInput = entry.querySelector('[name="description"]');
                const currentJobCheckbox = entry.querySelector('.current-job');

                if (!titleInput || !companyInput || !startDateInput) return null;

                return {
                    title: titleInput.value,
                    company: companyInput.value,
                    startDate: startDateInput.value,
                    endDate: currentJobCheckbox?.checked ? null : (endDateInput?.value || null),
                    description: descriptionInput?.value || ''
                };
            }).filter(exp => exp !== null); // Remove null entries
            
            const newData = { experience: experiences };
            updateUserData(newData);
            modals.experience.style.display = 'none';
        });
    }

    if (editEducationForm) {
        editEducationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const education = Array.from(document.querySelectorAll('.education-entry')).map(entry => {
                const degreeInput = entry.querySelector('[name="degree"]');
                const institutionInput = entry.querySelector('[name="institution"]');
                const startDateInput = entry.querySelector('[name="startDate"]');
                const endDateInput = entry.querySelector('[name="endDate"]');
                const descriptionInput = entry.querySelector('[name="description"]');
                const currentStudyCheckbox = entry.querySelector('.current-study');

                if (!degreeInput || !institutionInput || !startDateInput) return null;

                return {
                    degree: degreeInput.value,
                    institution: institutionInput.value,
                    startDate: startDateInput.value,
                    endDate: currentStudyCheckbox?.checked ? null : (endDateInput?.value || null),
                    description: descriptionInput?.value || ''
                };
            }).filter(edu => edu !== null); // Remove null entries
            
            const newData = { education };
            updateUserData(newData);
            modals.education.style.display = 'none';
        });
    }

    // Update profile information
    function updateProfileDisplay() {
        document.getElementById('userName').textContent = userData.name || 'User';
        document.getElementById('userTitle').textContent = userData.title || 'Professional';
        document.getElementById('userLocation').textContent = userData.location || 'Not specified';
        document.getElementById('userEmail').textContent = userData.email || 'No email provided';
        document.getElementById('userBio').textContent = userData.bio || 'No bio available';
        
        // Update profile image
        if (userData.profileImage) {
            profileImage.src = userData.profileImage;
            profileImage.onerror = function() {
                this.src = '../img/useri.png';
            };
        } else {
            profileImage.src = '../img/useri.png';
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
                        <p class="institution">${edu.institution}</p>
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
    }

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
    document.getElementById('themeColor')?.addEventListener('input', (e) => {
        updateThemeColor(e.target.value);
    });

    // Add experience entry
    function addExperienceEntry(data = {}) {
        const entry = document.createElement('div');
        entry.className = 'experience-entry';
        entry.innerHTML = `
            <input type="text" name="expTitle" placeholder="Job Title" value="${data.title || ''}">
            <input type="text" name="expCompany" placeholder="Company" value="${data.company || ''}">
            <input type="text" name="expStartDate" placeholder="Start Date" value="${data.startDate || ''}">
            <input type="text" name="expEndDate" placeholder="End Date" value="${data.endDate || ''}">
            <textarea name="expDescription" placeholder="Description">${data.description || ''}</textarea>
            <button type="button" class="remove-experience">Remove</button>
        `;
        experienceContainer.appendChild(entry);
    }

    // Add education entry
    function addEducationEntry(data = {}) {
        const entry = document.createElement('div');
        entry.className = 'education-entry';
        entry.innerHTML = `
            <input type="text" name="eduDegree" placeholder="Degree" value="${data.degree || ''}">
            <input type="text" name="eduInstitution" placeholder="Institution" value="${data.institution || ''}">
            <input type="text" name="eduStartDate" placeholder="Start Date" value="${data.startDate || ''}">
            <input type="text" name="eduEndDate" placeholder="End Date" value="${data.endDate || ''}">
            <button type="button" class="remove-education">Remove</button>
        `;
        educationContainer.appendChild(entry);
    }

    // Profile picture upload functionality
    editProfilePic.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.click();

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    profileImage.src = e.target.result;
                    userData.profileImage = e.target.result;
                    localStorage.setItem('userData', JSON.stringify(userData));
                };
                reader.readAsDataURL(file);
            }
        });
    });

    // Jobs tabs functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const jobsLists = document.querySelectorAll('.jobs-list');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            jobsLists.forEach(list => list.classList.add('hidden'));
            const tabName = button.getAttribute('data-tab');
            document.getElementById(`${tabName}Jobs`).classList.remove('hidden');
        });
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

    // Add Experience button functionality
    document.querySelector('.add-experience')?.addEventListener('click', () => {
        const container = document.getElementById('experienceContainer');
        const entry = document.createElement('div');
        entry.innerHTML = experienceTemplate;
        container.appendChild(entry);
        
        // Add remove functionality to the new entry
        entry.querySelector('.remove-experience').addEventListener('click', () => {
            entry.remove();
        });

        // Add current job checkbox functionality
        const currentJobCheckbox = entry.querySelector('.current-job');
        const endDateInput = entry.querySelector('[name="endDate"]');
        
        currentJobCheckbox.addEventListener('change', () => {
            endDateInput.disabled = currentJobCheckbox.checked;
            if (currentJobCheckbox.checked) {
                endDateInput.value = '';
            }
        });
    });

    // Add Education button functionality
    document.querySelector('.add-education')?.addEventListener('click', () => {
        const container = document.getElementById('educationContainer');
        const entry = document.createElement('div');
        entry.innerHTML = educationTemplate;
        container.appendChild(entry);
        
        // Add remove functionality to the new entry
        entry.querySelector('.remove-education').addEventListener('click', () => {
            entry.remove();
        });

        // Add currently studying checkbox functionality
        const currentStudyCheckbox = entry.querySelector('.current-study');
        const endDateInput = entry.querySelector('[name="endDate"]');
        
        currentStudyCheckbox.addEventListener('change', () => {
            endDateInput.disabled = currentStudyCheckbox.checked;
            if (currentStudyCheckbox.checked) {
                endDateInput.value = '';
            }
        });
    });

    // Load existing experience and education data when opening modals
    document.querySelector('.edit-experience-btn')?.addEventListener('click', () => {
        const container = document.getElementById('experienceContainer');
        container.innerHTML = ''; // Clear existing entries
        
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const experiences = userData.experience || [];
        
        if (experiences.length === 0) {
            // Add one empty entry if no experiences exist
            const entry = document.createElement('div');
            entry.innerHTML = experienceTemplate;
            container.appendChild(entry);
        } else {
            // Add existing experiences
            experiences.forEach(exp => {
                const entry = document.createElement('div');
                entry.innerHTML = experienceTemplate;
                container.appendChild(entry);
                
                // Fill in the values
                entry.querySelector('[name="title"]').value = exp.title || '';
                entry.querySelector('[name="company"]').value = exp.company || '';
                entry.querySelector('[name="startDate"]').value = exp.startDate || '';
                entry.querySelector('[name="endDate"]').value = exp.endDate || '';
                entry.querySelector('[name="description"]').value = exp.description || '';
                
                // Handle current job checkbox
                const currentJobCheckbox = entry.querySelector('.current-job');
                const endDateInput = entry.querySelector('[name="endDate"]');
                if (!exp.endDate) {
                    currentJobCheckbox.checked = true;
                    endDateInput.disabled = true;
                }
                
                currentJobCheckbox.addEventListener('change', () => {
                    endDateInput.disabled = currentJobCheckbox.checked;
                    if (currentJobCheckbox.checked) {
                        endDateInput.value = '';
                    }
                });
            });
        }
        
        // Add remove functionality to all entries
        container.querySelectorAll('.remove-experience').forEach(button => {
            button.addEventListener('click', () => {
                button.closest('.experience-entry').remove();
            });
        });
    });

    document.querySelector('.edit-education-btn')?.addEventListener('click', () => {
        const container = document.getElementById('educationContainer');
        container.innerHTML = ''; // Clear existing entries
        
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const education = userData.education || [];
        
        if (education.length === 0) {
            // Add one empty entry if no education exists
            const entry = document.createElement('div');
            entry.innerHTML = educationTemplate;
            container.appendChild(entry);
        } else {
            // Add existing education entries
            education.forEach(edu => {
                const entry = document.createElement('div');
                entry.innerHTML = educationTemplate;
                container.appendChild(entry);
                
                // Fill in the values
                entry.querySelector('[name="degree"]').value = edu.degree || '';
                entry.querySelector('[name="institution"]').value = edu.institution || '';
                entry.querySelector('[name="startDate"]').value = edu.startDate || '';
                entry.querySelector('[name="endDate"]').value = edu.endDate || '';
                entry.querySelector('[name="description"]').value = edu.description || '';
                
                // Handle currently studying checkbox
                const currentStudyCheckbox = entry.querySelector('.current-study');
                const endDateInput = entry.querySelector('[name="endDate"]');
                if (!edu.endDate) {
                    currentStudyCheckbox.checked = true;
                    endDateInput.disabled = true;
                }
                
                currentStudyCheckbox.addEventListener('change', () => {
                    endDateInput.disabled = currentStudyCheckbox.checked;
                    if (currentStudyCheckbox.checked) {
                        endDateInput.value = '';
                    }
                });
            });
        }
        
        // Add remove functionality to all entries
        container.querySelectorAll('.remove-education').forEach(button => {
            button.addEventListener('click', () => {
                button.closest('.education-entry').remove();
            });
        });
    });

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
