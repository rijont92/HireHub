document.addEventListener('DOMContentLoaded', function() {
    const jobsContainer = document.getElementById('jobsContainer');
    const searchInput = document.getElementById('searchInput');
    const jobTypeFilter = document.getElementById('jobTypeFilter');
    const locationFilter = document.getElementById('locationFilter');
    const noJobsMessage = document.getElementById('noJobsMessage');
    const loadingSpinner = document.getElementById('loadingSpinner');

    let allJobs = [];
    let locations = new Set();

    // Function to create a job card
    function createJobCard(job) {
        const jobTypeClass = job.jobType.toLowerCase().replace(' ', '-');
        
        return `
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

    // Function to fetch jobs from your backend/database
    async function fetchJobs() {
        try {
            loadingSpinner.style.display = 'flex';
            
            // Get jobs from localStorage
            let storedJobs = localStorage.getItem('jobs');
            
            if (!storedJobs) {
                // Sample job data if no jobs exist in localStorage
                const sampleJobs = [
                    {
                        id: '1',
                        jobTitle: 'Frontend Developer',
                        companyName: 'Tech Solutions Inc.',
                        companyLogo: '../img/company-logo.png',
                        jobType: 'Full Time',
                        location: 'New York',
                        salary: '$80,000 - $100,000',
                        applicationDeadline: '2024-12-31',
                        jobDescription: 'We are looking for a skilled Frontend Developer to join our team...',
                        requirements: ['3+ years of experience', 'Proficiency in React', 'Strong CSS skills'],
                        benefits: ['Health insurance', 'Remote work options', 'Professional development']
                    },
                    {
                        id: '2',
                        jobTitle: 'Backend Developer',
                        companyName: 'Data Systems Ltd.',
                        companyLogo: '../img/company-logo.png',
                        jobType: 'Part Time',
                        location: 'San Francisco',
                        salary: '$70,000 - $90,000',
                        applicationDeadline: '2024-12-15',
                        jobDescription: 'Join our backend team to build scalable applications...',
                        requirements: ['Node.js experience', 'Database knowledge', 'API design'],
                        benefits: ['Flexible hours', 'Competitive salary', 'Team events']
                    },
                    {
                        id: '3',
                        jobTitle: 'UI/UX Designer',
                        companyName: 'Creative Design Co.',
                        companyLogo: '../img/company-logo.png',
                        jobType: 'Full Time',
                        location: 'Los Angeles',
                        salary: '$75,000 - $95,000',
                        applicationDeadline: '2024-12-20',
                        jobDescription: 'We need a creative UI/UX Designer to enhance our products...',
                        requirements: ['Portfolio required', 'Figma expertise', 'User research skills'],
                        benefits: ['Design tools provided', 'Creative environment', 'Career growth']
                    }
                ];
                
                localStorage.setItem('jobs', JSON.stringify(sampleJobs));
                allJobs = sampleJobs;
            } else {
                allJobs = JSON.parse(storedJobs);
            }
            
            // Extract unique locations
            allJobs.forEach(job => locations.add(job.location));
            
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
        }
    }

    // Initial load
    fetchJobs();

    // Add event delegation for job card clicks
    jobsContainer.addEventListener('click', function(e) {
        const jobCard = e.target.closest('.job-card');
        if (jobCard) {
            const jobId = jobCard.dataset.jobId;
            window.location.href = `single-job.html?id=${jobId}`;
        }
    });

    // Add event delegation for apply and save buttons
    jobsContainer.addEventListener('click', function(e) {
        const applyBtn = e.target.closest('.apply-btn');
        const saveBtn = e.target.closest('.save-btn');
        
        if (applyBtn) {
            e.stopPropagation(); // Prevent card click
            const jobId = applyBtn.dataset.jobId;
            applyForJob(jobId);
        }
        
        if (saveBtn) {
            e.stopPropagation(); // Prevent card click
            const jobId = saveBtn.dataset.jobId;
            saveJob(jobId);
        }
    });
});

// Function to handle job application
function applyForJob(jobId) {
    // Add your job application logic here
    console.log('Applying for job:', jobId);
} 