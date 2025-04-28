// DOM Elements
const applicationsList = document.getElementById('applicationsList');
const applicationModal = document.getElementById('applicationModal');
const closeModal = document.querySelector('.close-modal');
const statusUpdate = document.getElementById('statusUpdate');
const adminMessage = document.getElementById('adminMessage');
const updateStatusBtn = document.getElementById('updateStatus');
const statusFilter = document.getElementById('statusFilter');
const jobFilter = document.getElementById('jobFilter');
const notificationBell = document.querySelector('.bell');
const h1 = document.querySelector('h1');
// Import Firebase auth
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log('Admin page initialized');
console.log('DOM Elements:', {
    applicationsList,
    applicationModal,
    closeModal,
    statusUpdate,
    adminMessage,
    updateStatusBtn,
    statusFilter,
    jobFilter,
    notificationBell
});

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin page loaded, initializing...');
    
    // Check if we're on the admin page
    if (!applicationsList) {
        console.error('Not on admin page or applicationsList element not found');
        return;
    }
    
    // Check authentication
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
            return;
        }
        
        console.log('Current user authenticated:', user.uid);
        
        // Load applications for the current user
        loadApplications(user.uid);
        
        // Add event listeners
        if (closeModal) {
            closeModal.addEventListener('click', closeApplicationModal);
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', filterApplications);
        }
        
        if (jobFilter) {
            jobFilter.addEventListener('change', filterApplications);
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === applicationModal) {
                closeApplicationModal();
            }
        });
    });
});

// Load applications from localStorage
function loadApplications(userId) {
    console.log('Loading applications for user:', userId);
    
    // Check localStorage data
    const rawData = localStorage.getItem('jobApplications');
    const jobsData = localStorage.getItem('jobs');
    console.log('Raw localStorage data for jobApplications:', rawData);
    console.log('Raw localStorage data for jobs:', jobsData);
    
    if (!rawData || !jobsData) {
        console.log('No applications or jobs found in localStorage');
        showNoJobsMessage();
        return;
    }
    
    try {
        const applications = JSON.parse(rawData);
        const jobs = JSON.parse(jobsData);
        console.log('Parsed applications:', applications);
        console.log('Parsed jobs:', jobs);
        
        // Get user's jobs
        const userJobs = jobs.filter(job => job.userId === userId);
        console.log('User jobs:', userJobs);
        
        // Show no jobs message if user hasn't posted any jobs
        if (userJobs.length === 0) {
            console.log('User has not posted any jobs');
            showNoJobsMessage();
            return;
        }
        
        // Check if we have any applications
        if (!applications || applications.length === 0) {
            console.log('No applications found in localStorage');
            applicationsList.innerHTML = '<p class="no-applications">No applications found</p>';
            return;
        }
        
        // Filter applications to only show those for jobs posted by the current user
        // First try using jobPosterId field
        let filteredApplications = applications.filter(app => app.jobPosterId === userId);
        console.log('Filtered applications by jobPosterId:', filteredApplications);
        
        // If no applications found with jobPosterId, fall back to the old method
        if (filteredApplications.length === 0) {
            const userJobIds = userJobs.map(job => job.id);
            console.log('User job IDs:', userJobIds);
            
            filteredApplications = applications.filter(app => userJobIds.includes(app.jobId));
            console.log('Filtered applications by jobId (fallback):', filteredApplications);
        }
        
        // Update job filter options
        updateJobFilter(userJobs);
        
        // Log each application's details
        filteredApplications.forEach((app, index) => {
            console.log(`Application ${index + 1} details:`, {
                id: app.id,
                jobId: app.jobId,
                jobPosterId: app.jobPosterId,
                jobTitle: app.jobTitle,
                fullName: app.fullName,
                email: app.email,
                phone: app.phone,
                status: app.status,
                applicationDate: app.applicationDate,
                coverLetter: app.coverLetter,
                resume: app.resume,
                messages: app.messages
            });
        });
        
        displayApplications(filteredApplications);
        updateStats(filteredApplications);
        checkNewMessages(filteredApplications);
    } catch (error) {
        console.error('Error parsing applications:', error);
        applicationsList.innerHTML = '<p class="error">Error loading applications</p>';
    }
}

