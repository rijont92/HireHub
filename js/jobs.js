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
        const applyBtn = e.target.closest('.apply-btn');
        const saveBtn = e.target.closest('.save-btn');

        // Prevent navigation if "Apply Now" or "Save Job" buttons are clicked
        if (applyBtn) {
            e.stopPropagation(); // Prevent card click
            const jobId = applyBtn.dataset.jobId;
            applyForJob(jobId);
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

    // Function to handle job application
    function applyForJob(jobId) {
        // Add your job application logic here
        console.log('Applying for job:', jobId);
    }

    // Function to handle saving a job
    function saveJob(jobId) {
        // Add your save job logic here
        console.log('Saving job:', jobId);
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
});