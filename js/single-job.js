document.addEventListener('DOMContentLoaded', function() {
    // Get job ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

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

    // Load job data
    function loadJobData() {
        // Get jobs from localStorage
        const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
        
        // Find the job with matching ID
        const job = jobs.find(job => job.id === jobId);
        
        if (job) {
            // Update job details
            jobTitle.textContent = job.jobTitle;
            companyName.textContent = job.companyName;
            companyLogo.src = job.companyLogo;
            jobType.textContent = job.jobType;
            location.textContent = job.location;
            salary.textContent = job.salary;
            deadline.textContent = formatDate(job.applicationDeadline);
            jobDescription.textContent = job.jobDescription;
            requirements.textContent = job.requirements;
            benefits.textContent = job.benefits;

            // Load similar jobs
            loadSimilarJobs(job);
        } else {
            // Job not found
            jobTitle.textContent = 'Job Not Found';
            companyName.textContent = 'The job you are looking for does not exist';
        }
    }

    // Format date
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // Load similar jobs
    function loadSimilarJobs(currentJob) {
        // Get jobs from localStorage
        const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
        
        // Filter similar jobs (same job type or location)
        const similarJobs = jobs.filter(job => 
            job.id !== currentJob.id && 
            (job.jobType === currentJob.jobType || job.location === currentJob.location)
        ).slice(0, 3); // Show max 3 similar jobs

        if (similarJobs.length > 0) {
            similarJobs.forEach(job => {
                const jobCard = createJobCard(job);
                similarJobsContainer.appendChild(jobCard);
            });
        } else {
            similarJobsContainer.innerHTML = '<p>No similar jobs found</p>';
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
                            <img src="${job.companyLogo}" alt="${job.companyName} logo" class="company-logo">
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
                                <span>Apply before: ${new Date(job.applicationDeadline).toLocaleDateString()}</span>
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

        // Add click event to navigate to the single job page
        card.addEventListener('click', function () {
            window.location.href = `single-job.html?id=${job.id}`;
        });

        // Prevent card click event when buttons are clicked
        const applyBtn = card.querySelector('.apply-btn');
        const saveBtn = card.querySelector('.save-btn');

        applyBtn.addEventListener('click', function (event) {
            event.stopPropagation(); // Prevent card click event
            // Add your logic for the apply button here
            console.log(`Apply button clicked for job ID: ${job.id}`);
        });

        saveBtn.addEventListener('click', function (event) {
            event.stopPropagation(); // Prevent card click event
            // Add your logic for the save button here
            console.log(`Save button clicked for job ID: ${job.id}`);
        });

        return card;
    }

    // Handle apply button click
    applyBtn.addEventListener('click', function() {
        // Check if user is logged in
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        if (isLoggedIn) {
            // Redirect to application page
            window.location.href = `apply.html?id=${jobId}`;
        } else {
            // Redirect to login page
            window.location.href = 'login.html';
        }
    });

    // Handle save button click
    saveBtn.addEventListener('click', function() {
        // Check if user is logged in
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        if (isLoggedIn) {
            // Toggle save state
            const isSaved = saveBtn.classList.toggle('saved');
            
            // Update icon
            saveBtn.innerHTML = isSaved ? 
                '<i class="fas fa-bookmark"></i>' : 
                '<i class="far fa-bookmark"></i>';
            
            // Save to localStorage
            const savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
            
            if (isSaved) {
                savedJobs.push(jobId);
            } else {
                const index = savedJobs.indexOf(jobId);
                if (index > -1) {
                    savedJobs.splice(index, 1);
                }
            }
            
            localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
        } else {
            // Redirect to login page
            window.location.href = 'login.html';
        }
    });

    // Check if job is saved
    function checkSavedStatus() {
        const savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
        const isSaved = savedJobs.includes(jobId);
        
        if (isSaved) {
            saveBtn.classList.add('saved');
            saveBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
        }
    }

    // Initialize page
    loadJobData();
    checkSavedStatus();
});