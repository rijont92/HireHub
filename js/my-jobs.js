import { auth } from '../js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', function() {
    const myJobsContainer = document.getElementById('myJobsContainer');
    const noJobsMessage = document.getElementById('noJobsMessage');
    const editFormPopup = document.getElementById('editFormPopup');
    const closeEditForm = document.getElementById('closeEditForm');
    const editJobForm = document.getElementById('editJobForm');
    let currentJobId = null;

    // Function to create a job card
    function createJobCard(job) {
        const jobTypeClass = job.jobType.toLowerCase().replace(' ', '-');
        
        return `
            <div class="job-card" data-job-id="${job.id}">
                <div class="job-card-content">
                    <div class="company-logo-wrapper">
                        <img src="${job.companyLogo || '../img/default-logo.png'}" alt="${job.companyName} logo">
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

                    <div class="job-sections">
                        <div class="section">
                            <h4>Job Description</h4>
                            <p>${job.jobDescription}</p>
                        </div>
                        
                        <div class="section">
                            <h4>Requirements</h4>
                            <p>${job.requirements}</p>
                        </div>
                        
                        <div class="section">
                            <h4>Benefits</h4>
                            <p>${job.benefits}</p>
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
                    </div>

                    <div class="job-actions">
                        <button class="edit-btn" data-job-id="${job.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" data-job-id="${job.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Function to display jobs
    function displayJobs(jobs) {
        console.log('Displaying jobs:', jobs);
        myJobsContainer.innerHTML = '';
        
        if (jobs.length === 0) {
            noJobsMessage.style.display = 'block';
            console.log('No jobs to display');
        } else {
            noJobsMessage.style.display = 'none';
            jobs.forEach(job => {
                const jobCardHTML = createJobCard(job);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = jobCardHTML;
                myJobsContainer.appendChild(tempDiv.firstElementChild);
            });
            console.log('Displayed', jobs.length, 'jobs');
        }
    }

    // Function to load jobs
    function loadJobs() {
        // Debug logging
        console.log('Loading jobs...');
        console.log('Current user:', JSON.parse(localStorage.getItem('currentUser')));
        console.log('All jobs:', JSON.parse(localStorage.getItem('jobs') || '[]'));
        console.log('My jobs:', JSON.parse(localStorage.getItem('myJobs') || '[]'));

        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const allJobs = JSON.parse(localStorage.getItem('jobs') || '[]');
        
        if (currentUser && currentUser.uid) {
            // Filter jobs posted by the current user
            const userJobs = allJobs.filter(job => job.postedBy === currentUser.uid);
            console.log('Filtered user jobs:', userJobs);
            displayJobs(userJobs);
        } else {
            console.log('No user logged in');
            displayJobs([]);
        }
    }

    // Function to open edit form
    function openEditForm(jobId) {
        const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
        const job = jobs.find(j => j.id === jobId);
        
        if (job) {
            currentJobId = jobId;
            document.getElementById('editJobTitle').value = job.jobTitle;
            document.getElementById('editCompanyName').value = job.companyName;
            document.getElementById('editJobType').value = job.jobType;
            document.getElementById('editLocation').value = job.location;
            document.getElementById('editSalary').value = job.salary;
            document.getElementById('editJobDescription').value = job.jobDescription;
            document.getElementById('editRequirements').value = job.requirements;
            document.getElementById('editBenefits').value = job.benefits;
            document.getElementById('editApplicationDeadline').value = job.applicationDeadline;
            
            editFormPopup.style.display = 'flex';
        }
    }

    // Function to close edit form
    function closeEditFormPopup() {
        editFormPopup.style.display = 'none';
        currentJobId = null;
        editJobForm.reset();
    }

    // Function to handle edit form submission
    function handleEditFormSubmit(e) {
        e.preventDefault();
        
        const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
        const jobIndex = jobs.findIndex(j => j.id === currentJobId);
        
        if (jobIndex !== -1) {
            jobs[jobIndex] = {
                ...jobs[jobIndex],
                jobTitle: document.getElementById('editJobTitle').value,
                companyName: document.getElementById('editCompanyName').value,
                jobType: document.getElementById('editJobType').value,
                location: document.getElementById('editLocation').value,
                salary: document.getElementById('editSalary').value,
                jobDescription: document.getElementById('editJobDescription').value,
                requirements: document.getElementById('editRequirements').value,
                benefits: document.getElementById('editBenefits').value,
                applicationDeadline: document.getElementById('editApplicationDeadline').value
            };
            
            localStorage.setItem('jobs', JSON.stringify(jobs));
            closeEditFormPopup();
            loadJobs();
        }
    }

    // Function to handle job deletion
    function handleDeleteJob(jobId) {
        if (confirm('Are you sure you want to delete this job?')) {
            const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
            const updatedJobs = jobs.filter(job => job.id !== jobId);
            localStorage.setItem('jobs', JSON.stringify(updatedJobs));
            loadJobs();
        }
    }

    // Event Listeners
    myJobsContainer.addEventListener('click', function(e) {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        
        if (editBtn) {
            const jobId = editBtn.dataset.jobId;
            openEditForm(jobId);
        }
        
        if (deleteBtn) {
            const jobId = deleteBtn.dataset.jobId;
            handleDeleteJob(jobId);
        }
    });

    closeEditForm.addEventListener('click', closeEditFormPopup);
    editJobForm.addEventListener('submit', handleEditFormSubmit);

    // Initial load
    loadJobs();
});
