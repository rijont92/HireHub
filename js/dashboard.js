import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// DOM Elements
const applicationsList = document.getElementById('applications-list');
const userNameElement = document.getElementById('user-name');
const userEmailElement = document.getElementById('user-email');
const searchInput = document.querySelector('.search-box input');
const filterSelect = document.querySelector('.filter-dropdown select');

// Application status colors
const statusColors = {
    pending: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected'
};

// Tab switching functionality
const tabLinks = document.querySelectorAll('.sidebar-nav a');
let contentSections = {};

// Initialize content sections after DOM is loaded
function initializeContentSections() {
    contentSections = {
        'applications': document.querySelector('.dashboard-content'),
        'posted-jobs': document.createElement('div')
    };

    // Initialize other content sections
    contentSections['posted-jobs'].className = 'dashboard-content';

    // Add content for other sections
    contentSections['posted-jobs'].innerHTML = `
        <div class="content-header">
            <h1>Posted Jobs</h1>
            <a href="post-job.html" class="btn btn-primary">Post New Job</a>
        </div>
        <div class="posted-jobs-list" id="posted-jobs-list">
            <!-- Posted jobs will be loaded here -->
        </div>
    `;

    // Add all sections to the DOM
    const mainContent = document.querySelector('.dashboard-content').parentElement;
    Object.values(contentSections).forEach(section => {
        if (section !== contentSections['applications']) {
            mainContent.appendChild(section);
            section.style.display = 'none';
        }
    });
}

// Add click event listeners to tab links
function initializeTabLinks() {
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all tabs
            tabLinks.forEach(tab => {
                tab.parentElement.classList.remove('active');
            });
            
            // Add active class to clicked tab
            link.parentElement.classList.add('active');
            
            // Get the target section
            const target = link.getAttribute('href').substring(1);
            
            // Hide all content sections
            Object.values(contentSections).forEach(section => {
                section.style.display = 'none';
            });
            
            // Show the selected content section
            if (contentSections[target]) {
                contentSections[target].style.display = 'block';
                
                // Load content for the selected section
                switch (target) {
                    case 'applications':
                        loadApplications(auth.currentUser.uid);
                        break;
                    case 'posted-jobs':
                        loadPostedJobs(auth.currentUser.uid);
                        break;
                }
            }
        });
    });
}

// Check authentication state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // Get user data from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.data();

            // Update user info in sidebar
            const userAvatarElement = document.querySelector('.user-avatar');

            userNameElement.textContent = userData?.name || user.displayName || 'User';
            userEmailElement.textContent = user.email;

            // Update avatar with profile image if available
            if (userData?.profileImage) {
                userAvatarElement.innerHTML = `<img src="${userData.profileImage}" alt="Profile" class="profile-image">`;
            } else {
                userAvatarElement.innerHTML = `<i class="ri-user-line"></i>`;
            }

            // Initialize content sections and tab links
            initializeContentSections();
            initializeTabLinks();

            // Show applications tab by default
            contentSections['applications'].style.display = 'block';
            loadApplications(user.uid);
        } catch (error) {
            console.error('Error loading user data:', error);
            // Fallback to basic user info if Firestore data fails to load
            userNameElement.textContent = user.displayName || 'User';
            userEmailElement.textContent = user.email;
        }
    } else {
        window.location.href = '/html/login.html';
    }
});

