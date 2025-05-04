import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayRemove, arrayUnion, addDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { storage } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // Get job ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    if (!jobId) {
        window.location.href = 'jobs.html';
        return;
    }

    // Store current job ID when applying
    let currentJobId = jobId;

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
    const loadingSpinner = document.getElementById('loadingSpinner');
    const applyBtn = document.querySelector('.apply-btn');
    const saveBtn = document.querySelector('.save-btn');

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
            const jobRef = doc(db, 'jobs', jobId);
            const jobDoc = await getDoc(jobRef);
            
            if (!jobDoc.exists()) {
                window.location.href = 'jobs.html';
                return;
            }

            const jobData = jobDoc.data();
            jobData.id = jobDoc.id;
            
            // Update job details in the UI
            updateJobDetails(jobData);

            // Check if user is logged in and has applied
            const user = auth.currentUser;
            if (user) {
                const applicationsRef = collection(db, 'applications');
                const q = query(
                    applicationsRef,
                    where('jobId', '==', jobData.id),
                    where('userId', '==', user.uid)
                );
                
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const application = querySnapshot.docs[0].data();
                    const jobActions = document.querySelector('.job-actions');
                    if (jobActions) {
                        const applyBtn = jobActions.querySelector('.apply-btn');
                        if (applyBtn) {
                            const statusElement = document.createElement('div');
                            statusElement.className = `application-status ${application.status === 'approved' ? 'status-approved' : 
                                                    application.status === 'rejected' ? 'status-rejected' : 'status-pending'}`;
                            statusElement.innerHTML = `
                                <i class="fas ${application.status === 'approved' ? 'fa-check' : 
                                             application.status === 'rejected' ? 'fa-times' : 'fa-clock'}"></i>
                                <span>${application.status.charAt(0).toUpperCase() + application.status.slice(1)}</span>
                            `;
                            if (application.message) {
                                statusElement.title = application.message;
                            }
                            jobActions.replaceChild(statusElement, applyBtn);
                        }
                    }
                }
            }
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

        // Handle application status
        const jobCard = document.querySelector('.job-card');
        const applyBtn = document.querySelector('.apply-btn');
        const isApplied = job.applications && job.applications.includes(auth.currentUser?.uid);
        
        if (isApplied) {
            // Query the applications collection to get the status
            const applicationsRef = collection(db, 'applications');
            const q = query(
                applicationsRef,
                where('jobId', '==', job.id),
                where('userId', '==', auth.currentUser?.uid)
            );
            
            getDocs(q).then(snapshot => {
                if (!snapshot.empty) {
                    const application = snapshot.docs[0].data();
                    const statusElement = document.createElement('div');
                    statusElement.className = `application-status ${application.status === 'approved' ? 'status-approved' : 
                                            application.status === 'rejected' ? 'status-rejected' : 'status-pending'}`;
                    statusElement.innerHTML = `
                        <i class="fas fa-clock"></i>
                        <span>${application.status.charAt(0).toUpperCase() + application.status.slice(1)}</span>
                    `;
                    if (application.message) {
                        statusElement.title = application.message;
                    }
                    
                    // Replace the apply button with the status element
                    const jobActions = document.querySelector('.job-actions');
                    if (jobActions) {
                        const applyBtn = jobActions.querySelector('.apply-btn');
                        if (applyBtn) {
                            jobActions.replaceChild(statusElement, applyBtn);
                        }
                    }
                }
            });
        } else if (job.status === 'closed') {
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
                const jobData = { id: doc.id, ...doc.data() };
                // Exclude current job by checking both Firestore ID and custom ID
                if (doc.id !== jobId && jobData.id !== currentJob.id) {
                    similarJobs.push(jobData);
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
                // Show apply modal
                showApplyModal(jobId, jobTitle.textContent);
            } else {
                // Redirect to login page
                window.location.href = 'login.html';
            }
        });
    });

    // Function to check if job is saved
    async function checkSavedStatus(jobId) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const savedJobs = userData.savedJobs || [];
                
                if (savedJobs.includes(jobId)) {
                    saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
                    saveBtn.classList.add('saved');
                } else {
                    saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Save Job';
                    saveBtn.classList.remove('saved');
                }
            }
        } catch (error) {
            console.error('Error checking saved status:', error);
        }
    }

    // Function to toggle save job
    async function toggleSaveJob(jobId) {
        const user = auth.currentUser;
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

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
                    saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Save Job';
                    saveBtn.classList.remove('saved');
                } else {
                    await updateDoc(userRef, {
                        savedJobs: arrayUnion(jobId)
                    });
                    saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
                    saveBtn.classList.add('saved');
                }
            }
        } catch (error) {
            console.error('Error toggling save job:', error);
        }
    }

    // Add event listener to save button
    saveBtn.addEventListener('click', async () => {
        await toggleSaveJob(jobId);
    });

    // Function to save job to history
    async function saveToHistory(job) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            // Check if job already exists in history
            const historyQuery = query(
                collection(db, 'jobHistory'),
                where('userId', '==', user.uid),
                where('jobId', '==', job.id)
            );
            
            const querySnapshot = await getDocs(historyQuery);
            
            if (!querySnapshot.empty) {
                // Job exists, update the viewedAt timestamp
                const docRef = doc(db, 'jobHistory', querySnapshot.docs[0].id);
                await updateDoc(docRef, {
                    viewedAt: new Date()
                });
            } else {
                // Job doesn't exist, create new entry
                await addDoc(collection(db, 'jobHistory'), {
                    userId: user.uid,
                    jobId: job.id,
                    jobTitle: job.jobTitle,
                    companyName: job.companyName,
                    location: job.location,
                    salary: job.salary,
                    viewedAt: new Date()
                });
            }
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    }

    // Function to show apply modal
    function showApplyModal(jobId, jobTitle) {
        currentJobId = jobId;
        applyJobTitle.textContent = jobTitle;
        applyModalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    // Function to hide apply modal
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
            window.location.href = 'login.html';
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
            const applicationDoc = await addDoc(applicationsRef, applicationData);

            // Update job's applications count
            const jobRef = doc(db, 'jobs', currentJobId);
            await updateDoc(jobRef, {
                applications: arrayUnion(user.uid)
            });

            // Show success message
            showNotification('Application submitted successfully!', 'success');
            hideApplyModal();

            // Update the apply button to show pending status
            const jobActions = document.querySelector('.job-actions');
            if (jobActions) {
                const applyBtn = jobActions.querySelector('.apply-btn');
                if (applyBtn) {
                    const statusElement = document.createElement('div');
                    statusElement.className = 'application-status status-pending';
                    statusElement.innerHTML = `
                        <i class="fas fa-clock"></i>
                        <span>Pending</span>
                    `;
                    jobActions.replaceChild(statusElement, applyBtn);
                }
            }

            // Wait for 2 seconds to show the notification
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Verify the application status in Firestore
            const applicationDocRef = doc(db, 'applications', applicationDoc.id);
            const applicationSnapshot = await getDoc(applicationDocRef);
            
            if (applicationSnapshot.exists()) {
                const application = applicationSnapshot.data();
                const jobActions = document.querySelector('.job-actions');
                if (jobActions) {
                    const statusElement = jobActions.querySelector('.application-status');
                    if (statusElement) {
                        statusElement.className = `application-status ${application.status === 'approved' ? 'status-approved' : 
                                                application.status === 'rejected' ? 'status-rejected' : 'status-pending'}`;
                        statusElement.innerHTML = `
                            <i class="fas ${application.status === 'approved' ? 'fa-check' : 
                                         application.status === 'rejected' ? 'fa-times' : 'fa-clock'}"></i>
                            <span>${application.status.charAt(0).toUpperCase() + application.status.slice(1)}</span>
                        `;
                        if (application.message) {
                            statusElement.title = application.message;
                        }
                    }
                }
            }

            // Reload the page to ensure everything is in sync
            window.location.reload();
        } catch (error) {
            console.error('Error submitting application:', error);
            showNotification('Failed to submit application. Please try again.', 'error');
        }
    });

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

    // Initialize the page
    loadJobData();

    // Check saved status after user authentication
    onAuthStateChanged(auth, (user) => {
        if (user) {
            checkSavedStatus(jobId);
        }
    });
});