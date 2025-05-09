import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayRemove, arrayUnion, addDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
    console.log('Initial job ID from URL:', jobId);

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

            // Save to history if user is logged in
            if (auth.currentUser) {
                saveToHistory(jobData);
            }

            // Load similar jobs after loading the main job data
            console.log('Loading similar jobs for:', jobData);
            await loadSimilarJobs(jobData);

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

            // After updateJobDetails(jobData) in loadJobData, add:
            showPosterInfo(jobData.postedBy);
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
        if (jobDescription) jobDescription.textContent = job.description;
        if (requirements) requirements.textContent = job.requirements;
        if (benefits) benefits.textContent = job.benefits;
        if (loadingSpinner) loadingSpinner.style.display = 'none';

        // Add data-job-id to the save button
        const saveBtn = document.querySelector('.save-btn');
        if (saveBtn) {
            saveBtn.setAttribute('data-job-id', job.id);
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const user = auth.currentUser;
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }
                await toggleSaveJob(job.id);
            });

            // Check if this job is saved
            if (auth.currentUser) {
                checkSavedStatus(job.id);
            }
        }

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
            if (!similarJobsContainer) {
                console.error('Similar jobs container not found');
                return;
            }

            console.log('Current job data:', currentJob);

            // Query similar jobs from Firestore
            const jobsQuery = query(
                collection(db, 'jobs'),
                where('jobType', '==', currentJob.jobType),
                where('status', '==', 'active')
            );

            console.log('Fetching similar jobs with query:', jobsQuery);
            const querySnapshot = await getDocs(jobsQuery);
            console.log('Found similar jobs:', querySnapshot.size);

            const similarJobs = [];

            querySnapshot.forEach((doc) => {
                // Get the Firestore document ID and data
                const jobData = {
                    id: doc.id,  // This is the Firestore document ID
                    ...doc.data()
                };
                console.log('Processing similar job:', jobData.id);
                
                // Exclude current job using the Firestore document ID
                if (doc.id !== currentJob.id) {
                    // Ensure we're using the Firestore document ID
                    const similarJob = {
                        ...jobData,
                        id: doc.id  // Explicitly set the ID to the Firestore document ID
                    };
                    similarJobs.push(similarJob);
                }
            });

            console.log('Filtered similar jobs:', similarJobs.length);

            // Sort by location match first, then take top 3
            similarJobs.sort((a, b) => {
                if (a.location === currentJob.location && b.location !== currentJob.location) return -1;
                if (a.location !== currentJob.location && b.location === currentJob.location) return 1;
                return 0;
            }).slice(0, 3);

            console.log('Final similar jobs to display:', similarJobs.length);

            // Clear existing content
            similarJobsContainer.innerHTML = '';

            if (similarJobs.length > 0) {
                // Create container for job cards
                const jobsGrid = document.createElement('div');
                jobsGrid.className = 'similar-jobs-grid-2';

                similarJobs.forEach(job => {
                    console.log('Creating card for job with ID:', job.id);
                    const jobCard = createJobCard(job);
                    jobsGrid.appendChild(jobCard);
                });

                similarJobsContainer.appendChild(jobsGrid);
            } else {
                // Show message when no similar jobs are found
                similarJobsContainer.innerHTML = `
                    <div class="no-similar-jobs">
                        <h3>No Similar Jobs Found</h3>
                        <p>We couldn't find any similar jobs at the moment. Check back later for new opportunities.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading similar jobs:', error);
            similarJobsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error Loading Similar Jobs</h3>
                    <p>There was an error loading similar jobs. Please try again later.</p>
                </div>
            `;
        }
    }

    // Function to check if job is saved
    async function checkSavedStatus(jobId) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            console.log('Checking saved status for job:', jobId);
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const savedJobs = userData.savedJobs || [];
                
                // Find all save buttons for this job (in case there are multiple instances)
                const saveBtns = document.querySelectorAll(`.save-btn[data-job-id="${jobId}"]`);
                
                if (savedJobs.includes(jobId)) {
                    saveBtns.forEach(btn => {
                        btn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
                        btn.classList.add('saved');
                    });
                } else {
                    saveBtns.forEach(btn => {
                        btn.innerHTML = '<i class="far fa-bookmark"></i> Save Job';
                        btn.classList.remove('saved');
                    });
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
            console.log('Toggling save job:', jobId);
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const savedJobs = userData.savedJobs || [];
                
                // Find all save buttons for this job
                const saveBtns = document.querySelectorAll(`.save-btn[data-job-id="${jobId}"]`);
                
                if (savedJobs.includes(jobId)) {
                    // Remove from saved jobs
                    await updateDoc(userRef, {
                        savedJobs: arrayRemove(jobId)
                    });
                    saveBtns.forEach(btn => {
                        btn.innerHTML = '<i class="far fa-bookmark"></i> Save Job';
                        btn.classList.remove('saved');
                    });
                    showNotification('Job removed from saved jobs', 'info');
                } else {
                    // Add to saved jobs
                    await updateDoc(userRef, {
                        savedJobs: arrayUnion(jobId)
                    });
                    saveBtns.forEach(btn => {
                        btn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
                        btn.classList.add('saved');
                    });
                    showNotification('Job saved successfully', 'success');
                }
            }
        } catch (error) {
            console.error('Error toggling save job:', error);
            showNotification('Failed to save job. Please try again.', 'error');
        }
    }

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
        if (!jobId) {
            console.error('No job ID provided to showApplyModal');
            return;
        }
        console.log('Opening apply modal for job:', jobId);
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

    // Add click event listener to the main apply button
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            const jobTitle = document.getElementById('jobTitle')?.textContent;
            console.log('Apply button clicked for job:', jobId);
            showApplyModal(jobId, jobTitle);
        });
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

        // Verify we have a valid job ID
        if (!currentJobId) {
            console.error('No job ID available for application submission');
            showNotification('Invalid job. Please try again.', 'error');
            return;
        }

        console.log('Submitting application for job:', currentJobId);

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

            // First verify the job exists
            const jobRef = doc(db, 'jobs', currentJobId);
            console.log('Checking job document:', currentJobId);
            const jobDoc = await getDoc(jobRef);

            if (!jobDoc.exists()) {
                console.error('Job not found:', currentJobId);
                showNotification('This job is no longer available.', 'error');
                return;
            }

            const jobData = jobDoc.data();
            console.log('Job data retrieved:', jobData);

            // Check if job is still active
            if (jobData.status !== 'active') {
                showNotification('This job is no longer accepting applications.', 'error');
                return;
            }

            // Check if user has already applied
            if (jobData.applications && jobData.applications.includes(user.uid)) {
                showNotification('You have already applied for this job.', 'error');
                return;
            }

            // Create application data
            const applicationData = {
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                coverLetter: formData.get('coverLetter'),
                jobId: currentJobId,
                jobTitle: jobData.jobTitle,
                companyName: jobData.companyName,
                userId: user.uid,
                status: 'pending',
                appliedAt: new Date().toISOString()
            };

            console.log('Creating application with data:', applicationData);

            // Start a batch write
            const batch = writeBatch(db);

            // Add application to Firestore
            const applicationsRef = collection(db, 'applications');
            const applicationDoc = await addDoc(applicationsRef, applicationData);

            // Update job's applications array
            let applications = jobData.applications || [];
            applications.push(user.uid);
            
            batch.update(jobRef, {
                applications: applications,
                updatedAt: new Date().toISOString()
            });

            // Commit the batch
            await batch.commit();
            console.log('Application submitted successfully');

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

    // Function to update application status
    async function updateApplicationStatus(jobId) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const applicationsRef = collection(db, 'applications');
            const q = query(
                applicationsRef,
                where('jobId', '==', jobId),
                where('userId', '==', user.uid)
            );
            
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const application = querySnapshot.docs[0].data();
                const jobActions = document.querySelector(`.job-card[data-job-id="${jobId}"] .job-actions`);
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
        } catch (error) {
            console.error('Error updating application status:', error);
        }
    }

    // Function to create job card for similar jobs
    function createJobCard(job) {
        console.log('Creating job card with job data:', job);
        const card = document.createElement('div');
        
        // Define job type class based on job type
        const jobTypeClass = job.jobType.toLowerCase().replace(/\s+/g, '-');
        
        // Ensure we're using the Firestore document ID
        const jobId = job.id;
        console.log('Using job ID for card:', jobId);
        
        // Verify the job ID is a valid Firestore document ID
        if (!jobId || typeof jobId !== 'string' || jobId.length < 20) {
            console.error('Invalid job ID:', jobId);
            return card;
        }
        
        card.innerHTML = `
            <div class="job-card" data-job-id="${jobId}">
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
                            <button class="apply-btn" data-job-id="${jobId}">
                                <i class="fas fa-paper-plane"></i> Apply Now
                            </button>
                            <button class="save-btn" data-job-id="${jobId}">
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
            window.location.href = `single-job.html?id=${jobId}`;
        });

        // Add event listeners for apply and save buttons
        const applyBtn = card.querySelector('.apply-btn');
        const saveBtn = card.querySelector('.save-btn');

        if (applyBtn) {
            applyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const user = auth.currentUser;
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }
                console.log('Opening apply modal for job ID:', jobId);
                showApplyModal(jobId, job.jobTitle);
            });

            // Check application status
            if (auth.currentUser) {
                updateApplicationStatus(jobId);
            }
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const user = auth.currentUser;
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }
                await toggleSaveJob(jobId);
            });

            // Check if this job is saved
            if (auth.currentUser) {
                checkSavedStatus(jobId);
            }
        }

        return card;
    }

    // Initialize the page
    loadJobData();

    // Check saved status and application status after user authentication
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Check saved status for the main job
            checkSavedStatus(jobId);
            updateApplicationStatus(jobId);
            
            // Check saved status and application status for similar jobs
            const similarJobs = document.querySelectorAll('.job-card');
            similarJobs.forEach(jobCard => {
                const jobId = jobCard.dataset.jobId;
                if (jobId) {
                    checkSavedStatus(jobId);
                    updateApplicationStatus(jobId);
                }
            });
        }
    });

    // Add this function at the end of DOMContentLoaded:
    async function showPosterInfo(uid) {
        if (!uid) return;
        const posterInfoDiv = document.getElementById('posterInfo');
        const posterImage = document.getElementById('posterImage');
        const posterName = document.getElementById('posterName');
        const posterEmail = document.getElementById('posterEmail');
        try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const user = userSnap.data();
                posterImage.src = user.profileImage || '../img/logo.png';
                posterName.textContent = user.name || 'No Name';
                posterEmail.textContent = user.email || '';
                posterInfoDiv.style.display = 'flex';
            } else {
                posterInfoDiv.style.display = 'none';
            }
        } catch (e) {
            posterInfoDiv.style.display = 'none';
        }
    }
});