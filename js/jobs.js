import { auth, db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy, doc, getDoc, updateDoc, arrayUnion, addDoc, onSnapshot, arrayRemove, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { storage } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    const jobsContainer = document.getElementById('jobsContainer');
    const searchInput = document.getElementById('searchInput');
    const jobTypeFilter = document.getElementById('jobTypeFilter');
    const locationFilter = document.getElementById('locationFilter');
    const noJobsMessage = document.getElementById('noJobsMessage');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Apply modal elements
    const applyModalOverlay = document.getElementById('applyModalOverlay');
    const closeApplyModal = document.getElementById('closeApplyModal');
    const cancelApply = document.getElementById('cancelApply');
    const applyForm = document.getElementById('applyForm');
    const applyJobTitle = document.getElementById('applyJobTitle');

    // Store current job ID when applying
    let currentJobId = null;

    let allJobs = [];
    let locations = new Set();
    let isFetching = false; // Add loading state flag

    // Function to create a job card
    function createJobCard(job) {
        const jobTypeClass = job.jobType.toLowerCase().replace(' ', '-');
        const isApplied = job.applications && job.applications.includes(auth.currentUser?.uid);
        const isClosed = job.status === 'closed';
        const isSaved = job.isSaved || false;
        
        return `
            <div class="job-card ${isClosed ? 'closed' : ''}" data-job-id="${job.id}">
                <div class="job-card-content">
                    <div class="job-header">
                        <div class="company-logo-wrapper">
                            <img src="${job.companyLogo}" alt="${job.companyName} logo" class="company-logo">
                        </div>
                    </div>
                    <div class="job-title-section">
                        <h3 class="job-title">${job.jobTitle}</h3>
                        <p class="company-name">${job.companyName}</p>
                        ${isClosed ? '<span class="job-status closed">Closed</span>' : ''}
                    </div>
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

                    <div class="job-footer">
                        <div class="job-info">
                            <div class="salary">
                                <i class="fas fa-money-bill-wave"></i>
                                <span>${job.salary}</span>
                            </div>
                            <div class="deadline">
                                <i class="far fa-clock"></i>
                                <span>Apply before: ${new Date(job.applicationDeadline).toLocaleDateString()}</span>
                            </div>
                        </div>
                        
                        <div class="job-actions">
                            ${isApplied ? `
                                <div class="application-status pending">
                                    <i class="fas fa-clock"></i>
                                    <span>Pending</span>
                                </div>
                            ` : isClosed ? `
                                <button class="apply-btn disabled" disabled>
                                    <i class="fas fa-lock"></i> Job Closed
                                </button>
                            ` : `
                                <button class="apply-btn" data-job-id="${job.id}">
                                    <i class="fas fa-paper-plane"></i> Apply Now
                                </button>
                            `}
                            <button class="save-btn ${isSaved ? 'saved' : ''}" data-job-id="${job.id}">
                                <i class="${isSaved ? 'fas' : 'far'} fa-bookmark"></i> ${isSaved ? 'Saved' : 'Save Job'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Function to filter jobs
    function filterJobs() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedJobType = jobTypeFilter.value.toLowerCase();
        const selectedLocation = locationFilter.value;

        const filteredJobs = allJobs.filter(job => {
            const matchesSearch = job.jobTitle.toLowerCase().includes(searchTerm) ||
                                job.companyName.toLowerCase().includes(searchTerm) ||
                                job.jobDescription.toLowerCase().includes(searchTerm);
            
            const matchesJobType = !selectedJobType || job.jobType.toLowerCase() === selectedJobType;
            const matchesLocation = !selectedLocation || job.location === selectedLocation;

            return matchesSearch && matchesJobType && matchesLocation;
        });

        displayJobs(filteredJobs);
    }

    // Function to display jobs
    function displayJobs(jobs) {
        jobsContainer.innerHTML = '';
        
        if (jobs.length === 0) {
            noJobsMessage.style.display = 'block';
        } else {
            noJobsMessage.style.display = 'none';
            jobs.forEach(job => {
                const jobCardHTML = createJobCard(job);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = jobCardHTML;
                jobsContainer.appendChild(tempDiv.firstElementChild);
            });
        }
    }

    // Function to populate location filter
    function populateLocationFilter() {
        const locationOptions = Array.from(locations).sort();
        locationFilter.innerHTML = '<option value="">All Locations</option>';
        locationOptions.forEach(location => {
            locationFilter.innerHTML += `<option value="${location}">${location}</option>`;
        });
    }

    // Event listeners for filters
    searchInput.addEventListener('input', filterJobs);
    jobTypeFilter.addEventListener('change', filterJobs);
    locationFilter.addEventListener('change', filterJobs);

    // Function to fetch jobs from Firestore
    async function fetchJobs() {
        if (isFetching) return; // Prevent multiple simultaneous fetches
        isFetching = true;
        
        try {
            loadingSpinner.style.display = 'flex';
            
            // Get jobs from Firestore
            const jobsCollection = collection(db, 'jobs');
            const jobsQuery = query(jobsCollection, orderBy('postedDate', 'desc'));
            const querySnapshot = await getDocs(jobsQuery);
            
            allJobs = [];
            locations.clear();
            
            // Get user's saved jobs if logged in
            let savedJobs = [];
            if (auth.currentUser) {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    savedJobs = userDoc.data().savedJobs || [];
                }
            }
            
            querySnapshot.forEach((doc) => {
                const jobData = doc.data();
                jobData.id = doc.id;
                jobData.isSaved = savedJobs.includes(doc.id);
                allJobs.push(jobData);
                locations.add(jobData.location);
            });
            
            // Populate location filter
            populateLocationFilter();
            
            // Display all jobs initially
            displayJobs(allJobs);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            noJobsMessage.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error loading jobs</h3>
                <p>Please try again later</p>
            `;
            noJobsMessage.style.display = 'block';
        } finally {
            loadingSpinner.style.display = 'none';
            isFetching = false;
        }
    }

    // Initial load
    fetchJobs();

    // Add event delegation for job card clicks
    jobsContainer.addEventListener('click', function(e) {
        const jobCard = e.target.closest('.job-card');
        const applyBtn = e.target.closest('.apply-btn');
        const saveBtn = e.target.closest('.save-btn');

        // Prevent navigation if "Apply Now" or "Save Job" buttons are clicked
        if (applyBtn) {
            e.stopPropagation(); // Prevent card click
            const jobId = applyBtn.dataset.jobId;
            showApplyModal(jobId, allJobs.find(job => job.id === jobId).jobTitle);
            return; // Stop further execution
        }

        if (saveBtn) {
            e.stopPropagation(); // Prevent card click
            const jobId = saveBtn.dataset.jobId;
            saveJob(jobId);
            return; // Stop further execution
        }

        // Navigate to the single job page if the card itself is clicked
        if (jobCard) {
            const jobId = jobCard.dataset.jobId;
            window.location.href = `single-job.html?id=${jobId}`;
        }
    });

    // Show apply modal
    function showApplyModal(jobId, jobTitle) {
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

    // Function to save/unsave a job
    async function saveJob(jobId) {
        console.log('Save button clicked with jobId:', jobId);
        const user = auth.currentUser;
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            const saveBtn = document.querySelector(`.save-btn[data-job-id="${jobId}"]`);
            const job = allJobs.find(j => j.id === jobId);
            
            if (!userDoc.exists()) {
                // Create new user document with saved jobs array
                await setDoc(userRef, {
                    email: user.email,
                    savedJobs: [jobId],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                job.isSaved = true;
                saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
                saveBtn.classList.add('saved');
                return;
            }

            const userData = userDoc.data();
            const savedJobs = userData.savedJobs || [];
            console.log('Current saved jobs array:', savedJobs);
            
            if (savedJobs.includes(jobId)) {
                // Remove job from saved jobs array
                await updateDoc(userRef, {
                    savedJobs: arrayRemove(jobId),
                    updatedAt: new Date().toISOString()
                });
                console.log('Removed job from saved jobs:', jobId);
                job.isSaved = false;
                saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Save Job';
                saveBtn.classList.remove('saved');
            } else {
                // Add job to saved jobs array
                await updateDoc(userRef, {
                    savedJobs: arrayUnion(jobId),
                    updatedAt: new Date().toISOString()
                });
                console.log('Added job to saved jobs:', jobId);
                job.isSaved = true;
                saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
                saveBtn.classList.add('saved');
            }
        } catch (error) {
            console.error('Error saving job:', error);
            alert('Failed to save job. Please try again.');
        }
    }

    // Function to check and update saved job status
    async function checkSavedJobs() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const savedJobs = userData.savedJobs || [];
                
                savedJobs.forEach(jobId => {
                    const saveBtn = document.querySelector(`.save-btn[data-job-id="${jobId}"]`);
                    if (saveBtn) {
                        saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Saved';
                        saveBtn.classList.add('saved');
                    }
                });
            }
        } catch (error) {
            console.error('Error checking saved jobs:', error);
        }
    }

    // Check saved jobs when auth state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Only fetch jobs if we haven't already loaded them
            if (allJobs.length === 0) {
                fetchJobs();
            } else {
                // Just update the saved status of existing jobs
                checkSavedJobs();
            }
            
            // Set up real-time listener for new jobs
            const jobsRef = collection(db, 'jobs');
            const q = query(jobsRef, where('status', '==', 'active'));
            
            onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        // New job added, fetch all jobs again to update the display
                        fetchJobs();
                    }
                });
            });
        } else {
            // If user logs out, just refresh the display to update saved status
            displayJobs(allJobs);
        }
    });

    // Function to fetch user's applications
    async function fetchUserApplications() {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const applicationsRef = collection(db, 'applications');
            const q = query(applicationsRef, where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);
            
            const applications = [];
            querySnapshot.forEach((doc) => {
                applications.push({ id: doc.id, ...doc.data() });
            });

            return applications;
        } catch (error) {
            console.error('Error fetching applications:', error);
            return [];
        }
    }

    // Function to update application status
    async function updateApplicationStatus(applicationId, status, message = '') {
        try {
            const applicationRef = doc(db, 'applications', applicationId);
            await updateDoc(applicationRef, {
                status: status,
                message: message,
                updatedAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('Error updating application status:', error);
            return false;
        }
    }

    // Function to show application management modal
    function showApplicationManagementModal(application) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Manage Application</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="application-details">
                        <p><strong>Applicant:</strong> ${application.fullName}</p>
                        <p><strong>Email:</strong> ${application.email}</p>
                        <p><strong>Phone:</strong> ${application.phone}</p>
                        <p><strong>Cover Letter:</strong></p>
                        <div class="cover-letter">${application.coverLetter}</div>
                    </div>
                    <div class="application-actions">
                        <button class="accept-btn" data-application-id="${application.id}">
                            <i class="fas fa-check"></i> Accept
                        </button>
                        <button class="reject-btn" data-application-id="${application.id}">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                    <div class="message-section">
                        <textarea placeholder="Add a message for the applicant..." class="message-input"></textarea>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle close button
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        // Handle accept button
        modal.querySelector('.accept-btn').addEventListener('click', async () => {
            const message = modal.querySelector('.message-input').value;
            const success = await updateApplicationStatus(application.id, 'accepted', message);
            if (success) {
                alert('Application accepted successfully!');
                modal.remove();
                window.location.reload();
            }
        });

        // Handle reject button
        modal.querySelector('.reject-btn').addEventListener('click', async () => {
            const message = modal.querySelector('.message-input').value;
            const success = await updateApplicationStatus(application.id, 'rejected', message);
            if (success) {
                alert('Application rejected successfully!');
                modal.remove();
                window.location.reload();
            }
        });
    }

    // Add event listener for my-jobs page
    if (window.location.pathname.includes('my-jobs.html')) {
        document.addEventListener('DOMContentLoaded', async () => {
            const applications = await fetchUserApplications();
            const applicationsContainer = document.getElementById('applicationsContainer');
            
            if (applications.length === 0) {
                applicationsContainer.innerHTML = '<p>No applications found.</p>';
                return;
            }

            applications.forEach(application => {
                const applicationCard = document.createElement('div');
                applicationCard.className = 'application-card';
                applicationCard.innerHTML = `
                    <div class="application-header">
                        <h3>${application.jobTitle}</h3>
                        <span class="status ${application.status}">${application.status}</span>
                    </div>
                    <div class="application-details">
                        <p><strong>Applied on:</strong> ${new Date(application.appliedAt).toLocaleDateString()}</p>
                        ${application.message ? `<p><strong>Message:</strong> ${application.message}</p>` : ''}
                    </div>
                    ${application.status === 'pending' ? `
                        <button class="manage-btn" data-application-id="${application.id}">
                            Manage Application
                        </button>
                    ` : ''}
                `;

                if (application.status === 'pending') {
                    applicationCard.querySelector('.manage-btn').addEventListener('click', () => {
                        showApplicationManagementModal(application);
                    });
                }

                applicationsContainer.appendChild(applicationCard);
            });
        });
    }
});