// Load applications for the current user
async function loadApplications(userId) {
    try {
        console.log('Loading applications for user:', userId);
        
        // Query jobs posted by the current user
        const jobsQuery = query(
            collection(db, 'jobs'),
            where('postedBy', '==', userId)
        );
        const jobsSnapshot = await getDocs(jobsQuery);
        
        console.log('Found jobs:', jobsSnapshot.size);
        
        // Get all job IDs
        const jobIds = jobsSnapshot.docs.map(doc => doc.id);
        
        // If no jobs are found, show the no jobs message
        if (jobIds.length === 0) {
            applicationsList.innerHTML = `
                <div class="no-applications">
                    <i class="ri-inbox-line"></i>
                    <h3>No Jobs Posted</h3>
                    <p>You haven't posted any jobs yet. Start by posting a job to receive applications.</p>
                    <a href="post-job.html" class="btn btn-primary">Post a Job</a>
                </div>
            `;
            return;
        }
        
        // Query applications for these jobs
        const applicationsQuery = query(
            collection(db, 'applications'),
            where('jobId', 'in', jobIds)
        );
        const applicationsSnapshot = await getDocs(applicationsQuery);
        
        console.log('Found applications:', applicationsSnapshot.size);
        
        // Clear existing applications
        applicationsList.innerHTML = '';
        
        // If no applications are found, show a message
        if (applicationsSnapshot.empty) {
            applicationsList.innerHTML = `
                <div class="no-applications">
                    <i class="ri-inbox-line"></i>
                    <h3>No Applications Yet</h3>
                    <p>You haven't received any applications for your posted jobs yet.</p>
                </div>
            `;
            return;
        }
        
        // Display applications
        for (const applicationDoc of applicationsSnapshot.docs) {
            const application = applicationDoc.data();
            console.log('Processing application:', application);
            
            // Get the job details
            const jobDocRef = doc(db, 'jobs', application.jobId);
            const jobDoc = await getDoc(jobDocRef);
            const jobData = jobDoc.data();
            
            // Get the applicant's profile data
            const userDocRef = doc(db, 'users', application.userId);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.data();
            
            displayApplication(applicationDoc.id, application, jobData, userData);
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        applicationsList.innerHTML = `
            <div class="error-message">
                <i class="ri-error-warning-line"></i>
                <h3>Error Loading Applications</h3>
                <p>There was an error loading your applications. Please try again later.</p>
            </div>
        `;
    }
}

// Helper function to get initials from full name
function getInitials(name) {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Display a single application
function displayApplication(applicationId, application, jobData, userData) {
    console.log('Displaying application:', application);
    console.log('Job data:', jobData);
    console.log('User data:', userData);
    
    const applicationCard = document.createElement('div');
    applicationCard.className = 'application-card';
    
    const initials = getInitials(application.fullName || 'Anonymous Applicant');
    const profileImage = userData?.profileImage || null;
    
    applicationCard.innerHTML = `
        <div class="application-header">
            <div class="applicant-info">
                <div class="applicant-avatar">
                    ${profileImage ? 
                        `<img src="${profileImage}" alt="${application.fullName}" class="profile-image">` :
                        `<div class="avatar-circle">
                            <span class="avatar-initials">${initials}</span>
                        </div>`
                    }
                </div>
                <div class="applicant-details">
                    <h3>${application.fullName || 'Anonymous Applicant'}</h3>
                    <p class="job-title">Applied for: ${jobData?.jobTitle || 'Unknown Job'}</p>
                    <div class="contact-info">
                        <span class="contact-item">
                            <i class="ri-mail-line"></i>
                            ${application.email}
                        </span>
                        <span class="contact-item">
                            <i class="ri-phone-line"></i>
                            ${application.phone}
                        </span>
                    </div>
                </div>
            </div>
            <div class="application-status ${statusColors[application.status || 'pending']}">
                ${(application.status || 'pending').charAt(0).toUpperCase() + (application.status || 'pending').slice(1)}
            </div>
        </div>
        <div class="application-content">
            <div class="cover-letter">
                <h4>Cover Letter</h4>
                <p>${application.coverLetter || 'No cover letter provided'}</p>
            </div>
            <div class="application-actions">
                ${(application.status === 'pending' || !application.status) ? `
                    <button class="btn btn-primary approve-btn" data-application-id="${applicationId}">
                        <i class="ri-check-line"></i> Approve
                    </button>
                    <button class="btn btn-outline reject-btn" data-application-id="${applicationId}">
                        <i class="ri-close-line"></i> Reject
                    </button>
                ` : ''}
                <button class="btn btn-danger delete-btn" data-application-id="${applicationId}">
                    <i class="ri-delete-bin-line"></i> Delete
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners after the element is added to the DOM
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
            if (confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
                deleteApplication(applicationId);
            }
        });
    }
    
    applicationsList.appendChild(applicationCard);
}

// Function to show status update modal
function showStatusUpdateModal(applicationId, newStatus) {
    const modal = document.createElement('div');
    modal.className = 'status-update-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>${newStatus === 'approved' ? 'Approve' : 'Reject'} Application</h3>
            <div class="form-group">
                <label for="status-message">Message to Applicant</label>
                <textarea id="status-message" placeholder="Enter your message to the applicant..." required></textarea>
            </div>
            <div class="modal-actions">
                <button class="btn btn-outline cancel-btn">Cancel</button>
                <button class="btn btn-primary confirm-btn">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle cancel button
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        modal.remove();
    });

    // Handle confirm button
    modal.querySelector('.confirm-btn').addEventListener('click', async () => {
        const message = modal.querySelector('#status-message').value.trim();
        if (!message) {
            alert('Please enter a message before confirming.');
            return;
        }
        await updateApplicationStatus(applicationId, newStatus, message);
        modal.remove();
    });
}

// Update application status
async function updateApplicationStatus(applicationId, newStatus, message = '') {
    try {
        // Get the application document
        const applicationRef = doc(db, 'applications', applicationId);
        const applicationDoc = await getDoc(applicationRef);
        const application = applicationDoc.data();
        
        if (!application) {
            throw new Error('Application not found');
        }

        // Get the job document
        const jobRef = doc(db, 'jobs', application.jobId);
        const jobDoc = await getDoc(jobRef);
        const jobData = jobDoc.data();

        if (!jobData) {
            throw new Error('Job not found');
        }

        // Start a batch write
        const batch = writeBatch(db);

        // Update application status and message
        batch.update(applicationRef, {
            status: newStatus,
            message: message,
            updatedAt: new Date().toISOString()
        });

        // Update job's applications array
        let applications = jobData.applications || [];
        if (newStatus === 'approved') {
            // Add to approved applications if not already there
            if (!applications.includes(application.userId)) {
                applications.push(application.userId);
            }
        } else if (newStatus === 'rejected') {
            // Remove from applications if rejected
            applications = applications.filter(id => id !== application.userId);
        }

        // Update job document
        batch.update(jobRef, {
            applications: applications,
            updatedAt: new Date().toISOString()
        });

        // Commit the batch
        await batch.commit();

        // Show success message
        const statusMessage = newStatus === 'approved' ? 'approved' : 'rejected';
        alert(`Application has been ${statusMessage} successfully!`);

        // Reload applications to show updated status
        await loadApplications(auth.currentUser.uid);

        // Update the status in the jobs page if it's open
        if (window.location.pathname.includes('jobs.html')) {
            // Find the application card in the jobs page
            const applicationCards = document.querySelectorAll('.application-card');
            applicationCards.forEach(card => {
                if (card.dataset.applicationId === applicationId) {
                    // Update the status display
                    const statusElement = card.querySelector('.application-status');
                    if (statusElement) {
                        statusElement.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                        statusElement.className = `application-status ${statusColors[newStatus]}`;
                    }
                }
            });
        }

        // Update the status in the profile page if it's open
        if (window.location.pathname.includes('profile.html')) {
            // Find the application card in the profile page
            const applicationCards = document.querySelectorAll('.job-card');
            applicationCards.forEach(card => {
                if (card.dataset.applicationId === applicationId) {
                    // Update the status display
                    const statusElement = card.querySelector('.status');
                    if (statusElement) {
                        statusElement.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                        statusElement.className = `status ${newStatus}`;
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error updating application status:', error);
        alert('Failed to update application status. Please try again.');
    }
}

// Send message to applicant
function sendMessage(applicantId, applicantName) {
    // TODO: Implement messaging functionality
    alert(`Messaging ${applicantName}...`);
}

// Search and filter applications
searchInput.addEventListener('input', filterApplications);
filterSelect.addEventListener('change', filterApplications);

function filterApplications() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterSelect.value;
    
    const applications = document.querySelectorAll('.application-card');
    
    applications.forEach(card => {
        const applicantName = card.querySelector('.applicant-details h3').textContent.toLowerCase();
        const jobTitle = card.querySelector('.applicant-details p').textContent.toLowerCase();
        const status = card.querySelector('.application-status').textContent.toLowerCase();
        
        const matchesSearch = applicantName.includes(searchTerm) || jobTitle.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || status.includes(statusFilter);
        
        card.style.display = matchesSearch && matchesStatus ? 'block' : 'none';
    });
}

// Function to load posted jobs
async function loadPostedJobs(userId) {
    try {
        console.log('Loading jobs for user:', userId);
        
        const jobsQuery = query(
            collection(db, 'jobs'),
            where('postedBy', '==', userId)
        );
        const jobsSnapshot = await getDocs(jobsQuery);
        
        console.log('Found jobs:', jobsSnapshot.size);
        
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
                    <h3>No Jobs Posted</h3>
                    <p>You haven't posted any jobs yet. Start by posting a job to receive applications.</p>
                    <a href="post-job.html" class="btn btn-primary">Post a Job</a>
                </div>
            `;
            return;
        }
        
        jobsSnapshot.forEach(doc => {
            const job = doc.data();
            console.log('Job data:', job); // Debug log to see the actual job data structure
            
            const jobCard = document.createElement('div');
            jobCard.className = 'job-card';
            jobCard.innerHTML = `
                <div class="job-header">
                    <h3>${job.jobTitle || 'Untitled Job'}</h3>
                    <span class="job-status">${job.status || 'Active'}</span>
                </div>
                <div class="job-details">
                    <p><i class="ri-map-pin-line"></i> ${job.location || 'Location not specified'}</p>
                    <p><i class="ri-money-dollar-circle-line"></i> ${job.salary || 'Salary not specified'}</p>
                    <p><i class="ri-time-line"></i> Posted ${job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Date not specified'}</p>
                </div>
                <div class="job-actions">
                    <button class="btn btn-outline" onclick="editJob('${doc.id}')">Edit</button>
                </div>
            `;
            jobsList.appendChild(jobCard);
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

// Add this new function at the end of the file
async function deleteApplication(applicationId) {
    try {
        const applicationRef = doc(db, 'applications', applicationId);
        const applicationDoc = await getDoc(applicationRef);
        const application = applicationDoc.data();

        if (!application) {
            throw new Error('Application not found');
        }

        // Get the job document
        const jobRef = doc(db, 'jobs', application.jobId);
        const jobDoc = await getDoc(jobRef);
        const jobData = jobDoc.data();

        if (!jobData) {
            throw new Error('Job not found');
        }

        // Start a batch write
        const batch = writeBatch(db);

        // Delete the application
        batch.delete(applicationRef);

        // Update job's applications array to remove the user
        let applications = jobData.applications || [];
        applications = applications.filter(id => id !== application.userId);

        // Update job document
        batch.update(jobRef, {
            applications: applications,
            updatedAt: new Date().toISOString()
        });

        // Commit the batch
        await batch.commit();

        // Show success message
        alert('Application deleted successfully!');

        // Reload applications to update the display
        await loadApplications(auth.currentUser.uid);
    } catch (error) {
        console.error('Error deleting application:', error);
        alert('Failed to delete application. Please try again.');
    }
}

// Function to edit a job
async function editJob(jobId) {
    try {
        // Get the job document
        const jobRef = doc(db, 'jobs', jobId);
        const jobDoc = await getDoc(jobRef);
        const jobData = jobDoc.data();

        if (!jobData) {
            throw new Error('Job not found');
        }

        // Fill the form with job data
        document.getElementById('editJobTitle').value = jobData.jobTitle;
        document.getElementById('editCompanyName').value = jobData.companyName;
        document.getElementById('editJobType').value = jobData.jobType;
        document.getElementById('editLocation').value = jobData.location;
        document.getElementById('editSalary').value = jobData.salary;
        document.getElementById('editJobDescription').value = jobData.jobDescription;
        document.getElementById('editRequirements').value = jobData.requirements;
        document.getElementById('editBenefits').value = jobData.benefits;
        document.getElementById('editApplicationDeadline').value = jobData.applicationDeadline;
        document.getElementById('editContactEmail').value = jobData.contactEmail;
        document.getElementById('editStatus').value = jobData.status || 'active';

        // Store the job ID for later use
        document.getElementById('editJobForm').dataset.jobId = jobId;

        // Show the popup
        document.getElementById('editPopupOverlay').style.display = 'block';
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Error editing job:', error);
        alert('Failed to edit job. Please try again.');
    }
}

// Function to close the edit popup
function closeEditPopup() {
    document.getElementById('editPopupOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Handle form submission
document.getElementById('editJobForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const jobId = this.dataset.jobId;
    if (!jobId) {
        alert('Job ID not found');
        return;
    }

    try {
        // Get form data
        const formData = {
            jobTitle: document.getElementById('editJobTitle').value,
            companyName: document.getElementById('editCompanyName').value,
            jobType: document.getElementById('editJobType').value,
            location: document.getElementById('editLocation').value,
            salary: document.getElementById('editSalary').value,
            jobDescription: document.getElementById('editJobDescription').value,
            requirements: document.getElementById('editRequirements').value,
            benefits: document.getElementById('editBenefits').value,
            applicationDeadline: document.getElementById('editApplicationDeadline').value,
            contactEmail: document.getElementById('editContactEmail').value,
            status: document.getElementById('editStatus').value,
            lastUpdated: new Date().toISOString()
        };

        // Update the job in Firestore
        await updateDoc(doc(db, 'jobs', jobId), formData);

        // Close the popup
        closeEditPopup();

        // Refresh the jobs list
        loadPostedJobs(auth.currentUser.uid);

        // Show success notification
        showNotification('Job updated successfully!');
    } catch (error) {
        console.error('Error updating job:', error);
        showNotification('Error updating job. Please try again.', 'error');
    }
});

// Close popup when clicking outside
document.getElementById('editPopupOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeEditPopup();
    }
});

// Make functions available globally
window.editJob = editJob;
window.closeEditPopup = closeEditPopup;
