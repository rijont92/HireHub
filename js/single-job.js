import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

document.addEventListener('DOMContentLoaded', function() {
    // Get job ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    if (!jobId) {
        showError('No job ID provided');
        return;
    }

    // Get DOM elements
    const jobTitle = document.getElementById('jobTitle');
    const companyName = document.getElementById('companyName');
    const companyLogo = document.getElementById('companyLogo');
    const jobType = document.getElementById('jobType');
    const location = document.getElementById('location');
    const salary = document.getElementById('salary');
    const deadline = document.getElementById('deadline');
    const jobDescription = document.getElementById('jobDescription');
    const requirements = document.getElementById('requirements');
    const benefits = document.getElementById('benefits');
    const similarJobsContainer = document.getElementById('similarJobs');
    const applyBtn = document.querySelector('.apply-btn');
    const saveBtn = document.querySelector('.save-btn');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Show loading state
    function showLoading() {
        if (loadingSpinner) {
            loadingSpinner.style.display = 'flex';
        }
        if (jobTitle) jobTitle.textContent = 'Loading...';
        if (companyName) companyName.textContent = '';
        if (jobType) jobType.textContent = '';
        if (location) location.textContent = '';
        if (salary) salary.textContent = '';
        if (deadline) deadline.textContent = '';
        if (jobDescription) jobDescription.textContent = '';
        if (requirements) requirements.textContent = '';
        if (benefits) benefits.textContent = '';
        if (similarJobsContainer) similarJobsContainer.innerHTML = '';
    }

    // Show error state
    function showError(message) {
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        if (jobTitle) jobTitle.textContent = 'Error';
        if (companyName) companyName.textContent = message;
        if (jobType) jobType.textContent = '';
        if (location) location.textContent = '';
        if (salary) salary.textContent = '';
        if (deadline) deadline.textContent = '';
        if (jobDescription) jobDescription.textContent = '';
        if (requirements) requirements.textContent = '';
        if (benefits) benefits.textContent = '';
        if (similarJobsContainer) similarJobsContainer.innerHTML = '';
    }

    // Load job data
    async function loadJobData() {
        try {
            showLoading();

            let jobData = null;

            // First try to get the job directly by Firestore document ID
            const jobDoc = await getDoc(doc(db, 'jobs', jobId));
            
            if (!jobDoc.exists()) {
                // If not found, try to find it by searching for the custom job ID
                const jobsQuery = query(
                    collection(db, 'jobs'),
                    where('id', '==', jobId)
                );
                
                const querySnapshot = await getDocs(jobsQuery);
                if (querySnapshot.empty) {
                    showError('Job not found');
                    return;
                }
                
                // Get the first matching job
                const doc = querySnapshot.docs[0];
                jobData = { id: doc.id, ...doc.data() };
            } else {
                // Job found directly by Firestore document ID
                jobData = { id: jobDoc.id, ...jobDoc.data() };
            }

            // Update job details
            updateJobDetails(jobData);

            // Load similar jobs
            await loadSimilarJobs(jobData);
        } catch (error) {
            console.error('Error loading job:', error);
            showError('There was an error loading the job details');
        }
    }

    // Update job details in the UI
    function updateJobDetails(job) {
        if (jobTitle) jobTitle.textContent = job.jobTitle;
        if (companyName) companyName.textContent = job.companyName;
        if (companyLogo) companyLogo.src = job.companyLogo || '../img/logo.png';
        if (jobType) jobType.textContent = job.jobType;
        if (location) location.textContent = job.location;
        if (salary) salary.textContent = job.salary;
        if (deadline) deadline.textContent = formatDate(job.applicationDeadline);
        if (jobDescription) jobDescription.textContent = job.jobDescription;
        if (requirements) requirements.textContent = job.requirements;
        if (benefits) benefits.textContent = job.benefits;
        if (loadingSpinner) loadingSpinner.style.display = 'none';

        // Handle closed job status
        const jobCard = document.querySelector('.job-card');
        const applyBtn = document.querySelector('.apply-btn');
        
        if (job.status === 'closed') {
            jobCard.classList.add('closed');
            applyBtn.disabled = true;
            applyBtn.innerHTML = '<i class="fas fa-lock"></i> Job Closed';
            applyBtn.style.backgroundColor = '#999';
            applyBtn.style.cursor = 'not-allowed';
            
            // Add closed status indicator
            const jobTitleSection = document.querySelector('.job-title-section');
            const statusIndicator = document.createElement('span');
            statusIndicator.className = 'job-status closed';
            statusIndicator.textContent = 'Closed';
            jobTitleSection.appendChild(statusIndicator);
        }
    }

    // Format date
    function formatDate(dateString) {
        try {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(dateString).toLocaleDateString(undefined, options);
        } catch (error) {
            return dateString; // Return original string if date parsing fails
        }
    }

    // Load similar jobs
    async function loadSimilarJobs(currentJob) {
        try {
            if (!similarJobsContainer) return;

            // Query similar jobs from Firestore
            const jobsQuery = query(
                collection(db, 'jobs'),
                where('jobType', '==', currentJob.jobType),
                where('status', '==', 'active')
            );

            const querySnapshot = await getDocs(jobsQuery);
            const similarJobs = [];

            querySnapshot.forEach((doc) => {
                if (doc.id !== jobId) { // Exclude current job
                    similarJobs.push({ id: doc.id, ...doc.data() });
                }
            });

            // Sort by location match first, then take top 3
            similarJobs.sort((a, b) => {
                if (a.location === currentJob.location && b.location !== currentJob.location) return -1;
                if (a.location !== currentJob.location && b.location === currentJob.location) return 1;
                return 0;
            }).slice(0, 3);

            if (similarJobs.length > 0) {
                similarJobs.forEach(job => {
                    const jobCard = createJobCard(job);
                    similarJobsContainer.appendChild(jobCard);
                });
            } else {
                similarJobsContainer.innerHTML = '<p>No similar jobs found</p>';
            }
        } catch (error) {
            console.error('Error loading similar jobs:', error);
            similarJobsContainer.innerHTML = '<p>Error loading similar jobs</p>';
        }
    }

    // Create job card for similar jobs
    function createJobCard(job) {
        const card = document.createElement('div');
        
        // Define job type class based on job type
        const jobTypeClass = job.jobType.toLowerCase().replace(/\s+/g, '-');
        
        card.innerHTML = `
            <div class="job-card" data-job-id="${job.id}">
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
                        </div>
                    </div>

                    <div class="job-footer">
                        <div class="job-info">
                            <div class="salary">
                                <i class="fas fa-money-bill-wave"></i>
                                <span>${job.salary}</span>
                            </div>
                            <div class="deadline">
                                <i class="far fa-clock"></i>
                                <span>Apply before: ${formatDate(job.applicationDeadline)}</span>
                            </div>
                        </div>
                        
                        <div class="job-actions">
                            <button class="apply-btn" data-job-id="${job.id}">
                                <i class="fas fa-paper-plane"></i> Apply Now
                            </button>
                            <button class="save-btn" data-job-id="${job.id}">
                                <i class="far fa-bookmark"></i> Save Job
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add click event to the entire card
        card.addEventListener('click', (e) => {
            // Don't navigate if clicking on buttons
            if (e.target.closest('.job-actions')) {
                return;
            }
            window.location.href = `single-job.html?id=${job.id}`;
        });

        return card;
    }

    // Handle apply button click
    applyBtn.addEventListener('click', function() {
        // Check if user is logged in
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Redirect to application page
                window.location.href = `apply.html?id=${jobId}`;
            } else {
                // Redirect to login page
                window.location.href = 'login.html';
            }
        });
    });

    // Handle save button click
    saveBtn.addEventListener('click', function() {
        // Check if user is logged in
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Toggle save status
                toggleSaveStatus(user.uid);
            } else {
                // Redirect to login page
                window.location.href = 'login.html';
            }
        });
    });

    // Toggle save status
    async function toggleSaveStatus(userId) {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            const userData = userDoc.data();
            const savedJobs = userData.savedJobs || [];

            if (savedJobs.includes(jobId)) {
                // Remove from saved jobs
                await updateDoc(doc(db, 'users', userId), {
                    savedJobs: savedJobs.filter(id => id !== jobId)
                });
                saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Save Job';
            } else {
                // Add to saved jobs
                await updateDoc(doc(db, 'users', userId), {
                    savedJobs: [...savedJobs, jobId]
                });
                saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
            }
        } catch (error) {
            console.error('Error toggling save status:', error);
            alert('Error saving job. Please try again.');
        }
    }

    // Check if job is saved
    async function checkSavedStatus() {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.data();
            const savedJobs = userData.savedJobs || [];

            if (savedJobs.includes(jobId)) {
                saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
            }
        } catch (error) {
            console.error('Error checking save status:', error);
        }
    }

    // Initialize the page
    loadJobData();
    checkSavedStatus();
});