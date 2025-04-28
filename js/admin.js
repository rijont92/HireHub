import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { collection, query, where, getDocs, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// DOM Elements
const totalApplicationsEl = document.getElementById('totalApplications');
const pendingApplicationsEl = document.getElementById('pendingApplications');
const approvedApplicationsEl = document.getElementById('approvedApplications');
const rejectedApplicationsEl = document.getElementById('rejectedApplications');
const applicationsListEl = document.getElementById('applicationsList');
const statusFilterEl = document.getElementById('statusFilter');
const jobFilterEl = document.getElementById('jobFilter');
const noJobsMessageEl = document.getElementById('noJobsMessage');
const applicationModalEl = document.getElementById('applicationModal');
const applicationDetailsEl = document.getElementById('applicationDetails');
const statusUpdateEl = document.getElementById('statusUpdate');
const adminMessageEl = document.getElementById('adminMessage');
const updateStatusBtn = document.getElementById('updateStatus');
const closeModalBtn = document.querySelector('.close-modal');

let currentUser = null;
let applications = [];
let currentApplication = null;

// Initialize the dashboard
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadApplications();
        setupEventListeners();
    } else {
        window.location.href = 'login.html';
    }
});

// Load applications for the current user's jobs
async function loadApplications() {
    try {
        // Get all jobs posted by the current user
        const jobsQuery = query(
            collection(db, 'jobs'),
            where('employerId', '==', currentUser.uid)
        );
        const jobsSnapshot = await getDocs(jobsQuery);
        
        if (jobsSnapshot.empty) {
            noJobsMessageEl.style.display = 'block';
            return;
        }

        // Get all applications for these jobs
        const jobIds = jobsSnapshot.docs.map(doc => doc.id);
        const applicationsQuery = query(
            collection(db, 'applications'),
            where('jobId', 'in', jobIds)
        );
        const applicationsSnapshot = await getDocs(applicationsQuery);
        
        applications = applicationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        updateStatistics();
        updateApplicationsList();
        updateJobFilter();
    } catch (error) {
        console.error('Error loading applications:', error);
    }
}

// Update statistics
function updateStatistics() {
    const total = applications.length;
    const pending = applications.filter(app => app.status === 'pending').length;
    const approved = applications.filter(app => app.status === 'approved').length;
    const rejected = applications.filter(app => app.status === 'rejected').length;

    totalApplicationsEl.textContent = total;
    pendingApplicationsEl.textContent = pending;
    approvedApplicationsEl.textContent = approved;
    rejectedApplicationsEl.textContent = rejected;
}

// Update applications list
function updateApplicationsList() {
    const statusFilter = statusFilterEl.value;
    const jobFilter = jobFilterEl.value;

    const filteredApplications = applications.filter(app => {
        const statusMatch = statusFilter === 'all' || app.status === statusFilter;
        const jobMatch = jobFilter === 'all' || app.jobId === jobFilter;
        return statusMatch && jobMatch;
    });

    applicationsListEl.innerHTML = filteredApplications.map(app => `
        <div class="application-card" data-id="${app.id}">
            <div class="application-info">
                <h3>${app.applicantName}</h3>
                <p>${app.jobTitle}</p>
                <span class="status ${app.status}">${app.status}</span>
            </div>
            <button class="view-details">View Details</button>
        </div>
    `).join('');

    // Add event listeners to view details buttons
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', () => {
            const applicationId = button.closest('.application-card').dataset.id;
            showApplicationDetails(applicationId);
        });
    });
}

// Update job filter options
function updateJobFilter() {
    const uniqueJobs = [...new Set(applications.map(app => app.jobId))];
    jobFilterEl.innerHTML = `
        <option value="all">All Jobs</option>
        ${uniqueJobs.map(jobId => {
            const job = applications.find(app => app.jobId === jobId);
            return `<option value="${jobId}">${job.jobTitle}</option>`;
        }).join('')}
    `;
}

// Show application details in modal
function showApplicationDetails(applicationId) {
    currentApplication = applications.find(app => app.id === applicationId);
    
    applicationDetailsEl.innerHTML = `
        <div class="applicant-info">
            <h3>${currentApplication.applicantName}</h3>
            <p>${currentApplication.applicantEmail}</p>
        </div>
        <div class="job-info">
            <h4>Job Details</h4>
            <p>${currentApplication.jobTitle}</p>
            <p>${currentApplication.jobCompany}</p>
        </div>
        <div class="application-content">
            <h4>Application Message</h4>
            <p>${currentApplication.message || 'No message provided'}</p>
        </div>
        <div class="current-status">
            <h4>Current Status</h4>
            <p class="status ${currentApplication.status}">${currentApplication.status}</p>
        </div>
    `;

    statusUpdateEl.value = currentApplication.status;
    adminMessageEl.value = '';
    applicationModalEl.style.display = 'block';
}

// Update application status
async function updateApplicationStatus() {
    try {
        const newStatus = statusUpdateEl.value;
        const message = adminMessageEl.value;

        await updateDoc(doc(db, 'applications', currentApplication.id), {
            status: newStatus,
            adminMessage: message,
            updatedAt: new Date()
        });

        // Update local data
        const index = applications.findIndex(app => app.id === currentApplication.id);
        applications[index] = {
            ...applications[index],
            status: newStatus,
            adminMessage: message
        };

        updateStatistics();
        updateApplicationsList();
        applicationModalEl.style.display = 'none';
    } catch (error) {
        console.error('Error updating application status:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    statusFilterEl.addEventListener('change', updateApplicationsList);
    jobFilterEl.addEventListener('change', updateApplicationsList);
    
    updateStatusBtn.addEventListener('click', updateApplicationStatus);
    
    closeModalBtn.addEventListener('click', () => {
        applicationModalEl.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === applicationModalEl) {
            applicationModalEl.style.display = 'none';
        }
    });
} 