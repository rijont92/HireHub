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

    let allJobs = [];

    onAuthStateChanged(auth, (user) => {
        if (user) {
            fetchUserJobs(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });

    async function fetchUserJobs(userId) {
        try {
            loadingSpinner.style.display = 'flex';
            jobsList.innerHTML = '';

            if (!userId || typeof userId !== 'string') {
                throw new Error('Invalid user ID');
            }

            const jobsQuery = query(
                collection(db, 'jobs'),
                where('postedBy', '==', userId)
            );
            const jobsSnapshot = await getDocs(jobsQuery);
            
            if (jobsSnapshot.empty) {
                jobsList.innerHTML = `
                    <div class="no-jobs-message">
                        <i class="fas fa-briefcase"></i>
                        <h3 data-translate="No Jobs Posted Yet">No Jobs Posted Yet</h3>
                        <p><span data-translate="any-jobs-yet">You haven't posted any jobs yet.</span> <a href="post-job.html" data-translate="post-first-job">Post your first job</a> <span data-translate="to-get-started">to get started!</span></p>
                    </div>
                `;
                jobsList.style.display = "block";
                loadingSpinner.style.display = 'none';
                if (window.updateTranslations) {
                            window.updateTranslations();
                        }
                return;
            }

            allJobs = [];
            const locations = new Set();

            jobsSnapshot.forEach(doc => {
                const job = { 
                    firestoreId: doc.id, 
                    ...doc.data()
                };
                allJobs.push(job);
                if (job.location) locations.add(job.location);
            });

            // Populate location filter with all predefined locations
            const predefinedLocations = [
                'Prishtinë', 'Prizren', 'Gjakovë', 'Pejë', 'Mitrovicë', 'Ferizaj', 'Gjilan',
                'Vushtrri', 'Podujev', 'Suharekë', 'Rahovec', 'Fushë Kosovë', 'Malishevë',
                'Drenas', 'Lipjan', 'Obiliq', 'Dragash', 'Istog', 'Kamenicë', 'Kaçanik',
                'Viti', 'Deçan', 'Skenderaj', 'Klinë', 'Graçanicë', 'Hani i Elezit', 'Junik',
                'Mamushë', 'Shtime', 'Shtërpcë', 'Ranillug', 'Kllokot', 'Partesh', 'Novobërd',
                'Zubin Potok', 'Zveçan', 'Leposaviç', 'North Mitrovica', 'Other'
            ];

            locationFilter.innerHTML = '<option value="" data-translate="All Locations">All Locations</option>';
            predefinedLocations.forEach(location => {
                const option = document.createElement('option');
                option.value = location;
                option.textContent = location;
                if (location === 'North Mitrovica') {
                    option.setAttribute('data-translate', 'North Mitrovica');
                }
                locationFilter.appendChild(option);
            });

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

    function displayJobs(jobs) {
        if (jobs.length === 0) {
            jobsList.innerHTML = `
                <div class="no-jobs-message">
                    <i class="fas fa-search"></i>
                    <h3 data-translate="01">No Jobs Found</h3>
                    <p data-translate="02">No jobs match your current filters.</p>
                </div>
            `;
if (window.updateTranslations) {
                            window.updateTranslations();
                        }
            jobsList.style.display = 'block'; 
            return;
        }

        const status_r = {
            "full-time":"Full Time",
            "part-time":"Part Time",
            "contract":"Contract",
            "internship":"Internship"
        }

        jobsList.innerHTML = jobs.map(job => `
            <div class="my-job-card" data-id="${job.firestoreId}" onclick="window.location.href='single-job.html?id=${job.firestoreId}'">
                <div class="company-logo-wrapper">
                    <img src="${job.companyLogo || '../img/logo.png'}" alt="${job.companyName}">
                </div>
                <div class="my-job-card-content">
                    <div class="job-title-section">
                        <h3 class="job-title">${job.jobTitle}</h3>
                        <p class="company-name">${job.companyName}</p>
                        ${job.status === 'closed' ? '<span class="job-status closed" data-translate="closed">Closed</span>' : ''}
                    </div>
                    <div class="job-meta-info">
                        <div class="meta-item job-type">
                            <i class="fas fa-briefcase"></i>
                            <span data-translate="${status_r[job.jobType]}">${status_r[job.jobType]}</span>
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
                                <i class="fas fa-edit"></i> <span data-translate="edit">Edit</span>
                            </button>
                            <button class="delete-btn" onclick="event.stopPropagation(); deleteJob('${job.firestoreId}')">
                                <i class="fas fa-trash"></i> <span data-translate="remove">Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        jobsList.style.display = "grid";

        if (window.updateTranslations) {
            window.updateTranslations();
        }
    }

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

    window.editJob = async function(jobId) {
        try {
            const jobRef = doc(db, 'jobs', jobId);
            const jobDoc = await getDoc(jobRef);
            
            if (!jobDoc.exists()) {
                console.error('Job document not found in Firestore for ID:', jobId);
                alert('Job not found');
                return;
            }

            const jobData = jobDoc.data();

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
            
            // Populate location select
            const locationSelect = document.getElementById('editLocation');
            locationSelect.innerHTML = ''; // Clear existing options
            
            const predefinedLocations = [
                'Prishtinë', 'Prizren', 'Gjakovë', 'Pejë', 'Mitrovicë', 'Ferizaj', 'Gjilan',
                'Vushtrri', 'Podujev', 'Suharekë', 'Rahovec', 'Fushë Kosovë', 'Malishevë',
                'Drenas', 'Lipjan', 'Obiliq', 'Dragash', 'Istog', 'Kamenicë', 'Kaçanik',
                'Viti', 'Deçan', 'Skenderaj', 'Klinë', 'Graçanicë', 'Hani i Elezit', 'Junik',
                'Mamushë', 'Shtime', 'Shtërpcë', 'Ranillug', 'Kllokot', 'Partesh', 'Novobërd',
                'Zubin Potok', 'Zveçan', 'Leposaviç', 'North Mitrovica', 'Other'
            ];
            
            predefinedLocations.forEach(location => {
                const option = document.createElement('option');
                option.value = location;
                option.textContent = location;
                locationSelect.appendChild(option);
            });
            
            locationSelect.value = jobData.location || '';

            document.getElementById('editSalary').value = jobData.salary;
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
            console.error('Error loading job data:', error);
            alert('Error loading job data. Please try again.');
        }
    };

    window.closeEditPopup = function() {
        document.getElementById('editPopupOverlay').style.display = 'none';
        document.body.style.overflow = 'auto';
    };

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
                jobDescription: document.getElementById('editJobDescription').value,
                requirements: document.getElementById('editRequirements').value,
                benefits: document.getElementById('editBenefits').value,
                applicationDeadline: document.getElementById('editApplicationDeadline').value,
                contactEmail: document.getElementById('editContactEmail').value,
                status: document.getElementById('editStatus').value,
                lastUpdated: new Date().toISOString()
            };

            await updateDoc(doc(db, 'jobs', jobId), formData);

            closeEditPopup();

            fetchUserJobs(auth.currentUser.uid);

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

    window.deleteJob = async function(jobId) {
        const deletePopup = document.createElement('div');
        deletePopup.className = 'delete-popup-overlay';
        deletePopup.innerHTML = `
            <div class="delete-popup">
                <div class="delete-popup-header">
                    <h2 data-translate="confirm-delete" data-translate="confirm-delete">Confirm Delete</h2>
                    <button class="close-popup" onclick="this.closest('.delete-popup-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="delete-popup-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p data-translate="delete-job-confirmation">Are you sure you want to delete this job posting? This action cannot be undone.</p>
                </div>
                <div class="delete-popup-actions">
                    <button class="cancel-btn" onclick="this.closest('.delete-popup-overlay').remove()" data-translate="cancel">Cancel</button>
                    <button class="delete-btn" id="confirmDeleteBtn" data-translate="remove">Delete</button>
                </div>
            </div>
        `;

        document.body.appendChild(deletePopup);
        document.body.style.overflow = 'hidden';

        const confirmDeleteBtn = deletePopup.querySelector('#confirmDeleteBtn');
        if (window.updateTranslations) {
                            window.updateTranslations();
                        }
        confirmDeleteBtn.onclick = async () => {
            try {
                await deleteDoc(doc(db, 'jobs', jobId));

                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                    postedJobs: arrayRemove(jobId)
                });

                showNotification('Job deleted successfully!');
                deletePopup.remove();
                document.body.style.overflow = 'auto';
                fetchUserJobs(auth.currentUser.uid);
            } catch (error) {
                console.error('Error deleting job:', error);
                showNotification('Error deleting job. Please try again.', 'error');
            }
        };

        // Close popup when clicking outside
        deletePopup.addEventListener('click', (e) => {
            if (e.target === deletePopup) {
                deletePopup.remove();
                document.body.style.overflow = 'auto';
            }
        });
    };

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

            const applicationCard = document.querySelector(`[data-application-id="${applicationId}"]`);
            if (applicationCard) {
                const statusElement = applicationCard.querySelector('.status');
                statusElement.className = `status ${action}ed`;
                statusElement.textContent = action === 'accept' ? 'Accepted' : 'Rejected';
                
                const actionsContainer = applicationCard.querySelector('.application-actions');
                if (actionsContainer) actionsContainer.remove();
            }

            showNotification(`${action === 'accept' ? 'Accepted' : 'Rejected'} application successfully!`);
            
            modal.remove();
        } catch (error) {
            console.error('Error:', error);
            showNotification('Failed to update application. Please try again.', 'error');
        }
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<span data-translate="${message}">${message}</span>`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);

        if (window.updateTranslations) {
            window.updateTranslations();
        }
    }

    function displayApplications(applications) {
        const applicationsContainer = document.getElementById('applicationsList');
        if (!applicationsContainer) return;

        if (applications.length === 0) {
            applicationsContainer.innerHTML = `
                <div class="no-applications-message">
                    <i class="fas fa-file-alt"></i>
                    <h3 >No Applications Yet</h3>
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

        document.querySelectorAll('.manage-application').forEach(button => {
            button.onclick = (e) => {
                e.preventDefault();
                const applicationId = button.dataset.applicationId;
                showApplicationModal(applicationId);
            };
        });
    }
}); 