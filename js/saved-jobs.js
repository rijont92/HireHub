import { auth, db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy, doc, getDoc, updateDoc, arrayUnion, addDoc, onSnapshot, arrayRemove, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { translations, currentLanguage } from './translations.js';

document.addEventListener('DOMContentLoaded', function() {
    const savedJobsContainer = document.getElementById('savedJobsContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');

    const applyModalOverlay = document.getElementById('applyModalOverlay');
    const closeApplyModal = document.getElementById('closeApplyModal');
    const cancelApply = document.getElementById('cancelApply');
    const applyForm = document.getElementById('applyForm');
    const applyJobTitle = document.getElementById('applyJobTitle');
    
    let currentJobId = null;

    // Add language change event listener
    window.addEventListener('languageChanged', () => {
        // Update translations for all job cards
        const jobCards = document.querySelectorAll('.job-item');
        jobCards.forEach(card => {
            const elements = card.querySelectorAll('[data-translate]');
            elements.forEach(element => {
                const key = element.getAttribute('data-translate');
                if (translations[currentLanguage][key]) {
                    element.textContent = translations[currentLanguage][key];
                }
            });
        });
    });

    function createJobCard(job, jobId) {
        const jobTypeClass = job.jobType.toLowerCase().replace(' ', '-');
        const isClosed = job.status === 'closed';
        const isApplied = job.applications && job.applications.includes(auth.currentUser?.uid);
        const isOwnJob = job.postedBy === auth.currentUser?.uid;
        
        const jobItem = document.createElement('div');
        jobItem.className = `job-item ${isClosed ? 'closed' : ''}`;
        jobItem.dataset.jobId = jobId;

        jobItem.innerHTML = `
            <div class="job-item-content">
                <div class="job-item-header">
                    <div class="company-logo-wrapper">
                        <img src="${job.companyLogo || '../img/logo.png'}" alt="${job.companyName} logo" class="company-logo">
                    </div>
                    <div class="job-item-info">
                        <h3 class="job-title">${job.jobTitle}</h3>
                        <p class="company-name">${job.companyName}</p>
                        <div class="job-meta-info">
                            <div class="meta-item job-type ${jobTypeClass}">
                                <i class="fas fa-briefcase"></i>
                                <span data-translate="${job.jobType}">${translations[currentLanguage][job.jobType] || job.jobType}</span>
                            </div>
                            <div class="meta-item location">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${job.location}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="job-item-details">
                    <div class="job-info">
                        <div class="salary">
                            <i class="fas fa-money-bill-wave"></i>
                            <span>${job.salary}</span>
                        </div>
                        <div class="deadline">
                            <i class="far fa-clock"></i>
                            <span><span data-translate="apply-before">${translations[currentLanguage]['apply-before']}</span>: ${formatDate(job.applicationDeadline)}</span>
                        </div>
                    </div>
                    
                    <div class="job-actions">
                        ${isOwnJob ? `
                            <button class="apply-btn disabled" disabled>
                                <i class="fas fa-user"></i> <span data-translate="your-job">${translations[currentLanguage]['your-job']}</span>
                            </button>
                        ` : isClosed ? `
                            <button class="apply-btn disabled" disabled>
                                <i class="fas fa-lock"></i> <span data-translate="closed">${translations[currentLanguage]['closed']}</span>
                            </button>
                        ` : isApplied ? `
                            <div class="application-status status-pending">
                                <i class="fas fa-clock"></i>
                                <span data-translate="pending">${translations[currentLanguage]['pending']}</span>
                            </div>
                        ` : `
                            <button class="apply-btn" data-job-id="${jobId}">
                                <i class="fas fa-paper-plane"></i> <span data-translate="apply-now">${translations[currentLanguage]['apply-now']}</span>
                            </button>
                        `}
                        <button class="save-btn saved" data-job-id="${jobId}">
                            <i class="fas fa-bookmark"></i> <span data-translate="saved">${translations[currentLanguage]['saved']}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        jobItem.addEventListener('click', (e) => {
            if (e.target.closest('.job-actions')) {
                return;
            }
            window.location.href = `../html/single-job.html?id=${jobId}`;
        });

        const saveBtn = jobItem.querySelector('.save-btn');
        saveBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await toggleSaveJob(jobId);
        });

        const applyBtn = jobItem.querySelector('.apply-btn');
        if (applyBtn && !applyBtn.disabled) {
            applyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Check if user is the job poster
                if (isOwnJob) {
                    showNotification('You cannot apply to your own job posting.', 'error');
                    return;
                }
                
                // Check if job is closed
                if (isClosed) {
                    showNotification('This job is closed and no longer accepting applications.', 'error');
                    return;
                }
                
                showApplyModal(jobId, job.jobTitle);
            });
        }

        if (isApplied) {
            checkApplicationStatus(jobId, jobItem);
        }

        return jobItem;
    }

    async function checkApplicationStatus(jobId, jobItem) {
        try {
            const applicationsRef = collection(db, 'applications');
            const q = query(
                applicationsRef,
                where('jobId', '==', jobId),
                where('userId', '==', auth.currentUser?.uid)
            );
            
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const application = snapshot.docs[0].data();
                const statusElement = jobItem.querySelector('.application-status');
                if (statusElement) {
                    const status = application.status || 'pending';
                    const statusClass = status === 'approved' ? 'status-approved' : 
                                     status === 'rejected' ? 'status-rejected' : 'status-pending';
                    const icon = status === 'approved' ? 'fa-check' : 
                               status === 'rejected' ? 'fa-times' : 'fa-clock';
                    
                    statusElement.className = `application-status ${statusClass}`;
                    statusElement.innerHTML = `
                        <i class="fas ${icon}"></i>
                        <span data-translate="${status}">${translations[currentLanguage][status] || status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    `;
                    if (application.message) {
                        statusElement.title = application.message;
                    }
                }
            }
        } catch (error) {
            console.error('Error checking application status:', error);
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();
        
        // Get the translated month name
        const translatedMonth = translations[currentLanguage][month] || month;
        
        return `${day} ${translatedMonth} ${year}`;
    }

    async function loadSavedJobs() {
        try {
            const user = auth.currentUser;
            if (!user) {
                window.location.href = '../html/login.html';
                return;
            }

            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            const savedJobs = userDoc.data()?.savedJobs || [];

            const jobsContainer = document.getElementById('savedJobsContainer');
            jobsContainer.innerHTML = '';

            if (savedJobs.length === 0) {
                showEmptyState();
                return;
            }

            for (const jobId of savedJobs) {
                const jobRef = doc(db, 'jobs', jobId);
                const jobDoc = await getDoc(jobRef);
                
                if (jobDoc.exists()) {
                    const jobData = jobDoc.data();
                    
                    const jobCard = createJobCard(jobData, jobId);
                    jobsContainer.appendChild(jobCard);
                }
            }

            if (jobsContainer.children.length === 0) {
                showEmptyState();
            }
        } catch (error) {
            console.error('Error loading saved jobs:', error);
            showEmptyState();
        }
    }

    function showEmptyState() {
        const jobsContainer = document.getElementById('savedJobsContainer');
        jobsContainer.innerHTML = `
            <div class="no-saved-jobs-container">
                <i class="fas fa-bookmark no-saved-jobs-icon"></i>
                <h2 class="no-saved-jobs-title" data-translate="no-saved-jobs">No Saved Jobs Yet</h2>
                <p class="no-saved-jobs-description" data-translate="no-saved-jobs-text">
                    You haven't saved any jobs yet. Start exploring and save jobs that interest you to keep track of them here.
                </p>
                <a href="jobs.html" class="explore-jobs-btn">
                    <i class="fas fa-search"></i>
                    <span data-translate="explore-jobs">Explore Jobs</span>
                   
                </a>
            </div>
        `;

        if (window.updateTranslations) {
                            window.updateTranslations();
        }
    }

    async function toggleSaveJob(jobId) {
        try {
            const user = auth.currentUser;
            if (!user) {
                window.location.href = '../html/login.html';
                return;
            }

            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            const savedJobs = userDoc.data()?.savedJobs || [];

            if (savedJobs.includes(jobId)) {
                await updateDoc(userRef, {
                    savedJobs: arrayRemove(jobId)
                });
                
                const jobCard = document.querySelector(`.job-item[data-job-id="${jobId}"]`);
                if (jobCard) {
                    jobCard.remove();
                }

                const savedJobsContainer = document.getElementById('savedJobsContainer');
                const remainingJobs = document.querySelectorAll('.job-item');
                if (remainingJobs.length === 0) {
                    savedJobsContainer.innerHTML = `
                        <div class="no-saved-jobs-container">
                            <i class="fas fa-bookmark no-saved-jobs-icon"></i>
                            <h2 class="no-saved-jobs-title">No Saved Jobs Yet</h2>
                            <p class="no-saved-jobs-description">
                                You haven't saved any jobs yet. Start exploring and save jobs that interest you to keep track of them here.
                            </p>
                            <a href="jobs.html" class="explore-jobs-btn">
                                <i class="fas fa-search"></i>
                                Explore Jobs
                            </a>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error toggling save job:', error);
            showNotification('Failed to update saved jobs. Please try again.', 'error');
        }
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function showApplyModal(jobId, jobTitle) {
        currentJobId = jobId;
        applyJobTitle.textContent = jobTitle;
        applyModalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function hideApplyModal() {
        applyModalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
        applyForm.reset();
        currentJobId = null;
    }

    applyModalOverlay.addEventListener('click', (e) => {
        if (e.target === applyModalOverlay) {
            hideApplyModal();
        }
    });

    closeApplyModal.addEventListener('click', hideApplyModal);
    cancelApply.addEventListener('click', hideApplyModal);

    applyForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) {
            window.location.href = '../html/login.html';
            return;
        }

        // Check if user is trying to apply to their own job
        if (currentJobId) {
            try {
                const jobRef = doc(db, 'jobs', currentJobId);
                const jobDoc = await getDoc(jobRef);
                if (jobDoc.exists()) {
                    const jobData = jobDoc.data();
                    if (jobData.postedBy === user.uid) {
                        showNotification('You cannot apply to your own job posting.', 'error');
                        hideApplyModal();
                        return;
                    }
                    
                    // Check if job is closed
                    if (jobData.status === 'closed') {
                        showNotification('This job is closed and no longer accepting applications.', 'error');
                        hideApplyModal();
                        return;
                    }
                }
            } catch (error) {
                console.error('Error checking job ownership:', error);
            }
        }

        try {
            const formData = new FormData(applyForm);
            const resumeFile = formData.get('resume');
            
            if (!resumeFile || resumeFile.size === 0) {
                showNotification('Please upload your resume', 'error');
                return;
            }

            if (resumeFile.size > 5 * 1024 * 1024) {
                showNotification('Resume file size should be less than 5MB', 'error');
                return;
            }

            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(resumeFile.type)) {
                showNotification('Please upload a PDF or Word document', 'error');
                return;
            }

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

            const applicationsRef = collection(db, 'applications');
            await addDoc(applicationsRef, applicationData);

            const jobRef = doc(db, 'jobs', currentJobId);
            await updateDoc(jobRef, {
                applications: arrayUnion(user.uid)
            });

            hideApplyModal();

            const successNotification = document.getElementById('successNotification');
            successNotification.classList.add('show');

            document.getElementById('closeNotification').addEventListener('click', () => {
                successNotification.classList.remove('show');
            });

            if (window.updateTranslations) {
                window.updateTranslations();
            }

            // Update the job card to show pending status
            const jobItem = document.querySelector(`.job-item[data-job-id="${currentJobId}"]`);
            if (jobItem) {
                const jobActions = jobItem.querySelector('.job-actions');
                const applyBtn = jobActions.querySelector('.apply-btn');
                if (applyBtn) {
                    const statusElement = document.createElement('div');
                    statusElement.className = 'application-status status-pending';
                    statusElement.innerHTML = `
                        <i class="fas fa-clock"></i>
                        <span data-translate="pending">${translations[currentLanguage]['pending']}</span>
                    `;
                    jobActions.replaceChild(statusElement, applyBtn);
                }
            }

            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error('Error submitting application:', error);
            showNotification('Error submitting application. Please try again.', 'error');
        }
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadSavedJobs();
        } else {
            window.location.href = '../html/login.html';
        }
    });
}); 