console.log('jobs.js loaded');
document.addEventListener('DOMContentLoaded', function() {
    const jobsContainer = document.getElementById('jobsContainer');
    const searchInput = document.getElementById('searchInput');
    const jobTypeFilter = document.getElementById('jobTypeFilter');
    const locationFilter = document.getElementById('locationFilter');
    const noJobsMessage = document.getElementById('noJobsMessage');
    const loadingSpinner = document.getElementById('loadingSpinner');

    let allJobs = [];
    let locations = new Set();

    // Job Application Modal Functionality
    const applicationModal = document.getElementById('applicationModal');
    const successModal = document.getElementById('successModal');
    const closeModal = document.querySelector('.close-modal');
    const closeSuccessModal = document.getElementById('closeSuccessModal');
    const jobApplicationForm = document.getElementById('jobApplicationForm');
    const jobTitleModal = document.getElementById('jobTitleModal');

    // Function to create a job card
    function createJobCard(job) {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        jobCard.setAttribute('data-job-id', job.id);
        
        // Get application status and message if exists
        const applications = JSON.parse(localStorage.getItem('jobApplications') || '[]');
        console.log('All applications:', applications);
        
        const userApplication = applications.find(app => app.jobId === job.id);
        console.log('User application for job:', userApplication);
        
        const hasMessage = userApplication && userApplication.messages && userApplication.messages.length > 0;
        const lastMessage = hasMessage ? userApplication.messages[userApplication.messages.length - 1] : null;
        console.log('Last message:', lastMessage);

        // Handle company logo
        let logoPath = job.companyLogo;
        if (!logoPath) {
            logoPath = '../img/logo.png';
        }
        
        jobCard.innerHTML = `
            <div class="job-card-content">
                <div class="job-header">
                    <div class="company-logo-wrapper">
                        <img src="${logoPath}" alt="${job.companyName || 'Company'} logo" class="company-logo">
                    </div>
                </div>
                <div class="job-title-section">
                    <h3 class="job-title">${job.jobTitle || 'Job Title'}</h3>
                    <p class="company-name">${job.companyName || 'Company Name'}</p>
                </div>
                <div class="job-meta-info">
                    <div class="meta-item job-type ${(job.jobType || '').toLowerCase().replace(' ', '-')}">
                        <i class="fas fa-briefcase"></i>
                        <span>${job.jobType || 'Full Time'}</span>
                    </div>
                    <div class="meta-item location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${job.location || 'Location'}</span>
                    </div>
                </div>
                <div class="job-footer">
                    <div class="job-info">
                        <div class="salary">
                            <i class="fas fa-money-bill-wave"></i>
                            <span>${job.salary || 'Salary not specified'}</span>
                        </div>
                        <div class="deadline">
                            <i class="far fa-clock"></i>
                            <span>Apply before: ${job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'No deadline'}</span>
                        </div>
                    </div>
                    <div class="job-actions">
                        ${userApplication ? `
                            <div class="application-status">
                                <span class="status-badge ${userApplication.status.toLowerCase()}">
                                    ${userApplication.status}
                                </span>
                            </div>
                            ${hasMessage ? `
                                <button class="message-btn" data-message="${lastMessage.text}">
                                    <i class="fas fa-envelope"></i>
                                    View Message
                                </button>
                            ` : ''}
                        ` : `
                            <button class="apply-btn" onclick="applyForJob('${job.id}')">
                                <i class="fas fa-paper-plane"></i>
                                Apply Now
                            </button>
                            <button class="save-btn" onclick="saveJob('${job.id}')">
                                <i class="far fa-bookmark"></i>
                                Save Job
                            </button>
                        `}
                        <button class="view-details-btn" onclick="window.location.href='single-job.html?id=${job.id}'">
                            <i class="fas fa-eye"></i>
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add event listener for message button if it exists
        if (hasMessage) {
            const messageBtn = jobCard.querySelector('.message-btn');
            if (messageBtn) {
                messageBtn.addEventListener('mouseenter', function() {
                    console.log('Mouse entered message button');
                    const message = this.getAttribute('data-message');
                    console.log('Message to display:', message);
                    
                    // Create and show tooltip
                    const tooltip = document.createElement('div');
                    tooltip.className = 'message-tooltip';
                    tooltip.innerHTML = `
                        <div class="tooltip-content">
                            <p>${message}</p>
                            <small>${new Date(lastMessage.timestamp).toLocaleString()}</small>
                        </div>
                    `;
                    document.body.appendChild(tooltip);
                    
                    // Position tooltip
                    const rect = this.getBoundingClientRect();
                    tooltip.style.position = 'fixed';
                    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
                    tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
                    
                    console.log('Tooltip created and positioned');
                });

                messageBtn.addEventListener('mouseleave', function() {
                    console.log('Mouse left message button');
                    const tooltip = document.querySelector('.message-tooltip');
                    if (tooltip) {
                        tooltip.remove();
                        console.log('Tooltip removed');
                    }
                });
            }
        }

        return jobCard;
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
        console.log('Displaying jobs:', jobs);
        jobsContainer.innerHTML = '';
        
        if (jobs.length === 0) {
            console.log('No jobs to display');
            noJobsMessage.style.display = 'block';
        } else {
            noJobsMessage.style.display = 'none';
            jobs.forEach(job => {
                console.log('Creating card for job:', job);
                const jobCard = createJobCard(job);
                jobsContainer.appendChild(jobCard);
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

    // Function to fetch jobs from your backend/database
    async function fetchJobs() {
        try {
            loadingSpinner.style.display = 'flex';
            console.log('Fetching jobs...');
            
            // Get jobs from localStorage
            let storedJobs = localStorage.getItem('jobs');
            console.log('Stored jobs:', storedJobs);
            
            if (!storedJobs) {
                console.log('No stored jobs found, creating sample jobs');
                // Sample job data if no jobs exist in localStorage
                const sampleJobs = [
                    {
                        id: '1',
                        jobTitle: 'Programming Teacher',
                        companyName: 'Innovation Academy',
                        companyLogo: '../img/innovation-academy-job.jpg',
                        jobType: 'part-time',
                        location: 'Vushtrri',
                        salary: '1000-1200',
                        applicationDeadline: '2025-06-30',
                        jobDescription: 'We are looking for a skilled Programming Teacher to join our team and inspire the next generation of developers. Responsibilities include creating lesson plans, teaching programming languages, and mentoring students.',
                        requirements: ['3+ years of teaching experience', 'Proficiency in Python and JavaScript', 'Strong communication skills'],
                        benefits: ['Flexible hours', 'Health insurance', 'Professional development opportunities']
                    },
                    {
                        id: '2',
                        jobTitle: 'Sales Consultant',
                        companyName: 'Peugeot Kosova',
                        companyLogo: '../img/peugout-kosova-job.png',
                        jobType: 'part-time',
                        location: 'Ferizaj',
                        salary: '700-850',
                        applicationDeadline: '2025-07-20',
                        jobDescription: 'Peugeot Kosova is looking for Sales Consultants to assist customers in selecting vehicles and providing excellent customer service. Responsibilities include product knowledge, customer interaction, and sales support.',
                        requirements: ['Experience in sales', 'Strong communication skills', 'Customer-oriented attitude'],
                        benefits: ['Flexible hours', 'Employee discounts', 'Training opportunities'],
                        vacancies: { total: 10, applied: 4 }
                    },
                    {
                        id: '3',
                        jobTitle: 'Manager',
                        companyName: 'Viva Fresh',
                        companyLogo: '../img/viva-fresh-job.png',
                        jobType: 'full-time',
                        location: 'Vushtrri',
                        salary: "850-950",
                        applicationDeadline: '2025-07-25',
                        jobDescription: 'Viva Fresh is seeking a Manager to oversee operations at our supermarket. Responsibilities include managing staff, ensuring customer satisfaction, and maintaining inventory.',
                        requirements: ['Experience in retail management', 'Strong leadership skills', 'Excellent communication abilities'],
                        benefits: ['Health insurance', 'Paid time off', 'Employee discounts'],
                        vacancies: { total: 3, applied: 1 }
                    }
                ];
                
                localStorage.setItem('jobs', JSON.stringify(sampleJobs));
                allJobs = sampleJobs;
                console.log('Sample jobs created and saved:', allJobs);
            } else {
                allJobs = JSON.parse(storedJobs);
                console.log('Loaded jobs from localStorage:', allJobs);
            }
            
            // Extract unique locations
            allJobs.forEach(job => locations.add(job.location));
            
            // Populate location filter
            populateLocationFilter();
            
            // Display all jobs initially
            displayJobs(allJobs);
            console.log('Jobs displayed:', allJobs.length);
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
        }
    }

    // Initial load
    fetchJobs();

    // Function to open application modal
    function openApplicationModal(jobId, jobTitle) {
        jobTitleModal.textContent = jobTitle;
        jobTitleModal.dataset.jobId = jobId;
        applicationModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // Function to close modals
    function closeModals() {
        applicationModal.style.display = 'none';
        successModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Event listeners for closing modals
    closeModal.addEventListener('click', closeModals);
    closeSuccessModal.addEventListener('click', closeModals);

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === applicationModal || e.target === successModal) {
            closeModals();
        }
    });

    // Handle form submission
    jobApplicationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser || !currentUser.uid) {
            alert('Please log in to apply for jobs');
            return;
        }

        // Get job ID and check if it's a sample job
        const jobId = jobTitleModal.dataset.jobId;
        const isSampleJob = ['1', '2', '3'].includes(jobId);
        
        console.log('Submitting application for job:', {
            jobId,
            isSampleJob,
            jobTitle: jobTitleModal.textContent
        });

        // Get all form fields with validation
        const fullName = document.getElementById('fullName')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const phone = document.getElementById('phone')?.value.trim();
        const coverLetter = document.getElementById('coverLetter')?.value.trim();
        const resumeFile = document.getElementById('resume')?.files[0];

        // Validate required fields
        if (!fullName || !email || !phone) {
            alert('Please fill in all required fields');
            return;
        }

        console.log('Form fields collected:', {
            fullName,
            email,
            phone,
            coverLetter,
            resumeFile: resumeFile ? resumeFile.name : 'No file'
        });

        // Get the job details
        const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
        const job = jobs.find(j => j.id === jobId);
        console.log('Job details:', job);
        
        if (!job) {
            alert('Job not found');
            return;
        }

        // Check if user has already applied
        const applications = JSON.parse(localStorage.getItem('jobApplications') || '[]');
        console.log('All applications before applying:', applications);
        
        const existingApplication = applications.find(app => app.jobId === jobId && app.userId === currentUser.uid);
        console.log('Existing application check:', existingApplication);
        
        if (existingApplication) {
            alert('You have already applied for this job');
            return;
        }

        const formData = {
            id: Date.now().toString(),
            jobId: jobId,
            userId: currentUser.uid,
            jobPosterId: job.userId, // Add the job poster's ID
            jobTitle: job.jobTitle,
            fullName: fullName,
            email: email,
            phone: phone,
            coverLetter: coverLetter,
            resume: resumeFile ? resumeFile.name : '',
            applicationDate: new Date().toISOString(),
            status: 'pending',
            messages: []
        };
        
        console.log('New application data:', formData);

        // Save the application
        applications.push(formData);
        localStorage.setItem('jobApplications', JSON.stringify(applications));
        console.log('Updated applications after adding new one:', JSON.parse(localStorage.getItem('jobApplications')));

        // Show success message
        const successModal = document.getElementById('successModal');
        applicationModal.style.display = 'none';
        successModal.style.display = 'block';

        // Reset form
        jobApplicationForm.reset();

        // Close success modal after 3 seconds
        setTimeout(() => {
            successModal.style.display = 'none';
            // Refresh the page to show updated application status
            window.location.reload();
        }, 3000);
    });

    // Function to update application status
    function updateApplicationStatus(applicationId, newStatus, message) {
        const applications = JSON.parse(localStorage.getItem('jobApplications')) || [];
        const application = applications.find(app => app.id === applicationId);
        
        if (application) {
            application.status = newStatus;
            if (message) {
                application.messages = application.messages || [];
                application.messages.push({
                    text: message,
                    sender: 'Admin',
                    timestamp: new Date().toISOString()
                });
            }
            
            localStorage.setItem('jobApplications', JSON.stringify(applications));
            fetchJobs(); // Refresh the job list to show updated status
        }
    }

    // Add event delegation for job card clicks
    jobsContainer.addEventListener('click', function(e) {
        const jobCard = e.target.closest('.job-card');
        if (jobCard && !e.target.closest('.apply-btn') && !e.target.closest('.save-btn')) {
            const jobId = jobCard.getAttribute('data-job-id');
            window.location.href = `single-job.html?id=${jobId}`;
        }
    });

    // Function to handle job application
    function applyForJob(jobId) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        console.log('Current user when applying for job:', currentUser);
        
        if (!currentUser || !currentUser.uid) {
            alert('Please log in to apply for jobs');
            return;
        }

        // Get the job details
        const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
        const job = jobs.find(j => j.id === jobId);
        console.log('Job details:', job);
        
        if (!job) {
            alert('Job not found');
            return;
        }

        // Check if user has already applied
        const applications = JSON.parse(localStorage.getItem('jobApplications') || '[]');
        console.log('All applications before applying:', applications);
        
        const existingApplication = applications.find(app => app.jobId === jobId && app.userId === currentUser.uid);
        console.log('Existing application check:', existingApplication);
        
        if (existingApplication) {
            alert('You have already applied for this job');
            return;
        }

        // Open the application modal
        const modal = document.getElementById('applicationModal');
        const jobTitleModal = document.getElementById('jobTitleModal');
        jobTitleModal.textContent = job.jobTitle;
        modal.style.display = 'block';

        // Handle form submission
        const form = document.getElementById('jobApplicationForm');
        form.onsubmit = function(e) {
            e.preventDefault();
            
            const formData = {
                id: Date.now().toString(),
                jobId: jobId,
                userId: currentUser.uid,
                jobPosterId: job.userId, // Add the job poster's ID
                jobTitle: job.jobTitle,
                fullName: form.fullName.value,
                email: form.email.value,
                phone: form.phone.value,
                coverLetter: form.coverLetter.value,
                resume: form.resume.value,
                applicationDate: new Date().toISOString(),
                status: 'pending',
                messages: []
            };
            
            console.log('New application data:', formData);

            // Save the application
            applications.push(formData);
            localStorage.setItem('jobApplications', JSON.stringify(applications));
            console.log('Updated applications after adding new one:', JSON.parse(localStorage.getItem('jobApplications')));

            // Show success message
            const successModal = document.getElementById('successModal');
            modal.style.display = 'none';
            successModal.style.display = 'block';

            // Reset form
            form.reset();

            // Close success modal after 3 seconds
            setTimeout(() => {
                successModal.style.display = 'none';
                // Refresh the page to show updated application status
                window.location.reload();
            }, 3000);
        };
    }

    // Function to handle saving a job
    function saveJob(jobId) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser || !currentUser.uid) {
            alert('Please log in to save jobs');
            return;
        }

        let savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '{}');
        if (!savedJobs[currentUser.uid]) {
            savedJobs[currentUser.uid] = [];
        }

        const jobIndex = savedJobs[currentUser.uid].indexOf(jobId);
        if (jobIndex === -1) {
            savedJobs[currentUser.uid].push(jobId);
            alert('Job saved successfully!');
        } else {
            savedJobs[currentUser.uid].splice(jobIndex, 1);
            alert('Job removed from saved jobs!');
        }

        localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
    }


    // Get all job cards
    const jobCards = document.querySelectorAll('.job-card');
    
    // Add search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            jobCards.forEach(card => {
                const jobTitle = card.querySelector('.job-title').textContent.toLowerCase();
                const companyName = card.querySelector('.company-name').textContent.toLowerCase();
                const jobLocation = card.querySelector('.location').textContent.toLowerCase();
                
                if (jobTitle.includes(searchTerm) || 
                    companyName.includes(searchTerm) || 
                    jobLocation.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // Add click handler for status badges
    document.addEventListener('click', function(e) {
        const statusBadge = e.target.closest('.status-badge');
        if (statusBadge) {
            // Only show popup for Approved and Rejected statuses
            if (statusBadge.classList.contains('status-approved') || 
                statusBadge.classList.contains('status-rejected')) {
                // Toggle active class
                statusBadge.classList.toggle('active');
                
                // Close other popups
                document.querySelectorAll('.status-badge.active').forEach(badge => {
                    if (badge !== statusBadge) {
                        badge.classList.remove('active');
                    }
                });
            }
        } else {
            // Close all popups when clicking outside
            document.querySelectorAll('.status-badge.active').forEach(badge => {
                badge.classList.remove('active');
            });
        }
    });

    // Add function to view application status
    function viewApplicationStatus(applicationId) {
        const applications = JSON.parse(localStorage.getItem('jobApplications')) || [];
        const application = applications.find(app => app.id === applicationId);
        
        if (application) {
            // Open modal with application details
            const modal = document.getElementById('applicationStatusModal');
            const modalContent = modal.querySelector('.modal-content');
            
            modalContent.innerHTML = `
                <span class="close">&times;</span>
                <h2>Application Status</h2>
                <div class="status-details">
                    <p><strong>Job:</strong> ${application.jobTitle}</p>
                    <p><strong>Status:</strong> ${application.status}</p>
                    <p><strong>Applied on:</strong> ${new Date(application.applicationDate).toLocaleDateString()}</p>
                    ${application.messages.length > 0 
                        ? `<div class="messages">
                            <h3>Messages:</h3>
                            ${application.messages.map(msg => `
                                <div class="message">
                                    <p><strong>${msg.sender}:</strong> ${msg.text}</p>
                                    <small>${new Date(msg.timestamp).toLocaleString()}</small>
                                </div>
                            `).join('')}
                        </div>`
                        : ''
                    }
                </div>
            `;
            
            modal.style.display = 'block';
            
            // Close modal when clicking the X
            modal.querySelector('.close').onclick = () => {
                modal.style.display = 'none';
            };
            
            // Close modal when clicking outside
            window.onclick = (event) => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            };
        }
    }

    // Function to show message popup
    function showMessage(button, jobId) {
        // Get applications from localStorage
        const applications = JSON.parse(localStorage.getItem('jobApplications') || '[]');
        const application = applications.find(app => app.jobId === jobId);
        
        if (application && application.messages && application.messages.length > 0) {
            const lastMessage = application.messages[application.messages.length - 1];
            
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'popup-overlay';
            document.body.appendChild(overlay);

            // Create popup
            const popup = document.createElement('div');
            popup.className = 'message-popup';
            popup.innerHTML = `
                <div class="message-content">
                    <h3>Message from Admin</h3>
                    <p>${lastMessage.text}</p>
                    <p class="message-date">${new Date(lastMessage.timestamp).toLocaleString()}</p>
                    <button class="close-popup">Close</button>
                </div>
            `;
            document.body.appendChild(popup);

            // Add event listeners
            const closeBtn = popup.querySelector('.close-popup');
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(popup);
                document.body.removeChild(overlay);
            });

            overlay.addEventListener('click', () => {
                document.body.removeChild(popup);
                document.body.removeChild(overlay);
            });
        } else {
            alert('No messages available for this application.');
        }
    }

    function closeMessagePopup(button) {
        const popup = button.closest('.message-popup');
        if (popup) {
            popup.classList.remove('active');
            
            // Remove overlay
            const overlay = document.querySelector('.popup-overlay');
            if (overlay) {
                document.body.removeChild(overlay);
            }
        }
    }

    // Add overlay styles if they don't exist
    if (!document.querySelector('style#popup-overlay-styles')) {
        const style = document.createElement('style');
        style.id = 'popup-overlay-styles';
        style.textContent = `
            .popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
            }
            
            .message-popup.active {
                display: block;
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -48%); }
                to { opacity: 1; transform: translate(-50%, -50%); }
            }
        `;
        document.head.appendChild(style);
    }
});

// Make functions globally accessible
window.applyForJob = function(jobId) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser || !currentUser.uid) {
        alert('Please log in to apply for jobs');
        return;
    }

    // Get the job details
    const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
    const job = jobs.find(j => j.id === jobId);
    
    if (!job) {
        alert('Job not found');
        return;
    }

    // Check if user has already applied
    const applications = JSON.parse(localStorage.getItem('jobApplications') || '[]');
    const existingApplication = applications.find(app => app.jobId === jobId && app.userId === currentUser.uid);
    
    if (existingApplication) {
        alert('You have already applied for this job');
        return;
    }

    // Open the application modal
    const modal = document.getElementById('applicationModal');
    const jobTitleModal = document.getElementById('jobTitleModal');
    jobTitleModal.textContent = job.jobTitle;
    modal.style.display = 'block';

    // Handle form submission
    const form = document.getElementById('jobApplicationForm');
    form.onsubmit = function(e) {
        e.preventDefault();
        
        const formData = {
            id: Date.now().toString(),
            jobId: jobId,
            userId: currentUser.uid,
            jobPosterId: job.userId, // Add the job poster's ID
            jobTitle: job.jobTitle,
            fullName: form.fullName.value,
            email: form.email.value,
            phone: form.phone.value,
            coverLetter: form.coverLetter.value,
            resume: form.resume.value,
            applicationDate: new Date().toISOString(),
            status: 'pending',
            messages: []
        };

        // Save the application
        applications.push(formData);
        localStorage.setItem('jobApplications', JSON.stringify(applications));

        // Show success message
        const successModal = document.getElementById('successModal');
        modal.style.display = 'none';
        successModal.style.display = 'block';

        // Reset form
        form.reset();

        // Close success modal after 3 seconds
        setTimeout(() => {
            successModal.style.display = 'none';
            // Refresh the page to show updated application status
            window.location.reload();
        }, 3000);
    };
};

window.saveJob = function(jobId) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser || !currentUser.uid) {
        alert('Please log in to save jobs');
        return;
    }

    let savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '{}');
    if (!savedJobs[currentUser.uid]) {
        savedJobs[currentUser.uid] = [];
    }

    const jobIndex = savedJobs[currentUser.uid].indexOf(jobId);
    if (jobIndex === -1) {
        savedJobs[currentUser.uid].push(jobId);
        alert('Job saved successfully!');
    } else {
        savedJobs[currentUser.uid].splice(jobIndex, 1);
        alert('Job removed from saved jobs!');
    }

    localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
};

