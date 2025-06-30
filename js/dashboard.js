import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, writeBatch, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const applicationsList = document.getElementById('applications-list');
const userNameElement = document.getElementById('user-name');
const userEmailElement = document.getElementById('user-email');
const searchInput = document.querySelector('.search-box input');
const filterSelect = document.querySelector('.filter-dropdown select');

const statusColors = {
    pending: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected'
};

const tabLinks = document.querySelectorAll('.sidebar-nav a');
let contentSections = {};

function initializeContentSections() {
    
    const mainContent = document.querySelector('.dashboard-content').parentElement;
    
    contentSections = {
        'applications': document.querySelector('.dashboard-content'),
        'posted-jobs': document.createElement('div'),
        'my-applications': document.getElementById('my-applications-section')
    };
    
    contentSections['posted-jobs'].className = 'dashboard-content';

    contentSections['posted-jobs'].innerHTML = `
        <div class="content-header">
            <h1 data-translate="Posted Jobs">Posted Jobs</h1>
            <a href="post-job.html" class="btn btn-primary" data-translate="Post New Job">Post New Job</a>
        </div>
        <div class="posted-jobs-list" id="posted-jobs-list">
            <!-- Posted jobs will be loaded here -->
        </div>
    `;

    Object.values(contentSections).forEach(section => {
        if (section && section !== contentSections['applications']) {
            mainContent.appendChild(section);
            section.style.display = 'none';
        }
    });

    const applicationsTab = document.querySelector('.sidebar-nav a[href="#applications"]');
    if (applicationsTab) {
        applicationsTab.parentElement.classList.add('active');
    }
    
}

function initializeTabLinks() {
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            tabLinks.forEach(tab => {
                tab.parentElement.classList.remove('active');
            });
            
            link.parentElement.classList.add('active');
            
            const target = link.getAttribute('href').substring(1);
            
            Object.values(contentSections).forEach(section => {
                if (section) {
                    section.style.display = 'none';
                }
            });
            
            if (contentSections[target]) {
                contentSections[target].style.display = 'block';
                
                switch (target) {
                    case 'applications':
                        loadApplications(auth.currentUser.uid);
                        break;
                    case 'posted-jobs':
                        loadPostedJobs(auth.currentUser.uid);
                        break;
                    case 'my-applications':
                        loadMyApplications(auth.currentUser.uid);
                        break;
                }
            } else {
                console.error('Content section not found:', target);
            }
        });
    });
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.data();

            const userAvatarElement = document.querySelector('.user-avatar');

            userNameElement.textContent = userData?.name || user.displayName || 'User';
            userEmailElement.textContent = user.email;

            if (userData?.profileImage) {
                userAvatarElement.innerHTML = `<img src="${userData.profileImage}" alt="Profile" class="profile-image">`;
            } else {
                userAvatarElement.innerHTML = `<i class="ri-user-line"></i>`;
            }

            // Add click event to redirect to profile
            userAvatarElement.addEventListener('click', () => {
                window.location.href = 'profile.html';
            });

            initializeContentSections();
            initializeTabLinks();

            contentSections['applications'].style.display = 'block';
            loadApplications(user.uid);

            loadMyApplications(user.uid);
        } catch (error) {
            console.error('Error loading user data:', error);
            userNameElement.textContent = user.displayName || 'User';
            userEmailElement.textContent = user.email;
        }
    } else {
        window.location.href = '/html/login.html';
    }
});

