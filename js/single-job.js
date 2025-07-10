import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayRemove, arrayUnion, addDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { storage } from './firebase-config.js';
import { translations, currentLanguage } from './translations.js';

document.addEventListener('DOMContentLoaded', function() {
    // Add language change event listener
    window.addEventListener('languageChanged', () => {
        if (window.updateTranslations) {
            window.updateTranslations();
        }
    });

    // Initial translation update
    if (window.updateTranslations) {
        window.updateTranslations();
    }

    // Small delay to ensure translation system is ready
    setTimeout(() => {
        if (window.updateTranslations) {
            window.updateTranslations();
        }
    }, 100);

    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    if (!jobId) {
        window.location.href = 'jobs.html';
        return;
    }

    let currentJobId = jobId;

    const jobTitle = document.getElementById('jobTitle');
    const companyName = document.getElementById('companyName');
    const companyLogo = document.getElementById('companyLogo');
    const jobType = document.getElementById('jobType');
    const location = document.getElementById('location');
    const salary = document.getElementById('salary');
    const deadline = document.getElementById('deadline');
    const jobDescription = document.getElementById('jobDescription');
    const Vacancies = document.getElementById('number-vnc');
    const requirements = document.getElementById('requirements');
    const benefits = document.getElementById('benefits');
    const similarJobsContainer = document.getElementById('similarJobs');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const applyBtn = document.querySelector('.apply-btn');
    const saveBtn = document.querySelector('.save-btn')

    // Add missing modal element declarations
    const applyModalOverlay = document.getElementById('applyModalOverlay');
    const closeApplyModal = document.getElementById('closeApplyModal');
    const cancelApply = document.getElementById('cancelApply');
    const applyForm = document.getElementById('applyForm');
    const applyJobTitle = document.getElementById('applyJobTitle');

    let currentJob = null; // Store current job data globally
    let isOwnJob = false; // Track if current user is the job poster
    let isClosed = false; // Track if job is closed

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
        if (Vacancies) Vacancies.textContent = '';
        if (requirements) requirements.textContent = '';
        if (benefits) benefits.textContent = '';
        if (similarJobsContainer) similarJobsContainer.innerHTML = '';
    }

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
        if (Vacancies) Vacancies.textContent = '';
        if (requirements) requirements.textContent = '';
        if (benefits) benefits.textContent = '';
        if (similarJobsContainer) similarJobsContainer.innerHTML = '';
    }

    async function loadJobData() {
        showLoading(); // Ensure loading spinner is shown at the start
        try {
            const jobRef = doc(db, 'jobs', jobId);
            const jobDoc = await getDoc(jobRef);
            
            if (!jobDoc.exists()) {
                window.location.href = 'jobs.html';
                return;
            }

            const jobData = jobDoc.data();
            jobData.id = jobDoc.id;
            
            currentJob = jobData; // Store job data globally
            updateJobDetails(jobData);

            if (auth.currentUser) {
                saveToHistory(jobData);
            }

            await loadSimilarJobs(jobData);

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

            // Count approved applications
            let approvedCount = 0;
            if (jobData && jobData.id) {
                const applicationsRef = collection(db, 'applications');
                const q = query(applicationsRef, where('jobId', '==', jobData.id), where('status', '==', 'approved'));
                getDocs(q).then(snapshot => {
                    approvedCount = snapshot.size;
                    isClosed = jobData.status === 'closed';
                    // ... update UI or state as needed ...
                });
            } else {
                isClosed = jobData.status === 'closed';
            }
        } catch (error) {
            console.error('Error loading job:', error);
            showError('There was an error loading the job details');
        }
        
        // Ensure translations are applied after job data is loaded
        if (window.updateTranslations) {
            window.updateTranslations();
        }
    }

    function updateJobDetails(job) {
        const status_r = {
            "full-time": "full-time",
            "part-time": "part-time",
            "contract": "contract",
            "internship": "internship"
        }
        
        if (jobTitle) jobTitle.textContent = job.jobTitle;
        if (companyName) companyName.textContent = job.companyName;
        if (companyLogo) companyLogo.src = job.companyLogo || '../img/logo.png';
        if (jobType) {
            jobType.setAttribute('data-translate', status_r[job.jobType]);
            jobType.textContent = translations[currentLanguage][status_r[job.jobType]] || job.jobType;
        }
        if (location) {
            location.textContent = job.location;
        }
        if (salary) {
            salary.textContent = job.salary;
        }
        if (deadline) {
            deadline.innerHTML = formatDate(job.applicationDeadline);
        }
        if (jobDescription) {
            jobDescription.textContent = job.description;
        }
        if (Vacancies) {
            Vacancies.textContent = job.vacancy;
        }
        if (requirements) {
            requirements.textContent = job.requirements;
        }
        if (benefits) {
            benefits.textContent = job.benefits;
        }
        if (loadingSpinner) loadingSpinner.style.display = 'none';

        const saveBtn = document.querySelector('.save-btn');
        if (saveBtn) {
            saveBtn.setAttribute('data-job-id', job.id);
            saveBtn.innerHTML = `<i class="far fa-bookmark"></i><span data-translate="save">${translations[currentLanguage]['save'] || 'Save Job'}</span>`;
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const user = auth.currentUser;
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }
                await toggleSaveJob(job.id);
            });

            if (auth.currentUser) {
                checkSavedStatus(job.id);
            }
        }

        const jobCard = document.querySelector('.job-card');
        const applyBtn = document.querySelector('.apply-btn');
        const isApplied = job.applications && job.applications.includes(auth.currentUser?.uid);
        isOwnJob = job.postedBy === auth.currentUser?.uid;
        
        if (isOwnJob) {
            applyBtn.disabled = true;
            const isActuallyClosed = job.status === 'closed';
            if (isActuallyClosed) {
                if (jobCard) {
                    jobCard.classList.add('closed');
                }
                applyBtn.innerHTML = `<i class="fas fa-lock"></i> <span data-translate="your-job2">${translations[currentLanguage]['your-job2'] || 'Your Job |'}</span><span data-translate="closed">(${translations[currentLanguage]['closed'] || 'Closed'})</span>`;
                const jobTitleSection = document.querySelector('.job-title-section');
                const statusIndicator = document.createElement('span');
                statusIndicator.className = 'job-status closed';
                statusIndicator.innerHTML = `<span data-translate="closed">${translations[currentLanguage]['closed'] || 'Closed'}</span>`;
                if (jobTitleSection) {
                    jobTitleSection.appendChild(statusIndicator);
                }
            } else {
                applyBtn.innerHTML = `<i class="fas fa-user"></i> <span data-translate="your-job">${translations[currentLanguage]['your-job'] || 'Your Job'}</span>`;
            }
            applyBtn.style.backgroundColor = '#999';
            applyBtn.style.cursor = 'not-allowed';
            if (window.updateTranslations) {
                window.updateTranslations();
            }
        } else if (isApplied) {
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
                        <span data-translate="${application.status}">${translations[currentLanguage][application.status] || application.status.charAt(0).toUpperCase() + application.status.slice(1)}</span>
                    `;
                    if (application.message) {
                        statusElement.title = application.message;
                    }
                    
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
            applyBtn.innerHTML = `<i class="fas fa-lock"></i> <span data-translate="closed">${translations[currentLanguage]['closed'] || 'Closed'}</span>`;
            applyBtn.style.backgroundColor = '#999';
            applyBtn.style.cursor = 'not-allowed';
            const jobTitleSection = document.querySelector('.job-title-section');
            const statusIndicator = document.createElement('span');
            statusIndicator.className = 'job-status closed';
            statusIndicator.innerHTML = `<span data-translate="closed">${translations[currentLanguage]['closed'] || 'Closed'}</span>`;
            if (jobTitleSection) {
                jobTitleSection.appendChild(statusIndicator);
            }
        } else {
            applyBtn.innerHTML = `<i class="fas fa-paper-plane"></i> <span data-translate="apply-now">${translations[currentLanguage]['apply-now'] || 'Apply Now'}</span>`;
        }

        // Update translations after updating job details
        if (window.updateTranslations) {
            window.updateTranslations();
        }
    }

    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return dateString;
            }
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }

    function formatSimpleDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return dateString;
            }

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();

            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }

    async function loadSimilarJobs(currentJob) {
        try {
            if (!similarJobsContainer) {
                console.error('Similar jobs container not found');
                return;
            }

            const jobsQuery = query(
                collection(db, 'jobs'),
                where('jobType', '==', currentJob.jobType),
                where('status', '==', 'active')
            );

            const querySnapshot = await getDocs(jobsQuery);

            const similarJobs = [];

            querySnapshot.forEach((doc) => {
                const jobData = {
                    id: doc.id,  
                    ...doc.data()
                };
                
                if (doc.id !== currentJob.id) {
                    const similarJob = {
                        ...jobData,
                        id: doc.id  
                    };
                    similarJobs.push(similarJob);
                }
            });

            similarJobs.sort((a, b) => {
                if (a.location === currentJob.location && b.location !== currentJob.location) return -1;
                if (a.location !== currentJob.location && b.location === currentJob.location) return 1;
                return 0;
            });

            // Limit to 3 similar jobs
            const limitedSimilarJobs = similarJobs.slice(0, 3);

            similarJobsContainer.innerHTML = '';

            if (limitedSimilarJobs.length > 0) {
                const jobsGrid = document.createElement('div');
                jobsGrid.className = 'similar-jobs-grid-2';

                limitedSimilarJobs.forEach(job => {
                    const jobCard = createJobCard(job);
                    jobsGrid.appendChild(jobCard);
                });

                similarJobsContainer.appendChild(jobsGrid);
            } else {
                similarJobsContainer.innerHTML = `
                    <div class="no-similar-jobs">
                        <h3 data-translate="no-similar-title">No Similar Jobs Found</h3>
                        <p data-translate="no-similar-text">We couldn't find any similar jobs at the moment. Check back later for new opportunities.</p>
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

             if (window.updateTranslations) {
                window.updateTranslations();
            }
        }
    }

    async function checkSavedStatus(jobId) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const savedJobs = userData.savedJobs || [];
                
                const saveBtns = document.querySelectorAll(`.save-btn[data-job-id="${jobId}"]`);
                
                if (savedJobs.includes(jobId)) {
                    saveBtns.forEach(btn => {
                        const icon = btn.querySelector('i');
                        const span = btn.querySelector('span');
                        if (icon) icon.className = 'fas fa-bookmark';
                        if (span) {
                            span.setAttribute('data-translate', 'saved');
                            span.textContent = translations[currentLanguage]['saved'] || 'Saved';
                        }
                        btn.classList.add('saved');
                    });
                } else {
                    saveBtns.forEach(btn => {
                        const icon = btn.querySelector('i');
                        const span = btn.querySelector('span');
                        if (icon) icon.className = 'far fa-bookmark';
                        if (span) {
                            span.setAttribute('data-translate', 'save');
                            span.textContent = translations[currentLanguage]['save'] || 'Save Job';
                        }
                        btn.classList.remove('saved');
                    });
                }
            }
        } catch (error) {
            console.error('Error checking saved status:', error);
        }
    }

    async function toggleSaveJob(jobId) {
        const user = auth.currentUser;
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const savedJobs = userData.savedJobs || [];
                
                const saveBtns = document.querySelectorAll(`.save-btn[data-job-id="${jobId}"]`);
                
                if (savedJobs.includes(jobId)) {
                    await updateDoc(userRef, {
                        savedJobs: arrayRemove(jobId)
                    });
                    saveBtns.forEach(btn => {
                        const icon = btn.querySelector('i');
                        const span = btn.querySelector('span');
                        if (icon) icon.className = 'far fa-bookmark';
                        if (span) {
                            span.setAttribute('data-translate', 'save');
                            span.textContent = translations[currentLanguage]['save'] || 'Save Job';
                        }
                        btn.classList.remove('saved');
                    });
                    showNotification('Job removed from saved jobs', 'info');
                } else {
                    await updateDoc(userRef, {
                        savedJobs: arrayUnion(jobId)
                    });
                    saveBtns.forEach(btn => {
                        const icon = btn.querySelector('i');
                        const span = btn.querySelector('span');
                        if (icon) icon.className = 'fas fa-bookmark';
                        if (span) {
                            span.setAttribute('data-translate', 'saved');
                            span.textContent = translations[currentLanguage]['saved'] || 'Saved';
                        }
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

    async function saveToHistory(job) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const historyQuery = query(
                collection(db, 'jobHistory'),
                where('userId', '==', user.uid),
                where('jobId', '==', job.id)
            );
            
            const querySnapshot = await getDocs(historyQuery);
            
            if (!querySnapshot.empty) {
                const docRef = doc(db, 'jobHistory', querySnapshot.docs[0].id);
                await updateDoc(docRef, {
                    viewedAt: new Date()
                });
            } else {
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

    function showApplyModal(jobId, jobTitle) {
        if (!jobId) {
            console.error('No job ID provided to showApplyModal');
            return;
        }
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

    if (applyBtn) {
        applyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const user = auth.currentUser;
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            
            // Check if user is the job poster
            if (isOwnJob) {
                showNotification('You cannot apply to your own job posting.', 'error');
                return;
            }
            
            // Check if job is closed
            if (currentJob && currentJob.status === 'closed') {
                showNotification('This job is closed and no longer accepting applications.', 'error');
                return;
            }
            
            let approvedCount = 0;
            if (currentJob && currentJob.applications && Array.isArray(currentJob.applications)) {
                approvedCount = currentJob.applications.length;
            }
            if (currentJob && currentJob.approvedCount !== undefined) {
                approvedCount = currentJob.approvedCount;
            }
            const isJobClosed = (currentJob && currentJob.status === 'closed');
            if (isJobClosed) {
                showNotification('This job is closed or has reached its application limit.', 'error');
                return;
            }
            
            showApplyModal(jobId, currentJob.jobTitle);
        });

        if (auth.currentUser) {
            updateApplicationStatus(jobId);
        }
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
            window.location.href = 'login.html';
            return;
        }

        if (!currentJobId) {
            console.error('No job ID available for application submission');
            showNotification('Invalid job. Please try again.', 'error');
            return;
        }

        // Check if user is trying to apply to their own job
        if (currentJob && currentJob.postedBy === user.uid) {
            showNotification('You cannot apply to your own job posting.', 'error');
            hideApplyModal();
            return;
        }
        
        let approvedCount = 0;
        if (currentJob && currentJob.applications && Array.isArray(currentJob.applications)) {
            approvedCount = currentJob.applications.length;
        }
        if (currentJob && currentJob.approvedCount !== undefined) {
            approvedCount = currentJob.approvedCount;
        }
        const isJobClosed = (currentJob && currentJob.status === 'closed');
        if (isJobClosed) {
            showNotification('This job is closed or has reached its application limit.', 'error');
            hideApplyModal();
            return;
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

            const jobRef = doc(db, 'jobs', currentJobId);
            const jobDoc = await getDoc(jobRef);

            if (!jobDoc.exists()) {
                console.error('Job not found:', currentJobId);
                showNotification('This job is no longer available.', 'error');
                return;
            }

            const jobData = jobDoc.data();

            if (jobData.status !== 'active') {
                showNotification('This job is no longer accepting applications.', 'error');
                return;
            }

            if (jobData.applications && jobData.applications.includes(user.uid)) {
                showNotification('You have already applied for this job.', 'error');
                return;
            }

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


            const batch = writeBatch(db);

            const applicationsRef = collection(db, 'applications');
            const applicationDoc = await addDoc(applicationsRef, applicationData);

            let applications = jobData.applications || [];
            applications.push(user.uid);
            
            batch.update(jobRef, {
                applications: applications,
                updatedAt: new Date().toISOString()
            });

            await batch.commit();

            showNotification('Application submitted successfully!', 'success');
            hideApplyModal();

            const jobActions = document.querySelector('.job-actions');
            if (jobActions) {
                const applyBtn = jobActions.querySelector('.apply-btn');
                if (applyBtn) {
                    const statusElement = document.createElement('div');
                    statusElement.className = 'application-status status-pending';
                    statusElement.innerHTML = `
                        <i class="fas fa-clock"></i>
                        <span data-translate="pending">${translations[currentLanguage]['pending'] || 'Pending'}</span>
                    `;
                    jobActions.replaceChild(statusElement, applyBtn);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 2000));

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
                            <span data-translate="${application.status}">${translations[currentLanguage][application.status] || application.status.charAt(0).toUpperCase() + application.status.slice(1)}</span>
                        `;
                        if (application.message) {
                            statusElement.title = application.message;
                        }
                    }
                }
            }

            window.location.reload();
        } catch (error) {
            console.error('Error submitting application:', error);
            showNotification('Failed to submit application. Please try again.', 'error');
        }
    });

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
                            <span data-translate="${application.status}">${translations[currentLanguage][application.status] || application.status.charAt(0).toUpperCase() + application.status.slice(1)}</span>
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

    function createJobCard(job) {
        const card = document.createElement('div');
        
        const jobTypeClass = job.jobType.toLowerCase().replace(/\s+/g, '-');
        
        const jobId = job.id;
        
        if (!jobId || typeof jobId !== 'string' || jobId.length < 20) {
            console.error('Invalid job ID:', jobId);
            return card;
        }
        
        const status_r = {
            "full-time": "Full Time",
            "part-time": "Part Time",
            "contract": "Contract",
            "internship": "Internship"
        }

        const translationKeys = {
            "full-time": "full-time",
            "part-time": "part-time",
            "contract": "contract",
            "internship": "internship"
        }
        
        // Check if this is the user's own job
        const isOwnJob = job.postedBy === auth.currentUser?.uid;
        const isClosed = job.status === 'closed';
        
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
                                <span data-translate="${status_r[job.jobType]}">${translations[currentLanguage][status_r[job.jobType]] || status_r[job.jobType]}</span>
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
                                <span data-translate="apply-before">${translations[currentLanguage]['apply-before'] || 'Apply before:'}</span> ${formatSimpleDate(job.applicationDeadline)}
                            </div>
                        </div>
                        <div class="job-actions">
                            <!-- Job action buttons will be added here dynamically -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        return card;
    }

    // At the end of the DOMContentLoaded handler, call loadJobData
    loadJobData();
});