// Show message when user has no job postings
function showNoJobsMessage() {
    const noJobsMessage = document.getElementById('noJobsMessage');
    const applicationsList = document.getElementById('applicationsList');
    
    if (noJobsMessage) {
        noJobsMessage.style.display = 'block';
    }
    
    if (applicationsList) {
        applicationsList.style.display = 'none';
    }
    
    // Hide stats since there are no jobs
    const stats = document.querySelector('.admin-stats');
    if (stats) {
        stats.style.display = 'none';
    }
    
    // Hide filters since there are no jobs
    const filters = document.querySelector('.filters');
    if (filters) {
        filters.style.display = 'none';
    }
}

// Update job filter options
function updateJobFilter(userJobs) {
    if (!jobFilter) return;
    
    // Clear existing options except the first one
    while (jobFilter.options.length > 1) {
        jobFilter.remove(1);
    }
    
    // Add options for each job
    userJobs.forEach(job => {
        const option = document.createElement('option');
        option.value = job.id;
        option.textContent = job.title;
        jobFilter.appendChild(option);
    });
}

// Check for new messages
function checkNewMessages(applications) {
    const hasNewMessages = applications.some(app => app.hasNewMessage);
    
    if (hasNewMessages) {
        notificationBell.classList.remove('nonee');
    } else {
        notificationBell.classList.add('nonee');
    }
}

// Display applications in the list
function displayApplications(applications) {
    console.log('Displaying applications:', applications);
    if (!applicationsList) {
        console.error('applicationsList element not found');
        return;
    }

    applicationsList.innerHTML = '';
    
    applications.forEach(application => {
        console.log('Creating card for application:', application);
        const card = document.createElement('div');
        card.className = 'application-card';
        
        // Check if this is a sample job (IDs 1,2,3)
        const isSampleJob = ['1', '2', '3'].includes(application.jobId);
        
        card.innerHTML = `
            <div class="application-info">
                <h3>${application.jobTitle || 'No Job Title'}</h3>
                <div class="applicant-details">
                    <p class="applicant-name"><strong>Name:</strong> ${application.fullName || 'Not provided'}</p>
                    <p class="applicant-email"><strong>Email:</strong> ${application.email || 'Not provided'}</p>
                    <p class="applicant-phone"><strong>Phone:</strong> ${application.phone || 'Not provided'}</p>
                    <p class="application-date"><strong>Applied:</strong> ${new Date(application.applicationDate).toLocaleDateString()}</p>
                    ${application.hasNewMessage ? '<span class="new-message-badge">New Message</span>' : ''}
                </div>
                <div class="cover-letter-preview">
                    <p><strong>Cover Letter:</strong> ${application.coverLetter ? application.coverLetter.substring(0, 100) + '...' : 'Not provided'}</p>
                </div>
            </div>
            <div class="application-status status-${(application.status || 'Pending').toLowerCase()}">
                ${application.status || 'Pending'}
            </div>
        `;
        
        // Only add click handler if it's not a sample job
        if (!isSampleJob) {
            card.addEventListener('click', () => {
                console.log('Opening modal for application:', application);
                openApplicationModal(application);
            });
        } else {
            card.classList.add('sample-job');
        }
        
        applicationsList.appendChild(card);
    });
}

// Update statistics
function updateStats(applications) {
    console.log('Updating stats for applications:', applications);
    const total = applications.length;
    const pending = applications.filter(app => (app.status || 'Pending') === 'Pending').length;
    const approved = applications.filter(app => (app.status || 'Pending') === 'Approved').length;
    const rejected = applications.filter(app => (app.status || 'Pending') === 'Rejected').length;

    console.log('Stats:', { total, pending, approved, rejected });

    document.getElementById('totalApplications').textContent = total;
    document.getElementById('pendingApplications').textContent = pending;
    document.getElementById('approvedApplications').textContent = approved;
    document.getElementById('rejectedApplications').textContent = rejected;
}

