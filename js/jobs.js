import { auth, db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy, doc, getDoc, updateDoc, arrayUnion, addDoc, onSnapshot, arrayRemove, setDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { storage } from './firebase-config.js';
import { translations, currentLanguage } from './translations.js';

document.addEventListener('DOMContentLoaded', function() {
    const jobsContainer = document.getElementById('jobsContainer');
    const searchInput = document.getElementById('searchInput');
    const jobTypeFilter = document.getElementById('jobTypeFilter');
    const locationFilter = document.getElementById('locationFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const noJobsMessage = document.getElementById('noJobsMessage');
    const loadingSpinner = document.getElementById('loadingSpinner');

    const applyModalOverlay = document.getElementById('applyModalOverlay');
    const closeApplyModal = document.getElementById('closeApplyModal');
    const cancelApply = document.getElementById('cancelApply');
    const applyForm = document.getElementById('applyForm');
    const applyJobTitle = document.getElementById('applyJobTitle');

    let currentJobId = null;

    let allJobs = [];
    let isFetching = false;

    // Get category from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFromUrl = urlParams.get('category');
    if (categoryFromUrl) {
        // Wait for category filter to be populated
        const checkCategoryFilter = setInterval(() => {
            if (categoryFilter.options.length > 1) {
                categoryFilter.value = categoryFromUrl;
                filterJobs();
                clearInterval(checkCategoryFilter);
            }
        }, 100);
    }

    function createJobCard(job) {
        const jobTypeClass = job.jobType.toLowerCase().replace(' ', '-');
        const isApplied = job.applications && job.applications.includes(auth.currentUser?.uid);
        const isSaved = job.isSaved || false;
        const isHotJob = job.isHotJob;
        const isOwnJob = job.postedBy === auth.currentUser?.uid;
        
        let applicationStatus = 'pending';
        let statusClass = 'status-pending';
        let applicationMessage = '';
        
        if (isApplied) {
            const applicationsRef = collection(db, 'applications');
            const q = query(
                applicationsRef,
                where('jobId', '==', job.id),
                where('userId', '==', auth.currentUser?.uid)
            );
            
            getDocs(q).then(snapshot => {
                if (!snapshot.empty) {
                    const application = snapshot.docs[0].data();
                    const statusElement = document.querySelector(`[data-job-id="${job.id}"] .application-status`);
                    if (statusElement) {
                        applicationStatus = application.status || 'pending';
                        statusClass = applicationStatus === 'approved' ? 'status-approved' : 
                                     applicationStatus === 'rejected' ? 'status-rejected' : 'status-pending';
                        applicationMessage = application.message || '';
                        statusElement.innerHTML = `
                            <i class="fas fa-clock"></i>
                            <span data-translate="${applicationStatus}">${applicationStatus.charAt(0).toUpperCase() + applicationStatus.slice(1)}</span>
                        `;
                        statusElement.className = `application-status ${statusClass}`;
                        if (applicationMessage) {
                            statusElement.title = applicationMessage;
                        }
                        // Update translations for the new status
                        if (window.updateTranslations) {
                            window.updateTranslations();
                        }
                    }
                }
            });
        }
        const status_r = {
            "full-time": "full-time",
            "part-time": "part-time",
            "contract": "contract",
            "internship": "internship"
        }
        
        // Count approved applications
        let approvedCount = 0;
        if (job.applications && Array.isArray(job.applications)) {
            approvedCount = job.applications.length; // fallback if only storing user IDs
        }
        if (job.approvedCount !== undefined) {
            approvedCount = job.approvedCount;
        }
        // If job is closed or full, mark as closed
        const isFull = job.vacancy && approvedCount >= job.vacancy;
        const isJobClosed = job.status === 'closed' || isFull;
        
        return `
            <div class="job-card ${isJobClosed ? 'closed' : ''} ${isHotJob ? 'hot-job' : ''}" data-job-id="${job.id}">
                ${isHotJob ? '<div class="hot-job-badge"><i class="fas fa-fire"></i> <span data-translate="hot-job">Hot Job</span></div>' : ''}
                <div class="job-card-content">
                    <div class="job-header">
                        <div class="company-logo-wrapper">
                            <img src="${job.companyLogo}" alt="${job.companyName} logo" class="company-logo">
                        </div>
                    </div>
                    <div class="job-title-section">
                        <h3 class="job-title">${job.jobTitle}</h3>
                        <p class="company-name">${job.companyName}</p>
                        ${isJobClosed ? `<span class="job-status closed" data-translate="closed">${translations[currentLanguage]['closed'] || 'Closed'}</span>` : ''}
                    </div>
                    <div class="job-meta-info">
                        <div class="meta-item job-type ${jobTypeClass}">
                            <i class="fas fa-briefcase"></i>
                            <span data-translate="${status_r[job.jobType]}">${translations[currentLanguage][status_r[job.jobType]] || job.jobType}</span>
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
                                <span> <span data-translate="apply-before">Apply before</span>: ${new Date(job.applicationDeadline).toLocaleDateString()}</span>
                            </div>
                        </div>
                        
                        <div class="job-actions">
                            ${isOwnJob ? `
                                <button class="apply-btn disabled" disabled>
                                    <i class="fas fa-user"></i> <span data-translate="your-job">${translations[currentLanguage]['your-job'] || 'Your Job'}</span>
                                </button>
                            ` : isApplied ? `
                                <div class="application-status ${statusClass}" title="${applicationMessage}">
                                    <i class="fas fa-clock"></i>
                                    <span data-translate="${applicationStatus}">${applicationStatus.charAt(0).toUpperCase() + applicationStatus.slice(1)}</span>
                                </div>
                            ` : isJobClosed ? `
                                <button class="apply-btn disabled" disabled>
                                    <i class="fas fa-lock"></i> <span data-translate="closed">${translations[currentLanguage]['closed'] || 'Closed'}</span>
                                </button>
                            ` : `
                                <button class="apply-btn" data-job-id="${job.id}">
                                    <i class="fas fa-paper-plane"></i> <span data-translate="apply-now">${translations[currentLanguage]['apply-now'] || 'Apply Now'}</span>
                                </button>
                            `}
                            <button class="save-btn ${isSaved ? 'saved' : ''}" data-job-id="${job.id}">
                                <i class="${isSaved ? 'fas' : 'far'} fa-bookmark"></i>
                                <span data-translate="${isSaved ? 'saved' : 'save'}"></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function filterJobs() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedJobType = jobTypeFilter.value.toLowerCase();
        const selectedLocation = locationFilter.value;
        const selectedCategory = categoryFilter.value;

        const filteredJobs = allJobs.filter(job => {
            if (!job) return false;

            const jobTitle = (job.jobTitle || '').toLowerCase();
            const companyName = (job.companyName || '').toLowerCase();
            const jobDescription = (job.jobDescription || '').toLowerCase();
            const jobType = (job.jobType || '').toLowerCase();
            const location = job.location || '';
            const category = job.category || '';

            const matchesSearch = jobTitle.includes(searchTerm) ||
                                companyName.includes(searchTerm) ||
                                jobDescription.includes(searchTerm);
            
            const matchesJobType = !selectedJobType || jobType === selectedJobType;
            const matchesLocation = !selectedLocation || location === selectedLocation;
            const matchesCategory = !selectedCategory || category === selectedCategory;

            return matchesSearch && matchesJobType && matchesLocation && matchesCategory;
        });

        displayJobs(filteredJobs);
    }

    function displayJobs(jobs) {
        jobsContainer.innerHTML = '';
        
        if (jobs.length === 0) {
            noJobsMessage.style.display = 'block';
        } else {
            noJobsMessage.style.display = 'none';
            
            jobs.sort((a, b) => {
                if (a.isHotJob && !b.isHotJob) return -1;
                if (!a.isHotJob && b.isHotJob) return 1;
                return new Date(b.postedDate) - new Date(a.postedDate);
            });

            jobs.forEach(job => {
                const jobCardHTML = createJobCard(job);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = jobCardHTML;
                jobsContainer.appendChild(tempDiv.firstElementChild);
            });

            // Update translations after jobs are displayed
            if (window.updateTranslations) {
                window.updateTranslations();
            }
        }
    }

    function populateLocationFilter() {
         const predifinedLocations = [
        'Prishtinë',
        'Prizren',
        'Gjakovë',
        'Pejë',
        'Mitrovicë',
        'Ferizaj',
        'Gjilan',
        'Vushtrri',
        'Podujev',
        'Suharekë',
        'Rahovec',
        'Fushë Kosovë',
        'Malishevë',
        'Drenas',
        'Lipjan',
        'Obiliq',
        'Dragash',
        'Istog',
        'Kamenicë',
        'Kaçanik',
        'Viti',
        'Deçan',
        'Skenderaj',
        'Klinë',
        'Graçanicë',
        'Hani i Elezit',
        'Junik',
        'Mamushë',
        'Shtime',
        'Shtërpcë',
        'Ranillug',
        'Kllokot',
        'Partesh',
        'Novobërd',
        'Zubin Potok',
        'Zveçan',
        'Leposaviç',
        'North Mitrovica'
        ];

        // Clear existing options
        locationFilter.innerHTML = '';
        
        // Add "All Locations" option with data-translate attribute
        const allLocationsOption = document.createElement('option');
        allLocationsOption.value = '';
        allLocationsOption.textContent = 'All Locations';
        allLocationsOption.setAttribute('data-translate', 'All Locations');
        locationFilter.appendChild(allLocationsOption);

        // Add location options
        predifinedLocations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            // Add data-translate attribute for North Mitrovica
            if (location === 'North Mitrovica') {
                option.setAttribute('data-translate', 'North Mitrovica');
            }
            option.textContent = location;
            locationFilter.appendChild(option);
        });

        // Update translations for the new options
        window.updateTranslations();
    }

    function populateCategoryFilter() {
        const predefinedCategories = [
            'IT & Software',
            'Design & Creative',
            'Marketing',
            'Sales',
            'Customer Service',
            'Finance',
            'Healthcare',
            'Education',
            'Engineering',
            'Manufacturing',
            'Retail',
            'Hospitality',
            'Transportation',
            'Construction',
            'Media & Entertainment',
            'Non-Profit',
            'Government',
            'Legal',
            'Human Resources',
            'Administrative',
            'Research & Development',
            'Quality Assurance',
            'Project Management',
            'Product Management',
            'Business Development',
            'Consulting',
            'Real Estate',
            'Insurance',
            'Banking',
            'Telecommunications',
            'Energy & Utilities',
            'Agriculture',
            'Environmental',
            'Security',
            'Logistics',
            'Supply Chain',
            'Architecture',
            'Art & Design',
            'Fashion',
            'Food & Beverage',
            'Sports & Fitness',
            'Travel & Tourism',
            'Other'
        ];

        // Clear existing options except the first one
        while (categoryFilter.options.length > 1) {
            categoryFilter.remove(1);
        }

        // Add new options with data-translate attributes
        predefinedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            option.setAttribute('data-translate', category);
            categoryFilter.appendChild(option);
        });

        // Update translations for the new options
        window.updateTranslations();
    }

    searchInput.addEventListener('input', filterJobs);
    jobTypeFilter.addEventListener('change', filterJobs);
    locationFilter.addEventListener('change', filterJobs);
    categoryFilter.addEventListener('change', filterJobs);

    // Listen for language changes
    window.addEventListener('languageChanged', () => {
        if (window.updateTranslations) {
            window.updateTranslations();
        }
    });

    async function fetchJobs() {
        if (isFetching) return;
        isFetching = true;
        
        try {
            loadingSpinner.style.display = 'flex';
            
            const jobsCollection = collection(db, 'jobs');
            const jobsQuery = query(jobsCollection, orderBy('postedDate', 'desc'));
            const querySnapshot = await getDocs(jobsQuery);
            
            allJobs = [];
            
            let savedJobs = [];
            if (auth.currentUser) {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    savedJobs = userDoc.data().savedJobs || [];
                }
            }
            
            for (const doc of querySnapshot.docs) {
                const jobData = doc.data();
                jobData.id = doc.id;
                jobData.isSaved = savedJobs.includes(doc.id);
                
                if (auth.currentUser && jobData.applications && jobData.applications.includes(auth.currentUser.uid)) {
                    const applicationsRef = collection(db, 'applications');
                    const q = query(
                        applicationsRef,
                        where('jobId', '==', doc.id),
                        where('userId', '==', auth.currentUser.uid)
                    );
                    const snapshot = await getDocs(q);
                    if (!snapshot.empty) {
                        const application = snapshot.docs[0].data();
                        jobData.applicationStatus = application.status || 'pending';
                        jobData.applicationMessage = application.message || '';
                    }
                }
                
                allJobs.push(jobData);
            }
              if (window.updateTranslations) {
                window.updateTranslations();
            }
            populateLocationFilter();
            populateCategoryFilter();
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

    fetchJobs();

    jobsContainer.addEventListener('click', function(e) {
        const jobCard = e.target.closest('.job-card');
        const applyBtn = e.target.closest('.apply-btn');
        const saveBtn = e.target.closest('.save-btn');

        if (applyBtn) {
            e.stopPropagation();
            const jobId = applyBtn.dataset.jobId;
            const job = allJobs.find(job => job.id === jobId);
            
            // Check if user is the job poster
            if (job && job.postedBy === auth.currentUser?.uid) {
                showNotification('You cannot apply to your own job posting.', 'error');
                return;
            }
            
            // Check if job is closed or full
            let approvedCount = 0;
            if (job.applications && Array.isArray(job.applications)) {
                approvedCount = job.applications.length;
            }
            if (job.approvedCount !== undefined) {
                approvedCount = job.approvedCount;
            }
            const isJobClosed = (job.status === 'closed') || (job.vacancy && approvedCount >= job.vacancy);
            if (isJobClosed) {
                showNotification('This job is closed or has reached its application limit.', 'error');
                return;
            }
            
            showApplyModal(jobId, job.jobTitle);
            return;
        }

        if (saveBtn) {
            e.stopPropagation();
            const jobId = saveBtn.dataset.jobId;
            saveJob(jobId);
            return; 
        }

        if (jobCard) {
            const jobId = jobCard.dataset.jobId;
            window.location.href = `single-job.html?id=${jobId}`;
        }
    });

    function showApplyModal(jobId, jobTitle) {
        const user = auth.currentUser;
        if (!user) {
            window.location.href = 'login.html';
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

        // Check if user is trying to apply to their own job
        if (currentJobId) {
            const job = allJobs.find(job => job.id === currentJobId);
            if (job && job.postedBy === user.uid) {
                showNotification('You cannot apply to your own job posting.', 'error');
                hideApplyModal();
                return;
            }
            
            // Check if job is closed or full
            let approvedCount = 0;
            if (job.applications && Array.isArray(job.applications)) {
                approvedCount = job.applications.length;
            }
            if (job.approvedCount !== undefined) {
                approvedCount = job.approvedCount;
            }
            const isJobClosed = (job.status === 'closed') || (job.vacancy && approvedCount >= job.vacancy);
            if (isJobClosed) {
                showNotification('This job is closed or has reached its application limit.', 'error');
                hideApplyModal();
                return;
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

            const successNotification = document.getElementById('successNotification');
            successNotification.classList.add('show');

            setTimeout(() => {
                successNotification.classList.remove('show');
            }, 5000);

            document.getElementById('closeNotification').addEventListener('click', () => {
                successNotification.classList.remove('show');
            });

            hideApplyModal();
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error('Error submitting application:', error);
            showNotification('Error submitting application. Please try again.', 'error');
        }
    });

    async function saveJob(jobId) {
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
                await setDoc(userRef, {
                    email: user.email,
                    savedJobs: [jobId],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                job.isSaved = true;
                saveBtn.innerHTML = `<i class="fas fa-bookmark"></i><span data-translate="saved"></span>`;
                saveBtn.classList.add('saved');
                if (window.updateTranslations) {
                    window.updateTranslations();
                }
                return;
            }

            const userData = userDoc.data();
            const savedJobs = userData.savedJobs || [];
            
            if (savedJobs.includes(jobId)) {
                await updateDoc(userRef, {
                    savedJobs: arrayRemove(jobId),
                    updatedAt: new Date().toISOString()
                });
                job.isSaved = false;
                saveBtn.innerHTML = `<i class="far fa-bookmark"></i><span data-translate="save"></span>`;
                saveBtn.classList.remove('saved');
            } else {
                await updateDoc(userRef, {
                    savedJobs: arrayUnion(jobId),
                    updatedAt: new Date().toISOString()
                });
                job.isSaved = true;
                saveBtn.innerHTML = `<i class="fas fa-bookmark"></i><span data-translate="saved"></span>`;
                saveBtn.classList.add('saved');
            }
            
            if (window.updateTranslations) {
                window.updateTranslations();
            }
        } catch (error) {
            console.error('Error saving job:', error);
            showNotification('Failed to save job. Please try again.', 'error');
        }
    }

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
                        saveBtn.innerHTML = `<i class="fas fa-bookmark"></i><span data-translate="saved"></span>`;
                        saveBtn.classList.add('saved');
                    }
                });
            }
        } catch (error) {
            console.error('Error checking saved jobs:', error);
        }
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            if (allJobs.length === 0) {
                fetchJobs();
            } else {
                checkSavedJobs();
            }
            
            const jobsRef = collection(db, 'jobs');
            const q = query(jobsRef, where('status', '==', 'active'));
            
            onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        fetchJobs();
                    }
                });
            });
        } else {
            displayJobs(allJobs);
        }
    });

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

    async function updateApplicationStatus(applicationId, status, message = '') {
        try {
            const applicationRef = doc(db, 'applications', applicationId);
            const applicationDoc = await getDoc(applicationRef);
            const application = applicationDoc.data();
            
            if (!application) {
                throw new Error('Application not found');
            }

            const jobRef = doc(db, 'jobs', application.jobId);
            const jobDoc = await getDoc(jobRef);
            const jobData = jobDoc.data();

            if (!jobData) {
                throw new Error('Job not found');
            }

            const batch = writeBatch(db);

            batch.update(applicationRef, {
                status: status,
                message: message,
                updatedAt: new Date().toISOString()
            });

            let applications = jobData.applications || [];
            if (status === 'approved') {
                if (!applications.includes(application.userId)) {
                    applications.push(application.userId);
                }
            } else if (status === 'rejected') {
                applications = applications.filter(id => id !== application.userId);
            }

            batch.update(jobRef, {
                applications: applications,
                updatedAt: new Date().toISOString()
            });

            await batch.commit();

            const statusMessage = status === 'approved' ? 'approved' : 'rejected';
            alert(`Application has been ${statusMessage} successfully!`);

            window.location.reload();

            return true;
        } catch (error) {
            console.error('Error updating application status:', error);
            alert('Failed to update application status. Please try again.');
            return false;
        }
    }

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

        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.accept-btn').addEventListener('click', async () => {
            const message = modal.querySelector('.message-input').value;
            const success = await updateApplicationStatus(application.id, 'accepted', message);
            if (success) {
                alert('Application accepted successfully!');
                modal.remove();
                window.location.reload();
            }
        });

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

    async function checkApplicationStatus(jobId) {
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
                return {
                    status: application.status || 'pending',
                    message: application.message || ''
                };
            }
            return null;
        } catch (error) {
            console.error('Error checking application status:', error);
            return null;
        }
    }
});