async function loadApplications(userId) {
    try {
        const jobsQuery = query(
            collection(db, 'jobs'),
            where('postedBy', '==', userId)
        );
        const jobsSnapshot = await getDocs(jobsQuery);
        
        const jobIds = jobsSnapshot.docs.map(doc => doc.id);
        
        if (jobIds.length === 0) {
            applicationsList.innerHTML = `
                <div class="no-applications">
                    <i class="ri-inbox-line"></i>
                    <h3 data-translate="No Jobs Posted Yet">No Jobs Posted</h3>
                    <p data-translate="dd1">You haven't posted any jobs yet. Start by posting a job to receive applications.</p>
                    <a href="post-job.html" class="btn btn-primary" data-translate="post-job-button">Post a Job</a>
                </div>
            `;
            if (window.updateTranslations) {
                window.updateTranslations();
            }
            return;
        }

        const chunkSize = 10;
        const jobIdChunks = [];
        for (let i = 0; i < jobIds.length; i += chunkSize) {
            jobIdChunks.push(jobIds.slice(i, i + chunkSize));
        }

        let allApplications = [];
        for (const chunk of jobIdChunks) {
            const applicationsQuery = query(
                collection(db, 'applications'),
                where('jobId', 'in', chunk)
            );
            const applicationsSnapshot = await getDocs(applicationsQuery);
            allApplications = allApplications.concat(applicationsSnapshot.docs);
        }
        
        allApplications.sort((a, b) => {
            const dateA = new Date(a.data().appliedAt || 0);
            const dateB = new Date(b.data().appliedAt || 0);
            return dateB - dateA;
        });
        
        applicationsList.innerHTML = '';
        
        if (allApplications.length === 0) {
            applicationsList.innerHTML = `
                <div class="no-applications">
                    <i class="ri-inbox-line"></i>
                    <h3 data-translate="no-applications">No Applications Yet</h3>
                    <p data-translate="o1">You haven't received any applications for your posted jobs yet.</p>
                </div>
            `;
            
            if (window.updateTranslations) {
                window.updateTranslations();
            }
            return;
        }
        
        // Create a container for applications
        const applicationsContainer = document.createElement('div');
        applicationsContainer.className = 'applications-container';
        applicationsList.appendChild(applicationsContainer);
        
        for (const applicationDoc of allApplications) {
            const application = applicationDoc.data();
            
            try {
                const jobDocRef = doc(db, 'jobs', application.jobId);
                const jobDoc = await getDoc(jobDocRef);
                const jobData = jobDoc.data();
                
                let userData = {
                    name: application.fullName || 'Anonymous Applicant',
                    email: application.email,
                    phone: application.phone
                };

                if (application.userId) {
                    try {
                        const userDocRef = doc(db, 'users', application.userId);
                        const userDoc = await getDoc(userDocRef);
                        if (userDoc.exists()) {
                            userData = { ...userData, ...userDoc.data() };
                        }
                    } catch (userError) {
                        console.error('Error fetching user data:', userError);
                    }
                }
                
                displayApplication(applicationDoc.id, application, jobData, userData);
            } catch (error) {
                console.error('Error processing application:', error);
                console.error('Application data:', application);
                continue;
            }
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        applicationsList.innerHTML = `
            <div class="error-message">
                <i class="ri-error-warning-line"></i>
                <h3>Error Loading Applications</h3>
                <p>There was an error loading your applications. Please try again later.</p>
                <p class="error-details">${error.message}</p>
            </div>
        `;
    }
}

function getInitials(name) {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function displayApplication(applicationId, application, jobData, userData) {
    const applicationsContainer = document.querySelector('.applications-container');
    if (!applicationsContainer) return;
    
    const applicationCard = document.createElement('div');
    applicationCard.className = 'application-card';
    
    const initials = getInitials(application.fullName || 'Anonymous Applicant');
    const profileImage = userData?.profileImage || null;
    
    applicationCard.innerHTML = `
        <div class="application-header">
            <div class="applicant-info">
                <div class="applicant-avatar" onclick="window.location.href='view-profile.html?id=${application.userId}'" style="cursor: pointer;">
                    ${profileImage ? 
                        `<img src="${profileImage}" alt="${application.fullName}" class="profile-image">` :
                        `<div class="avatar-circle">
                            <span class="avatar-initials">${initials}</span>
                        </div>`
                    }
                </div>
                <div class="applicant-details">
                    <h3 onclick="window.location.href='view-profile.html?id=${application.userId}'" style="cursor: pointer;">${application.fullName || 'Anonymous Applicant'}</h3>
                    <p class="job-title"><span data-translate="applied-for">Applied for:</span> ${jobData?.jobTitle || 'Unknown Job'}</p>
                    <div class="contact-info">
                        <span class="contact-item">
                            <i class="ri-mail-line"></i>
                            ${application.email}
                        </span>
                        <span class="contact-item">
                            <i class="ri-phone-line"></i>
                            ${application.phone}
                        </span>
                         <span class="contact-item">
                            ${application.resumeURL ? `<a href="${application.resumeURL}" target="_blank" rel="noopener noreferrer"><i class="ri-download-2-line"></i> <span data-translate="download-cv">Download CV</span></a>` : ''}
                            
                        </span>

                    </div>
                </div>
            </div>
            <div class="application-status ${statusColors[application.status || 'pending']}">
                <span data-translate="${(application.status || 'pending').charAt(0) + (application.status || 'pending').slice(1)}">${(application.status || 'pending').charAt(0).toUpperCase() + (application.status || 'pending').slice(1)}</span>
            </div>
        </div>
        <div class="application-content">
            <div class="cover-letter">
                <h4 data-translate="cover-letter1">Cover Letter</h4>
                <p>${application.coverLetter || 'No cover letter provided'}</p>
                    
            </div>
            <div class="application-actions">
                ${(application.status === 'pending' || !application.status) ? `
                    <button class="btn btn-primary approve-btn" data-application-id="${applicationId}">
                        <i class="ri-check-line"></i> <span data-translate="Approve">Approve</span>
                    </button>
                    <button class="btn btn-outline reject-btn" data-application-id="${applicationId}">
                        <i class="ri-close-line"></i> <span data-translate="Reject">Reject</span>
                    </button>
                ` : ''}
                <button class="btn btn-danger delete-btn" data-application-id="${applicationId}">
                    <i class="ri-delete-bin-line"></i> <span data-translate="remove">Delete</span>
                </button>
            </div>
        </div>
    `;
    
     if (window.updateTranslations) {
                            window.updateTranslations();
                        }
    const approveBtn = applicationCard.querySelector('.approve-btn');
    const rejectBtn = applicationCard.querySelector('.reject-btn');
    const deleteBtn = applicationCard.querySelector('.delete-btn');
    
    if (approveBtn) {
        approveBtn.addEventListener('click', () => showStatusUpdateModal(applicationId, 'approved'));
    }
    
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => showStatusUpdateModal(applicationId, 'rejected'));
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            showConfirmationModal(
                'Are you sure you want to delete this application? This action cannot be undone.',
                () => deleteApplication(applicationId)
            );
        });
    }
     if (window.updateTranslations) {
                            window.updateTranslations();
                        }
    applicationsContainer.appendChild(applicationCard);
     if (window.updateTranslations) {
                            window.updateTranslations();
                        }
}

