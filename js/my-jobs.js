import { auth, db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, arrayRemove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

document.addEventListener('DOMContentLoaded', function() {
    const jobsList = document.getElementById('jobsList');
    const searchInput = document.getElementById('searchInput');
    const jobTypeFilter = document.getElementById('jobTypeFilter');
    const locationFilter = document.getElementById('locationFilter');
    const statusFilter = document.getElementById('statusFilter');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Store jobs globally to use in filtering
    let allJobs = [];

    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, fetch their jobs
            fetchUserJobs(user.uid);
        } else {
            // User is not signed in, redirect to login
            window.location.href = 'login.html';
        }
    });

    // Fetch and display user's jobs
    async function fetchUserJobs(userId) {
        try {
            loadingSpinner.style.display = 'flex';
            jobsList.innerHTML = '';

            // Validate userId
            if (!userId || typeof userId !== 'string') {
                throw new Error('Invalid user ID');
            }

            // Get user's document to get posted jobs
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                jobsList.innerHTML = `
                    <div class="no-jobs-message">
                        <i class="fas fa-briefcase"></i>
                        <h3>No Jobs Posted Yet</h3>
                        <p>You haven't posted any jobs yet. <a href="post-job.html">Post your first job</a> to get started!</p>
                    </div>
                `;
                loadingSpinner.style.display = 'none';
                jobsList.style.display = 'block';
                return;
            }

            const userData = userDoc.data();
            const postedJobs = userData.postedJobs || [];

            if (postedJobs.length === 0) {
                jobsList.innerHTML = `
                    <div class="no-jobs-message">
                        <i class="fas fa-briefcase"></i>
                        <h3>No Jobs Posted Yet</h3>
                        <p>You haven't posted any jobs yet. <a href="post-job.html">Post your first job</a> to get started!</p>
                    </div>
                `;
                loadingSpinner.style.display = 'none';
                return;
            }

            // Fetch all jobs posted by the user
            allJobs = [];
            const locations = new Set();

            // Fetch each job individually to ensure we get all of them
            for (const jobId of postedJobs) {
                if (!jobId || typeof jobId !== 'string') {
                    console.warn('Invalid job ID found in postedJobs:', jobId);
                    continue;
                }
                
                const jobRef = doc(db, 'jobs', jobId);
                const jobDoc = await getDoc(jobRef);
                
                if (jobDoc.exists()) {
                    const job = { 
                        firestoreId: jobId,  // Store the actual Firestore document ID
                        ...jobDoc.data() 
                    };
                    allJobs.push(job);
                    if (job.location) locations.add(job.location);
                } else {
                    console.warn('Job not found in Firestore:', jobId);
                }
            }

            // Populate location filter
            locationFilter.innerHTML = '<option value="">All Locations</option>';
            locations.forEach(location => {
                locationFilter.innerHTML += `<option value="${location}">${location}</option>`;
            });

            // Display filtered jobs
            const filteredJobs = filterJobs(allJobs);
            displayJobs(filteredJobs);
            loadingSpinner.style.display = 'none';

        } catch (error) {
            console.error('Error fetching jobs:', error);
            jobsList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error Loading Jobs</h3>
                    <p>There was an error loading your jobs. Please try again later.</p>
                </div>
            `;
            loadingSpinner.style.display = 'none';
        }
    }

    // Display jobs in the UI
    function displayJobs(jobs) {
        if (jobs.length === 0) {
            jobsList.innerHTML = `
                <div class="no-jobs-message">
                    <i class="fas fa-search"></i>
                    <h3>No Jobs Found</h3>
                    <p>No jobs match your current filters.</p>
                </div>
            `;

            jobsList.style.display = 'block'; 
            return;
        }

        jobsList.innerHTML = jobs.map(job => `
            <div class="my-job-card" data-id="${job.id}" onclick="window.location.href='single-job.html?id=${job.id}'">
                <div class="company-logo-wrapper">
                    <img src="${job.companyLogo || '../img/logo.png'}" alt="${job.companyName}">
                </div>
                <div class="my-job-card-content">
                    <div class="job-title-section">
                        <h3 class="job-title">${job.jobTitle}</h3>
                        <p class="company-name">${job.companyName}</p>
                        ${job.status === 'closed' ? '<span class="job-status closed">Closed</span>' : ''}
                    </div>
                    <div class="job-meta-info">
                        <div class="meta-item job-type">
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
                                <i class="fas fa-calendar"></i>
                                <span>${job.applicationDeadline}</span>
                            </div>
                        </div>
                        <div class="job-actions">
                            <button class="edit-btn" onclick="event.stopPropagation(); editJob('${job.firestoreId}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="delete-btn" onclick="event.stopPropagation(); deleteJob('${job.firestoreId}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Filter jobs based on search and filters
    function filterJobs(jobs) {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedJobType = jobTypeFilter.value;
        const selectedLocation = locationFilter.value;
        const selectedStatus = statusFilter.value;

        return jobs.filter(job => {
            const matchesSearch = 
                job.jobTitle.toLowerCase().includes(searchTerm) ||
                job.companyName.toLowerCase().includes(searchTerm);

            const matchesJobType = !selectedJobType || job.jobType === selectedJobType;
            const matchesLocation = !selectedLocation || job.location === selectedLocation;
            const matchesStatus = !selectedStatus || job.status === selectedStatus;

            return matchesSearch && matchesJobType && matchesLocation && matchesStatus;
        });
    }

    // Event listeners for filters
    searchInput.addEventListener('input', () => {
        const filteredJobs = filterJobs(allJobs);
        displayJobs(filteredJobs);
    });

    jobTypeFilter.addEventListener('change', () => {
        const filteredJobs = filterJobs(allJobs);
        displayJobs(filteredJobs);
    });

    locationFilter.addEventListener('change', () => {
        const filteredJobs = filterJobs(allJobs);
        displayJobs(filteredJobs);
    });

    statusFilter.addEventListener('change', () => {
        const filteredJobs = filterJobs(allJobs);
        displayJobs(filteredJobs);
    });

    // Make functions available globally
    window.editJob = async function(jobId) {
        try {
            // Get the job data using the Firestore document ID
            const jobRef = doc(db, 'jobs', jobId);
            const jobDoc = await getDoc(jobRef);
            
            if (!jobDoc.exists()) {
                console.error('Job document not found in Firestore for ID:', jobId);
                alert('Job not found');
                return;
            }

            const jobData = jobDoc.data();

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
            console.error('Error loading job data:', error);
            alert('Error loading job data. Please try again.');
        }
    };

    window.closeEditPopup = function() {
        document.getElementById('editPopupOverlay').style.display = 'none';
        document.body.style.overflow = 'auto';
    };

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
            fetchUserJobs(auth.currentUser.uid);

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

    window.deleteJob = async function(jobId) {
        if (confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) {
            try {
                // Delete the job from the jobs collection
                await deleteDoc(doc(db, 'jobs', jobId));

                // Remove the job ID from user's postedJobs array
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    postedJobs: arrayRemove(jobId)
                });

                // Show success notification
                showNotification('Job deleted successfully!');

                // Refresh the jobs list
                fetchUserJobs(auth.currentUser.uid);
            } catch (error) {
                console.error('Error deleting job:', error);
                showNotification('Error deleting job. Please try again.', 'error');
            }
        }
    };

    // Application Management
    function showApplicationModal(applicationId) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Manage Application</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="application-actions">
                        <button class="accept-btn" onclick="handleApplication('${applicationId}', 'accept')">
                            <i class="fas fa-check"></i> Accept
                        </button>
                        <button class="reject-btn" onclick="handleApplication('${applicationId}', 'reject')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                    <div class="message-section">
                        <textarea class="message-input" placeholder="Add a message (optional)"></textarea>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.querySelector('.close-modal').onclick = () => modal.remove();
    }

    async function handleApplication(applicationId, action) {
        const message = document.querySelector('.message-input').value;
        const modal = document.querySelector('.modal-overlay');

        try {
            const response = await fetch(`/api/applications/${applicationId}/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) throw new Error('Failed to update application');

            // Update UI
            const applicationCard = document.querySelector(`[data-application-id="${applicationId}"]`);
            if (applicationCard) {
                const statusElement = applicationCard.querySelector('.status');
                statusElement.className = `status ${action}ed`;
                statusElement.textContent = action === 'accept' ? 'Accepted' : 'Rejected';
                
                // Remove action buttons
                const actionsContainer = applicationCard.querySelector('.application-actions');
                if (actionsContainer) actionsContainer.remove();
            }

            // Show success message
            showNotification(`${action === 'accept' ? 'Accepted' : 'Rejected'} application successfully!`);
            
            // Close modal
            modal.remove();
        } catch (error) {
            console.error('Error:', error);
            showNotification('Failed to update application. Please try again.', 'error');
        }
    }

    // Notification helper
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Display applications in the UI
    function displayApplications(applications) {
        const applicationsContainer = document.getElementById('applicationsList');
        if (!applicationsContainer) return;

        if (applications.length === 0) {
            applicationsContainer.innerHTML = `
                <div class="no-applications-message">
                    <i class="fas fa-file-alt"></i>
                    <h3>No Applications Yet</h3>
                    <p>No one has applied to your jobs yet.</p>
                </div>
            `;
            return;
        }

        applicationsContainer.innerHTML = applications.map(app => `
            <div class="application-card" data-application-id="${app.id}">
                <div class="application-header">
                    <h3>${app.jobTitle}</h3>
                    <span class="status ${app.status}">${app.status}</span>
                </div>
                <div class="application-details">
                    <p><strong>Applicant:</strong> ${app.applicantName}</p>
                    <p><strong>Email:</strong> ${app.applicantEmail}</p>
                    <p><strong>Applied:</strong> ${new Date(app.appliedAt).toLocaleDateString()}</p>
                    <div class="cover-letter">
                        <strong>Cover Letter:</strong>
                        <p>${app.coverLetter}</p>
                    </div>
                </div>
                ${app.status === 'pending' ? `
                    <div class="application-actions">
                        <button class="manage-application" data-application-id="${app.id}">
                            <i class="fas fa-cog"></i> Manage
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');

        // Initialize application management
        document.querySelectorAll('.manage-application').forEach(button => {
            button.onclick = (e) => {
                e.preventDefault();
                const applicationId = button.dataset.applicationId;
                showApplicationModal(applicationId);
            };
        });
    }
}); 