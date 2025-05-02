import { auth, db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy, doc, getDoc, updateDoc, arrayUnion, addDoc, onSnapshot, arrayRemove, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

document.addEventListener('DOMContentLoaded', function() {
    const savedJobsContainer = document.getElementById('savedJobsContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Apply modal elements
    const applyModalOverlay = document.getElementById('applyModalOverlay');
    const closeApplyModal = document.getElementById('closeApplyModal');
    const cancelApply = document.getElementById('cancelApply');
    const applyForm = document.getElementById('applyForm');
    const applyJobTitle = document.getElementById('applyJobTitle');

    // Store current job ID when applying
    let currentJobId = null;

    // Function to create job card
    function createJobCard(job, jobId) {
        console.log('Creating job card with job object:', job);
        const jobTypeClass = job.jobType.toLowerCase().replace(' ', '-');
        const isClosed = job.status === 'closed';
        
        const jobItem = document.createElement('div');
        jobItem.className = `job-item ${isClosed ? 'closed' : ''}`;
        jobItem.dataset.jobId = jobId;
        console.log('Set job item dataset jobId to:', jobId);
        
        jobItem.innerHTML = `
            <div class="job-item-content">
                <div class="job-item-header">
                    <div class="company-logo-wrapper">
                        <img src="${job.companyLogo || '../img/logo.png'}" alt="${job.companyName} logo" class="company-logo">
                    </div>
                    <div class="job-item-info">
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
                </div>

                <div class="job-item-details">
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
                        ${isClosed ? `
                            <button class="apply-btn disabled" disabled>
                                <i class="fas fa-lock"></i> Job Closed
                            </button>
                        ` : `
                            <button class="apply-btn" data-job-id="${jobId}">
                                <i class="fas fa-paper-plane"></i> Apply Now
                            </button>
                        `}
                        <button class="save-btn saved" data-job-id="${jobId}">
                            <i class="fas fa-bookmark"></i> Saved
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add click event to the entire job item
        jobItem.addEventListener('click', (e) => {
            // Don't navigate if clicking on buttons
            if (e.target.closest('.job-actions')) {
                return;
            }
            window.location.href = `../html/single-job.html?id=${jobId}`;
        });

        // Add event listener to the save button
        const saveBtn = jobItem.querySelector('.save-btn');
        saveBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            console.log('Save button clicked with jobId:', jobId);
            await toggleSaveJob(jobId);
        });

        // Add event listener to the apply button
        const applyBtn = jobItem.querySelector('.apply-btn');
        if (applyBtn && !applyBtn.disabled) {
            applyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Apply button clicked with jobId:', jobId);
                showApplyModal(jobId, job.jobTitle);
            });
        }

        return jobItem;
    }

    // Function to format date
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // Function to load saved jobs
    async function loadSavedJobs() {
        try {
            const user = auth.currentUser;
            if (!user) {
                window.location.href = '../html/login.html';
                return;
            }

            // Get user's saved jobs array
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            const savedJobs = userDoc.data()?.savedJobs || [];
            console.log('User saved jobs:', savedJobs);

            const jobsContainer = document.getElementById('savedJobsContainer');
            jobsContainer.innerHTML = '';

            if (savedJobs.length === 0) {
                showEmptyState();
                return;
            }

            // Fetch each saved job document
            for (const jobId of savedJobs) {
                const jobRef = doc(db, 'jobs', jobId);
                const jobDoc = await getDoc(jobRef);
                
                if (jobDoc.exists()) {
                    const jobData = jobDoc.data();
                    console.log('Job document data:', jobData);
                    console.log('Job document ID:', jobId);
                    
                    const jobCard = createJobCard(jobData, jobId);
                    jobsContainer.appendChild(jobCard);
                }
            }

            // Check if any jobs were actually displayed
            if (jobsContainer.children.length === 0) {
                showEmptyState();
            }
        } catch (error) {
            console.error('Error loading saved jobs:', error);
            showEmptyState();
        }
    }

    // Function to show empty state UI
    function showEmptyState() {
        const jobsContainer = document.getElementById('savedJobsContainer');
        jobsContainer.innerHTML = `
            <div class="no-saved-jobs-container">
                <i class="fas fa-bookmark no-saved-jobs-icon"></i>
                <h2 class="no-saved-jobs-title">No Saved Jobs Yet</h2>
                <p class="no-saved-jobs-description">
                    You haven't saved any jobs yet. Start exploring and save jobs that interest you to keep track of them here.
                </p>
                <a href="jobs.html" class="explore-jobs-btn">
                    <i class="fas fa-search"></i>
                    Explore Jobs
                </a>
            </div>
        `;
    }

    // Function to toggle save job
    async function toggleSaveJob(jobId) {
        try {
            const user = auth.currentUser;
            if (!user) {
                window.location.href = '../html/login.html';
                return;
            }

            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            const savedJobs = userDoc.data()?.savedJobs || [];
            console.log('Current saved jobs array:', savedJobs);

            if (savedJobs.includes(jobId)) {
                // Remove job from saved jobs array
                await updateDoc(userRef, {
                    savedJobs: arrayRemove(jobId)
                });
                console.log('Removed job from saved jobs:', jobId);
                
                // Remove job card from UI
                const jobCard = document.querySelector(`.job-item[data-job-id="${jobId}"]`);
                if (jobCard) {
                    jobCard.remove();
                }

                // Update no jobs message if needed
                const savedJobsContainer = document.getElementById('savedJobsContainer');
                const remainingJobs = document.querySelectorAll('.job-item');
                if (remainingJobs.length === 0) {
                    savedJobsContainer.innerHTML = `
                        <div class="no-saved-jobs-container">
                            <i class="fas fa-bookmark no-saved-jobs-icon"></i>
                            <h2 class="no-saved-jobs-title">No Saved Jobs Yet</h2>
                            <p class="no-saved-jobs-description">
                                You haven't saved any jobs yet. Start exploring and save jobs that interest you to keep track of them here.
                            </p>
                            <a href="jobs.html" class="explore-jobs-btn">
                                <i class="fas fa-search"></i>
                                Explore Jobs
                            </a>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error toggling save job:', error);
            showNotification('Failed to update saved jobs. Please try again.', 'error');
        }
    }

    // Function to show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Show apply modal
    function showApplyModal(jobId, jobTitle) {
        console.log('Showing apply modal for job:', jobId, jobTitle);
        currentJobId = jobId;
        applyJobTitle.textContent = jobTitle;
        applyModalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    // Hide apply modal
    function hideApplyModal() {
        applyModalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
        applyForm.reset();
        currentJobId = null;
    }

    // Close modal when clicking outside
    applyModalOverlay.addEventListener('click', (e) => {
        if (e.target === applyModalOverlay) {
            hideApplyModal();
        }
    });

    // Close modal when clicking close button
    closeApplyModal.addEventListener('click', hideApplyModal);
    cancelApply.addEventListener('click', hideApplyModal);

    // Handle form submission
    applyForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Check if user is logged in
        const user = auth.currentUser;
        if (!user) {
            window.location.href = '../html/login.html';
            return;
        }

        try {
            // Get form data
            const formData = new FormData(applyForm);
            const resumeFile = formData.get('resume');
            
            // Validate file
            if (!resumeFile || resumeFile.size === 0) {
                alert('Please upload your resume');
                return;
            }

            // Check file size (max 5MB)
            if (resumeFile.size > 5 * 1024 * 1024) {
                alert('Resume file size should be less than 5MB');
                return;
            }

            // Check file type
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(resumeFile.type)) {
                alert('Please upload a PDF or Word document');
                return;
            }

            // Create application data without the CV
            const applicationData = {
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                coverLetter: formData.get('coverLetter'),
                jobId: currentJobId,
                userId: user.uid,
                status: 'pending',
                appliedAt: new Date().toISOString()
            };

            // Add application to Firestore
            const applicationsRef = collection(db, 'applications');
            await addDoc(applicationsRef, applicationData);

            // Update job's applications count
            const jobRef = doc(db, 'jobs', currentJobId);
            await updateDoc(jobRef, {
                applications: arrayUnion(user.uid)
            });

            // Show success message
            alert('Application submitted successfully!');
            hideApplyModal();
            
            // Refresh the page to update the UI
            window.location.reload();
        } catch (error) {
            console.error('Error submitting application:', error);
            alert('Error submitting application. Please try again.');
        }
    });

    // Check auth state and load saved jobs
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadSavedJobs();
        } else {
            window.location.href = '../html/login.html';
        }
    });
}); 