function showStatusUpdateModal(applicationId, newStatus) {
    const modal = document.createElement('div');
    modal.className = 'status-update-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3><span data-translate="${newStatus === 'approved' ? 'Approve' : 'Reject'}">${newStatus === 'approved' ? 'Approve' : 'Reject'}</span> <span data-translate="application">Application</span></h3>
            <div class="form-group">
                <label for="status-message" data-translate="message-applicant">Message to Applicant</label>
                <textarea id="status-message" data-translate-placeholder="p1" placeholder="Enter your message to the applicant..." required></textarea>
            </div>
            <div class="modal-actions">
                <button class="btn btn-outline cancel-btn" data-translate="cancel">Cancel</button>
                <button class="btn btn-primary confirm-btn" data-translate="confirm">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('.confirm-btn').addEventListener('click', async () => {
        const message = modal.querySelector('#status-message').value.trim();
        if (!message) {
            alert('Please enter a message before confirming.');
            return;
        }
        await updateApplicationStatus(applicationId, newStatus, message);
        modal.remove();
    });

    if (window.updateTranslations) {
        window.updateTranslations();
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="ri-${type === 'success' ? 'check' : 'close'}-circle-fill"></i>
        <span data-translate="${message}">${message}</span>
    `;
    if (window.updateTranslations) {
        window.updateTranslations();
    }
    document.body.appendChild(notification);
    if (window.updateTranslations) {
        window.updateTranslations();
    }
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
    if (window.updateTranslations) {
        window.updateTranslations();
    }
}

async function updateApplicationStatus(applicationId, newStatus, message = '') {
    try {
     
        const applicationRef = doc(db, 'applications', applicationId);
        const applicationDoc = await getDoc(applicationRef);
        const application = applicationDoc.data();
        
        if (!application) {
            throw new Error('Application not found');
        }


        const jobRef = doc(db, 'jobs', application.jobId);
        const jobDoc = await getDoc(jobRef);
        const jobData = jobDoc.data();

        if (!jobData) {
            throw new Error('Job not found');
        }


        const jobPosterRef = doc(db, 'users', auth.currentUser.uid);
        const jobPosterDoc = await getDoc(jobPosterRef);
        const jobPosterData = jobPosterDoc.data();
        const jobPosterName = jobPosterData.fullName || jobPosterData.name || 'The employer';

        const applicantRef = doc(db, 'users', application.userId);
        const applicantDoc = await getDoc(applicantRef);
        const applicantData = applicantDoc.data();

        const batch = writeBatch(db);

        batch.update(applicationRef, {
            status: newStatus,
            message: message,
            updatedAt: new Date().toISOString()
        });

        let applications = jobData.applications || [];
        if (newStatus === 'approved') {
            if (!applications.includes(application.userId)) {
                applications.push(application.userId);
            }
        }

        // --- Auto-close job if approved count >= vacancy ---
        let approvedCount = 0;
        const approvedQuery = query(collection(db, 'applications'), where('jobId', '==', application.jobId), where('status', '==', 'approved'));
        const approvedSnapshot = await getDocs(approvedQuery);
        approvedCount = approvedSnapshot.size;
        let newStatusForJob = jobData.status;
        if (jobData.vacancy && approvedCount >= jobData.vacancy) {
            newStatusForJob = 'closed';
        }
        batch.update(jobRef, {
            applications: applications,
            updatedAt: new Date().toISOString(),
            status: newStatusForJob
        });
        // --- End auto-close logic ---

        const notificationData = {
            type: 'status',
            status: newStatus,
            jobId: application.jobId,
            jobTitle: jobData.jobTitle || 'Untitled Job',
            message: newStatus === 'approved' 
                ? `${jobPosterName} <span data-translate="has-approved">has approved your application for</span> <strong> ${jobData.jobTitle || 'Untitled Job'}</strong>!`
                : `${jobPosterName} <span data-translate="has-rejected">has rejected your application for</span> <strong> ${jobData.jobTitle || 'Untitled Job'}</strong>.`,
            timestamp: new Date().toISOString(),
            read: false,
            userId: application.userId, 
            applicantId: application.userId,
            applicantName: applicantData?.fullName || applicantData?.name || 'Applicant',
            applicantImage: applicantData?.profileImage || '../img/useri.png'
        };

        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, notificationData);

        await batch.commit();


        const statusMessage = newStatus === 'approved' ? 'approved' : 'rejected';
        showNotification(`Application has been ${statusMessage} successfully!`);

        await loadApplications(auth.currentUser.uid);

        if (window.location.pathname.includes('jobs.html')) {
            setTimeout(() => {
                window.location.reload();
            }, 2000); 
            return;
        }

        if (window.location.pathname.includes('profile.html')) {
            const jobCard = document.querySelector(`[data-job-id="${application.jobId}"]`);
            if (jobCard) {
                const statusElement = jobCard.querySelector('.status');
                if (statusElement) {
                    statusElement.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                    statusElement.className = `status ${newStatus}`;
                }
            }
        }

        setTimeout(() => {
            window.location.reload();
        }, 2000); 
    } catch (error) {
        console.error('❌ Error updating application status:', error);
        showNotification('Failed to update application status. Please try again.', 'error');
    }
}

function sendMessage(applicantId, applicantName) {
    alert(`Messaging ${applicantName}...`);
}

searchInput.addEventListener('input', filterApplications);
filterSelect.addEventListener('change', filterApplications);

function filterApplications() {
    const searchInput = document.querySelector('.search-box input');
    const statusFilter = document.querySelector('.filter-dropdown select');
    const applicationsList = document.getElementById('applications-list');
    const applicationsContainer = document.querySelector('.applications-container');
    
    if (!searchInput || !statusFilter || !applicationsList) return;
    
    // If there's no applications container, it means there are no applications
    if (!applicationsContainer) return;
    
    const applications = applicationsContainer.querySelectorAll('.application-card');
    if (!applications.length) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const selectedStatus = statusFilter.value;
    let hasVisibleResults = false;
    
    applications.forEach(card => {
        const applicantName = card.querySelector('.applicant-details h3')?.textContent.toLowerCase() || '';
        const jobTitle = card.querySelector('.applicant-details p')?.textContent.toLowerCase() || '';
        const statusElement = card.querySelector('.application-status span');
        const status = statusElement?.getAttribute('data-translate')?.toLowerCase() || '';
        
        const matchesSearch = applicantName.includes(searchTerm) || jobTitle.includes(searchTerm);
        const matchesStatus = selectedStatus === 'all' || status === selectedStatus.toLowerCase();
        
        if (matchesSearch && matchesStatus) {
            card.style.display = 'block';
            hasVisibleResults = true;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Remove any existing no-results message
    const existingNoResults = applicationsList.querySelector('.no-results-message');
    if (existingNoResults) {
        existingNoResults.remove();
    }
    
    if (!hasVisibleResults) {
        const message = document.createElement('div');
        message.className = 'no-results-message';
        message.innerHTML = `
            <div class="no-applications">
                <i class="ri-search-line"></i>
                <h3 data-translate="no-application-found">No Applications Found</h3>
                <p data-translate="no-application-text">No applications match your current filter criteria.</p>
            </div>
        `;
        if (window.updateTranslations) {
            window.updateTranslations();
        }
        applicationsList.appendChild(message);
    }
}

async function loadPostedJobs(userId) {
    try {
        
        const jobsQuery = query(
            collection(db, 'jobs'),
            where('postedBy', '==', userId)
        );
        const jobsSnapshot = await getDocs(jobsQuery);
        
        
        const jobsList = document.getElementById('posted-jobs-list');
        if (!jobsList) {
            console.error('Posted jobs list element not found');
            return;
        }
        
        jobsList.innerHTML = '';
        
        if (jobsSnapshot.empty) {
            jobsList.innerHTML = `
                <div class="no-jobs">
                    <i class="ri-briefcase-line"></i>
                    <h3 data-translate="No Jobs Posted Yet">No Jobs Posted</h3>
                    <p data-translate="dd2">You haven't posted any jobs yet. Start by posting a job to receive applications.</p>
                    <a href="post-job.html" class="btn btn-primary" data-translate="post-job-button">Post a Job</a>
                </div>
            `;
            if (window.updateTranslations) {
                window.updateTranslations();
            }
            return;
            
        }
        
        jobsSnapshot.forEach(doc => {
            const job = doc.data();
            
            const jobCard = document.createElement('div');
            jobCard.className = 'job-card';
            jobCard.innerHTML = `
                <div class="job-header">
                    <h3>${job.jobTitle || 'Untitled Job'}</h3>
                    <span class="job-status" data-translate="${job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1).toLowerCase() : 'Active'}"</span>
                </div>
                <div class="job-details">
                    <p><i class="ri-map-pin-line"></i> ${job.location || 'Location not specified'}</p>
                    <p><i class="ri-money-dollar-circle-line"></i> ${job.salary || 'Salary not specified'}</p>
                    <p><i class="ri-time-line"></i> <span data-translate="posted">Posted</span> ${job.postedDate ? new Date(job.postedDate).toLocaleDateString() : 'Date not specified'}</p>
                </div>
                <div class="job-actions">
                    <button class="btn btn-outline" onclick="editJob('${doc.id}')" data-translate="edit">Edit</button>
                </div>
            `;
            jobsList.appendChild(jobCard);

            if (window.updateTranslations) {
                window.updateTranslations();
            }
        });

    } catch (error) {
        console.error('Error loading posted jobs:', error);
        const jobsList = document.getElementById('posted-jobs-list');
        if (jobsList) {
            jobsList.innerHTML = `
                <div class="error-message">
                    <i class="ri-error-warning-line"></i>
                    <h3>Error Loading Jobs</h3>
                    <p>There was an error loading your posted jobs. Please try again later.</p>
                </div>
            `;
        }
    }
}

async function deleteApplication(applicationId) {
    try {
        const applicationRef = doc(db, 'applications', applicationId);
        const applicationDoc = await getDoc(applicationRef);
        const application = applicationDoc.data();

        if (!application) {
            throw new Error('Application not found');
        }

        const jobRef = doc(db, 'jobs', application.jobId);
        const jobDoc = await getDoc(jobRef);
        const jobData = jobDoc.data();

        if (!jobData) {
            throw new Error('Job not found');
        }

        const batch = writeBatch(db);

        batch.delete(applicationRef);

        let applications = jobData.applications || [];
        applications = applications.filter(id => id !== application.userId);

        batch.update(jobRef, {
            applications: applications,
            updatedAt: new Date().toISOString()
        });

        await batch.commit();

        showNotification('Application deleted successfully!');

        await loadApplications(auth.currentUser.uid);
    } catch (error) {
        console.error('Error deleting application:', error);
        showNotification('Failed to delete application. Please try again.', 'error');
    }
}

async function editJob(jobId) {
    try {
        const jobRef = doc(db, 'jobs', jobId);
        const jobDoc = await getDoc(jobRef);
        const jobData = jobDoc.data();

        if (!jobData) {
            throw new Error('Job not found');
        }

        document.getElementById('editJobTitle').value = jobData.jobTitle;
        document.getElementById('editCompanyName').value = jobData.companyName;
        document.getElementById('editJobType').value = jobData.jobType;
        
        // Populate category select
        const categorySelect = document.getElementById('editCategory');
        categorySelect.innerHTML = '<option value="" data-translate="select-industry">Select Industry Category</option>'; // Clear existing options
        
        const predefinedCategories = [
            'IT & Software', 'Design & Creative', 'Marketing', 'Sales', 'Customer Service',
            'Finance', 'Healthcare', 'Education', 'Engineering', 'Manufacturing', 'Retail',
            'Hospitality', 'Transportation', 'Construction', 'Media & Entertainment',
            'Non-Profit', 'Government', 'Legal', 'Human Resources', 'Administrative',
            'Research & Development', 'Quality Assurance', 'Project Management',
            'Product Management', 'Business Development', 'Consulting', 'Real Estate',
            'Insurance', 'Banking', 'Telecommunications', 'Energy & Utilities',
            'Agriculture', 'Environmental', 'Security', 'Logistics', 'Supply Chain',
            'Architecture', 'Art & Design', 'Fashion', 'Food & Beverage',
            'Sports & Fitness', 'Travel & Tourism', 'Other'
        ];
        
        predefinedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            option.setAttribute('data-translate', category);
            categorySelect.appendChild(option);
        });
        
        categorySelect.value = jobData.category || '';
        
        // Update translations after populating the select
        if (window.updateTranslations) {
            window.updateTranslations();
        }
        
        // Set the location value in the select dropdown
        const locationSelect = document.getElementById('editLocation');
        locationSelect.value = jobData.location || '';
        
        document.getElementById('editSalary').value = jobData.salary;
        document.getElementById('editVacancy').value = jobData.vacancy || 1;
        document.getElementById('editJobDescription').value = jobData.description;
        document.getElementById('editRequirements').value = jobData.requirements;
        document.getElementById('editBenefits').value = jobData.benefits;
        document.getElementById('editApplicationDeadline').value = jobData.applicationDeadline;
        document.getElementById('editContactEmail').value = jobData.contactEmail;
        document.getElementById('editStatus').value = jobData.status || 'active';

        document.getElementById('editJobForm').dataset.jobId = jobId;

        document.getElementById('editPopupOverlay').style.display = 'block';
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Error editing job:', error);
        alert('Failed to edit job. Please try again.');
    }
}

function closeEditPopup() {
    document.getElementById('editPopupOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

document.getElementById('editJobForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const jobId = this.dataset.jobId;
    if (!jobId) {
        alert('Job ID not found');
        return;
    }
    try {
        const formData = {
            jobTitle: document.getElementById('editJobTitle').value,
            companyName: document.getElementById('editCompanyName').value,
            jobType: document.getElementById('editJobType').value,
            category: document.getElementById('editCategory').value,
            location: document.getElementById('editLocation').value,
            salary: document.getElementById('editSalary').value,
            vacancy: parseInt(document.getElementById('editVacancy').value),
            jobDescription: document.getElementById('editJobDescription').value,
            requirements: document.getElementById('editRequirements').value,
            benefits: document.getElementById('editBenefits').value,
            applicationDeadline: document.getElementById('editApplicationDeadline').value,
            contactEmail: document.getElementById('editContactEmail').value,
            status: document.getElementById('editStatus').value,
            lastUpdated: new Date().toISOString()
        };
        // --- Prevent reopening unless vacancy is increased ---
        if (formData.status === 'active') {
            const jobRef = doc(db, 'jobs', jobId);
            const jobDoc = await getDoc(jobRef);
            const jobData = jobDoc.data();
            const approvedQuery = query(collection(db, 'applications'), where('jobId', '==', jobId), where('status', '==', 'approved'));
            const approvedSnapshot = await getDocs(approvedQuery);
            const approvedCount = approvedSnapshot.size;
            const newVacancy = parseInt(document.getElementById('editVacancy').value);
            if (approvedCount >= newVacancy) {
                showNotification('To reopen this job, you must increase the number of vacancies above the number of already approved applicants.', 'error');
                return;
            }
        }
        // --- End prevent reopening logic ---
        await updateDoc(doc(db, 'jobs', jobId), formData);
        closeEditPopup();
        loadPostedJobs(auth.currentUser.uid);
        showNotification('Job updated successfully!');
    } catch (error) {
        console.error('Error updating job:', error);
        showNotification('Error updating job. Please try again.', 'error');
    }
});

document.getElementById('editPopupOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeEditPopup();
    }
});

window.editJob = editJob;
window.closeEditPopup = closeEditPopup;

function showConfirmationModal(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.innerHTML = `
        <div class="confirmation-modal-content">
            <h3 data-translate="confirm-action">Confirm Action</h3>
            <p data-translate="are-you-sure">${message}</p>
            <div class="confirmation-modal-actions">
                <button class="cancel-btn" data-translate="cancel">Cancel</button>
                <button class="confirm-btn" data-translate="confirm">Confirm</button>
            </div>
        </div>
    `;
    if (window.updateTranslations) {
        window.updateTranslations();
    }
    

    document.body.appendChild(modal);

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('.confirm-btn').addEventListener('click', () => {
        modal.remove();
        onConfirm();
    });

   if (window.updateTranslations) {
        window.updateTranslations();
    }
}

async function loadMyApplications(userId) {
    try {
        const applicationsRef = collection(db, 'applications');
        const q = query(applicationsRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        
        const myApplicationsList = document.getElementById('my-applications-list');
        
        if (!myApplicationsList) {
            console.error('My applications list element not found');
            return;
        }
        
        myApplicationsList.innerHTML = '';
        
        if (querySnapshot.empty) {
            myApplicationsList.innerHTML = `
                <div class="no-applications">
                    <i class="ri-inbox-line"></i>
                    <h3 data-translate="no-applications">No Applications Yet</h3>
                    <p data-translate="dd3">You haven't submitted any job applications yet. Start your job search journey today!</p>
                    <a href="jobs.html" class="btn btn-primary">
                        <i class="ri-search-line"></i>
                        <span data-translate="Browse Jobs">Browse Jobs</span>
                    </a>
                </div>
            `;
            if (window.updateTranslations) {
                window.updateTranslations();
            }
            return;
        }

        let validApplications = 0;
        
        for (const docSnapshot of querySnapshot.docs) {
            const application = docSnapshot.data();
            
            try {
                const jobRef = doc(db, 'jobs', application.jobId);
                const jobDoc = await getDoc(jobRef);
                
                if (!jobDoc.exists()) {
                    console.warn('Job document not found for jobId:', application.jobId);
                    continue;
                }
                
                const jobData = jobDoc.data();
                
                const applicationCard = document.createElement('div');
                applicationCard.className = 'application-card';
                applicationCard.innerHTML = `
                    <div class="application-header">
                        <div class="applicant-info">
                            <div class="applicant-details">
                                <h3>${jobData.jobTitle || 'Untitled Job'}</h3>
                                <p class="job-title">${jobData.companyName || 'Company not specified'}</p>
                                <div class="contact-info">
                                    <span class="contact-item">
                                        <i class="ri-map-pin-line"></i>
                                        ${jobData.location || 'Location not specified'}
                                    </span>
                                    <span class="contact-item">
                                        <i class="ri-money-dollar-circle-line"></i>
                                        ${jobData.salary || 'Salary not specified'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="application-status ${statusColors[application.status || 'pending']}" data-translate="${(application.status)}">
                            ${(application.status || 'pending').charAt(0).toUpperCase() + (application.status || 'pending').slice(1)}
                        </div>
                    </div>
                    <div class="application-content">
                        <div class="cover-letter">
                            <h4 data-translate="my-cover-letter">My Cover Letter</h4>
                            <p>${application.coverLetter || 'No cover letter provided'}</p>
                        </div>
                        ${application.message ? `
                            <div class="status-message">
                                <h4 data-translate="message-employer">Message from Employer</h4>
                                <p>${application.message}</p>
                            </div>
                        ` : ''}
                    </div>
                `;
                
                myApplicationsList.appendChild(applicationCard);
                validApplications++;
                if (window.updateTranslations) {
                    window.updateTranslations();
                }
            } catch (jobError) {
                console.error('Error loading job data:', jobError);
                continue;
            }
        }

        if (validApplications === 0) {
            myApplicationsList.innerHTML = `
                <div class="no-applications">
                    <i class="ri-inbox-line"></i>
                    <h3>No Active Applications</h3>
                    <p>Your previous applications are no longer available as the jobs have been removed. You can start fresh by browsing new job opportunities.</p>
                    <a href="jobs.html" class="btn btn-primary">
                        <i class="ri-search-line"></i>
                        Browse Jobs
                    </a>
                </div>
            `;
        }
        
        initializeMyApplicationsSearch();
    } catch (error) {
        console.error('Error loading my applications:', error);
        const myApplicationsList = document.getElementById('my-applications-list');
        if (myApplicationsList) {
            myApplicationsList.innerHTML = `
                <div class="error-message">
                    <i class="ri-error-warning-line"></i>
                    <h3>Error Loading Applications</h3>
                    <p>There was an error loading your applications. Please try again later.</p>
                </div>
            `;
        }
    }
}

function initializeMyApplicationsSearch() {
    const searchInput = document.getElementById('my-applications-search');
    const statusFilter = document.getElementById('my-applications-filter');
    
    if (searchInput && statusFilter) {
        searchInput.removeEventListener('input', filterMyApplications);
        statusFilter.removeEventListener('change', filterMyApplications);
        
        searchInput.addEventListener('input', filterMyApplications);
        statusFilter.addEventListener('change', filterMyApplications);
    }
}

function filterMyApplications() {
    const searchInput = document.getElementById('my-applications-search');
    const statusFilter = document.getElementById('my-applications-filter');
    const applications = document.querySelectorAll('#my-applications-list .application-card');
    
    if (!searchInput || !statusFilter || !applications.length) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const selectedStatus = statusFilter.value;
    let hasVisibleResults = false;
    
    applications.forEach(card => {
        const jobTitle = card.querySelector('.applicant-details h3')?.textContent.toLowerCase() || '';
        const companyName = card.querySelector('.job-title')?.textContent.toLowerCase() || '';
        const status = card.querySelector('.application-status')?.textContent.toLowerCase() || '';
        
        const matchesSearch = jobTitle.includes(searchTerm) || companyName.includes(searchTerm);
        const matchesStatus = selectedStatus === 'all' || status.includes(selectedStatus);
        
        if (matchesSearch && matchesStatus) {
            card.style.display = 'block';
            hasVisibleResults = true;
        } else {
            card.style.display = 'none';
        }
    });

    const myApplicationsList = document.getElementById('my-applications-list');
    const noResultsMessage = myApplicationsList.querySelector('.no-results-message');
    
    if (!hasVisibleResults) {
        if (!noResultsMessage) {
            const message = document.createElement('div');
            message.className = 'no-results-message';
            message.innerHTML = `
                <i class="ri-search-line"></i>
                <h3 data-translate="no-application-found">No Applications Found</h3>
                <p data-translate="no-application-text">No applications match your current filter criteria.</p>
            `;
              if (window.updateTranslations) {
                window.updateTranslations();
            }
            myApplicationsList.appendChild(message);
             if (window.updateTranslations) {
                window.updateTranslations();
            }
        }
    } else if (noResultsMessage) {
        noResultsMessage.remove();
    }
}