// Open application modal
function openApplicationModal(application) {
    console.log('Opening application modal for:', application);
    const modalContent = document.querySelector('.modal-content');
    const isSampleJob = application.jobId === 'sample-job';
    
    // Get the job details from localStorage
    const jobs = JSON.parse(localStorage.getItem('jobs')) || [];
    const job = jobs.find(j => j.id === application.jobId);
    
    console.log('Found job details:', job);
    console.log('Application data:', application);
    
    modalContent.innerHTML = `
        <span class="close-modal">&times;</span>
        <h2>Application Details</h2>
        <div class="application-details">
            <div class="applicant-info">
                <h3>Applicant Information</h3>
                <p><strong>Name:</strong> ${application.fullName || 'Not provided'}</p>
                <p><strong>Email:</strong> ${application.email || 'Not provided'}</p>
                <p><strong>Phone:</strong> ${application.phone || 'Not provided'}</p>
                <p><strong>Resume:</strong> ${application.resume || 'Not provided'}</p>
            </div>
            <div class="job-info">
                <h3>Job Information</h3>
                <p><strong>Position:</strong> ${application.jobTitle || job?.title || 'Not provided'}</p>
                <p><strong>Type:</strong> ${job?.type || application.jobType || 'Not provided'}</p>
                <p><strong>Status:</strong> <span class="status-badge ${(application.status || 'Pending').toLowerCase()}">${application.status || 'Pending'}</span></p>
                <p><strong>Application Date:</strong> ${new Date(application.applicationDate).toLocaleString()}</p>
            </div>
            <div class="cover-letter">
                <h3>Cover Letter</h3>
                <p>${application.coverLetter || 'No cover letter provided'}</p>
            </div>
            <div class="messages">
                <h3>Messages</h3>
                ${application.messages && application.messages.length > 0 
                    ? application.messages.map(msg => `
                        <div class="message ${msg.isAdmin ? 'admin' : 'applicant'}">
                            <p>${msg.text}</p>
                            <span class="message-date">${new Date(msg.timestamp).toLocaleString()}</span>
                        </div>
                    `).join('')
                    : '<p>No messages yet</p>'
                }
            </div>
            ${!isSampleJob ? `
                <div class="status-update">
                    <h3>Update Status</h3>
                    <div class="status-update-form">
                        <select id="statusUpdate">
                            <option value="Pending" ${application.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Approved" ${application.status === 'Approved' ? 'selected' : ''}>Approved</option>
                            <option value="Rejected" ${application.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                        <textarea id="adminMessage" placeholder="Add a message (minimum 15 words required)" required></textarea>
                        <p id="wordCountMessage" style="color: red; margin-top: 5px; font-size: 14px;"></p>
                        <button id="updateStatus" class="update-btn">Update Status</button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    // Set the application ID for the update function
    applicationModal.dataset.id = application.id;

    // Add event listener for the update button
    const updateBtn = document.getElementById('updateStatus');
    if (updateBtn) {
        updateBtn.addEventListener('click', updateApplicationStatus);
    }

    // Add word count listener
    const messageTextarea = document.getElementById('adminMessage');
    const wordCountMessage = document.getElementById('wordCountMessage');
    if (messageTextarea && wordCountMessage) {
        messageTextarea.addEventListener('input', function() {
            const wordCount = this.value.trim().split(/\s+/).filter(word => word.length > 0).length;
            if (this.value.trim() === '') {
                wordCountMessage.textContent = 'Message cannot be empty';
            } else if (wordCount < 15) {
                wordCountMessage.textContent = `Please enter at least 15 words (currently: ${wordCount} words)`;
            } else {
                wordCountMessage.textContent = '';
            }
        });
    }

    // Mark message as read
    if (application.hasNewMessage) {
        const applications = JSON.parse(localStorage.getItem('jobApplications')) || [];
        const updatedApplications = applications.map(app => {
            if (app.id === application.id) {
                app.hasNewMessage = false;
            }
            return app;
        });
        localStorage.setItem('jobApplications', JSON.stringify(updatedApplications));
        checkNewMessages(updatedApplications);
    }

    applicationModal.style.display = 'block';
}

// Close modal
function closeApplicationModal() {
    applicationModal.style.display = 'none';
    statusUpdate.value = '';
    adminMessage.value = '';
}

// Update application status
function updateApplicationStatus() {
    console.log('Updating application status...');
    const applications = JSON.parse(localStorage.getItem('jobApplications')) || [];
    const applicationId = applicationModal.dataset.id;
    const newStatus = document.getElementById('statusUpdate').value;
    const message = document.getElementById('adminMessage').value.trim();

    // Check if message is empty
    if (!message) {
        document.getElementById('wordCountMessage').textContent = 'Message cannot be empty';
        return;
    }

    // Check if message has at least 15 words
    const wordCount = message.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 15) {
        document.getElementById('wordCountMessage').textContent = `Please enter at least 15 words (currently: ${wordCount} words)`;
        return;
    }

    console.log('Update data:', {
        applicationId,
        newStatus,
        message
    });

    const updatedApplications = applications.map(app => {
        if (app.id === applicationId) {
            console.log('Updating application:', app);
            app.status = newStatus;
            if (message) {
                if (!app.messages) {
                    console.log('Creating new messages array');
                    app.messages = [];
                }
                const newMessage = {
                    text: message,
                    timestamp: new Date().toISOString(),
                    isAdmin: true
                };
                console.log('Adding new message:', newMessage);
                app.messages.push(newMessage);
                app.hasNewMessage = true;
            }
            app.updatedAt = new Date().toISOString();
            console.log('Updated application:', app);
        }
        return app;
    });

    console.log('Saving updated applications:', updatedApplications);
    localStorage.setItem('jobApplications', JSON.stringify(updatedApplications));
    
    showNotification(newStatus, message);
    closeApplicationModal();
    loadApplications(auth.currentUser.uid);
}

// Show notification
function showNotification(status, message) {
    const notification = document.createElement('div');
    notification.className = `notification ${status.toLowerCase()}`;
    notification.innerHTML = `
        <i class="fas fa-${status === 'Approved' ? 'check-circle' : 'times-circle'}"></i>
        <div class="notification-content">
            <h4>Application ${status}</h4>
            <p>${message || 'Status updated'}</p>
        </div>
        <button class="close-notification">&times;</button>
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);

    // Close notification button
    const closeBtn = notification.querySelector('.close-notification');
    closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Filter applications
function filterApplications() {
    const statusValue = statusFilter.value;
    const jobValue = jobFilter.value;
    
    // Get all applications from localStorage
    const applications = JSON.parse(localStorage.getItem('jobApplications')) || [];
    const jobs = JSON.parse(localStorage.getItem('jobs')) || [];
    
    // Get current user's jobs
    const userJobs = jobs.filter(job => job.userId === auth.currentUser.uid);
    const userJobIds = userJobs.map(job => job.id);
    
    // Filter applications
    let filteredApplications = applications.filter(app => userJobIds.includes(app.jobId));
    
    // Apply status filter
    if (statusValue !== 'all') {
        filteredApplications = filteredApplications.filter(app => app.status === statusValue);
    }
    
    // Apply job filter
    if (jobValue !== 'all') {
        filteredApplications = filteredApplications.filter(app => app.jobId === jobValue);
    }
    
    // Display filtered applications
    displayApplications(filteredApplications);
    updateStats(filteredApplications);
}

// Function to check localStorage data
function checkLocalStorageData() {
    console.log('Checking localStorage data...');
    const keys = Object.keys(localStorage);
    console.log('All localStorage keys:', keys);
    
    keys.forEach(key => {
        try {
            const value = localStorage.getItem(key);
            console.log(`Key: ${key}`);
            console.log('Value:', value);
            if (key === 'jobApplications') {
                const parsed = JSON.parse(value);
                console.log('Parsed jobApplications:', parsed);
            }
        } catch (error) {
            console.error(`Error reading ${key}:`, error);
        }
    });
}

// Function to fix jobs without userId
function fixJobsWithoutUserId() {
    console.log('Checking for jobs without userId...');
    const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!currentUser || !currentUser.uid) {
        console.log('No current user found, cannot fix jobs');
        return;
    }
    
    let jobsFixed = false;
    const updatedJobs = jobs.map(job => {
        if (!job.userId) {
            console.log('Found job without userId:', job);
            job.userId = currentUser.uid;
            jobsFixed = true;
        }
        return job;
    });
    
    if (jobsFixed) {
        console.log('Fixed jobs without userId');
        localStorage.setItem('jobs', JSON.stringify(updatedJobs));
    } else {
        console.log('No jobs needed fixing');
    }
}

// Call checkLocalStorageData when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin dashboard initialized');
    checkLocalStorageData();
    
    // Fix any jobs without userId
    fixJobsWithoutUserId();
    
    // Load applications for the current user
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadApplications(user.uid);
        }
    });
    
    // Add event listeners for modals
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', closeApplicationModal);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === applicationModal) {
            closeApplicationModal();
        }
    });
}); 