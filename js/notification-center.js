import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit, doc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

class NotificationCenter {
    constructor() {
        this.bells = document.querySelectorAll('.notification-bell');
        this.counts = document.querySelectorAll('.notification-count');
        this.panel = null;
        this.notifications = [];
        this.unreadCount = 0;
        
        if (this.bells.length === 0) {
            return;
        }

        if (this.counts.length === 0) {
            return;
        }
        
        this.init();
    }

    init() {
        this.createPanel();
        this.setupEventListeners();
        this.setupAuthListener();
    }

    createPanel() {
        // Remove existing panel if it exists
        const existingPanel = document.querySelector('.notification-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        this.panel = document.createElement('div');
        this.panel.className = 'notification-panel';
        this.panel.innerHTML = `
            <div class="notification-header">
                <h3>Notifications</h3>
                <div class="notification-actions">
                    <button class="clear-all-btn">Clear All</button>
                    <button class="close-btn">&times;</button>
                </div>
            </div>
            <div class="notification-list"></div>
        `;
        document.body.appendChild(this.panel);
    }

    setupEventListeners() {
        // Bell click handlers
        this.bells.forEach(bell => {
            bell.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.togglePanel();
            });
        });

        // Close button handler
        const closeBtn = this.panel.querySelector('.close-btn');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hidePanel();
        });

        // Clear all button handler
        const clearAllBtn = this.panel.querySelector('.clear-all-btn');
        clearAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearAllNotifications();
        });

        // Click outside handler
        document.addEventListener('click', (e) => {
            if (this.panel && this.panel.classList.contains('active')) {
                if (!this.panel.contains(e.target) && !Array.from(this.bells).some(bell => bell.contains(e.target))) {
                    this.hidePanel();
                }
            }
        });
    }

    setupAuthListener() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.listenForJobApplications(user.uid);
                this.listenForApplicationStatus(user.uid);
            } else {
                this.hidePanel();
                this.updateCount(0);
            }
        });
    }

    listenForJobApplications(userId) {
        try {
            // Query for jobs posted by the current user
            const jobsQuery = query(
                collection(db, 'jobs'),
                where('postedBy', '==', userId)
            );

            // Listen for changes in the user's jobs
            onSnapshot(jobsQuery, (jobsSnapshot) => {
                if (jobsSnapshot.size === 0) {
                    return;
                }

                jobsSnapshot.forEach((jobDoc) => {
                    const jobId = jobDoc.id;
                    const jobData = jobDoc.data();
                    
                    // Query for applications to this job
                    const applicationsQuery = query(
                        collection(db, 'applications'),
                        where('jobId', '==', jobId),
                        limit(10)
                    );

                    // Listen for new applications
                    onSnapshot(applicationsQuery, async (applicationsSnapshot) => {
                        const changes = applicationsSnapshot.docChanges();
                        for (const change of changes) {
                            if (change.type === 'added') {
                                const application = change.doc.data();
                                // Only create notification if the job is posted by the current user
                                if (jobData.postedBy === userId) {
                                    this.createNotification(application, jobData);
                                }
                            }
                        }

                        // Get all applications
                        const allApplicationsSnapshot = await getDocs(applicationsQuery);
                        const applications = allApplicationsSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        })).sort((a, b) => b.appliedAt - a.appliedAt);

                        // Get user data for each application
                        for (const application of applications) {
                            try {
                                const userDoc = await getDoc(doc(db, 'users', application.userId));
                                if (userDoc.exists()) {
                                    const userData = userDoc.data();
                                    application.fullName = userData.fullName;
                                }
                            } catch (error) {
                                console.error('Error getting user data:', error);
                            }
                        }
                    });
                });
            });
        } catch (error) {
            console.error('Error setting up job applications listener:', error);
        }
    }

    listenForApplicationStatus(userId) {
        try {
            // First, get all jobs posted by the user
            const jobsQuery = query(
                collection(db, 'jobs'),
                where('postedBy', '==', userId)
            );

            // Listen for changes in the user's jobs
            onSnapshot(jobsQuery, async (jobsSnapshot) => {
                // For each job, listen for application changes
                jobsSnapshot.forEach(async (jobDoc) => {
                    const jobId = jobDoc.id;

                    // Query for applications to this job
                    const applicationsQuery = query(
                        collection(db, 'applications'),
                        where('jobId', '==', jobId)
                    );

                    // Listen for changes in applications to this job
                    onSnapshot(applicationsQuery, async (applicationsSnapshot) => {
                        const changes = applicationsSnapshot.docChanges();
                        
                        for (const change of changes) {
                            // Handle both added and modified changes
                            if (change.type === 'added' || change.type === 'modified') {
                                const application = change.doc.data();
                                
                                // For added documents, we need to check if it has a status
                                // For modified documents, we need to check if the status changed
                                const shouldCreateNotification = 
                                    (change.type === 'added' && (application.status === 'approved' || application.status === 'rejected')) ||
                                    (change.type === 'modified' && 
                                     change.oldIndex !== -1 && 
                                     applicationsSnapshot.docs[change.oldIndex].data().status !== application.status &&
                                     (application.status === 'approved' || application.status === 'rejected'));

                                if (shouldCreateNotification) {
                                    const jobDoc = await getDoc(doc(db, 'jobs', jobId));
                                    if (jobDoc.exists()) {
                                        const jobData = jobDoc.data();
                                        this.createStatusNotification(application, jobData);
                                    }
                                }
                            }
                        }
                    });
                });
            });
        } catch (error) {
            console.error('Error setting up application status listener:', error);
        }
    }

    createNotification(application, job) {
        const notification = {
            id: `application-${application.id}`,
            jobId: application.jobId,
            jobTitle: job.jobTitle,
            applicantName: application.fullName,
            timestamp: application.appliedAt,
            read: false
        };

        this.notifications.unshift(notification);
        this.unreadCount++;
        this.updateCount(this.unreadCount);
        this.renderNotifications();
    }

    createStatusNotification(application, job) {
        let message = '';
        let icon = '';

        switch (application.status) {
            case 'approved':
                message = `Your application for <strong>${job.jobTitle}</strong> has been approved!`;
                icon = 'fa-check-circle';
                break;
            case 'rejected':
                message = `Your application for <strong>${job.jobTitle}</strong> has been rejected.`;
                icon = 'fa-times-circle';
                break;
            default:
                return; // Don't create notification for other statuses
        }

        const notification = {
            id: `status-${application.id}`,
            jobId: application.jobId,
            jobTitle: job.jobTitle,
            message: message,
            icon: icon,
            timestamp: new Date().toISOString(),
            read: false
        };

        this.notifications.unshift(notification);
        this.unreadCount++;
        this.updateCount(this.unreadCount);
        this.renderNotifications();
    }

    renderNotifications() {
        const list = this.panel.querySelector('.notification-list');
        list.innerHTML = '';

        if (this.notifications.length === 0) {
            list.innerHTML = `
                <div class="notification-item empty-state">
                    <div class="notification-content">
                        <div class="notification-header">
                            <i class="fa-solid fa-bell-slash"></i>
                        </div>
                        <div class="notification-message">
                            <h4>No Notifications Found</h4>
                            <p>You'll receive notifications here when someone applies to your posted jobs or when your applications are reviewed.</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        this.notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = `notification-item ${notification.read ? '' : 'unread'}`;
            
            // Check if this is a status notification
            const isStatusNotification = notification.id && notification.id.startsWith('status-');
            
            // Determine the icon and color based on notification type and status
            let icon = 'fa-user';
            let iconColor = '#4a90e2';
            
            if (isStatusNotification) {
                if (notification.message.includes('approved')) {
                    icon = 'fa-check-circle';
                    iconColor = '#2ecc71';
                } else if (notification.message.includes('rejected')) {
                    icon = 'fa-times-circle';
                    iconColor = '#e74c3c';
                }
            }
            
            item.innerHTML = `
                <div class="notification-content">
                    <div class="notification-header">
                        <i class="fa-solid ${icon}" style="color: ${iconColor}"></i>
                        <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                    </div>
                    <div class="notification-message">
                        ${isStatusNotification ? notification.message : 
                            `<strong>${notification.applicantName}</strong> applied for <strong>${notification.jobTitle}</strong>`}
                    </div>
                    <div class="application-actions">
                        <button class="view-application-btn" data-job-id="${notification.jobId}">
                            ${isStatusNotification ? 'View Job' : 'View Application'}
                        </button>
                    </div>
                </div>
                ${notification.read ? '' : '<div class="unread-dot"></div>'}
            `;

            // Add click handler for the notification
            item.addEventListener('click', () => {
                if (!notification.read) {
                    notification.read = true;
                    this.unreadCount--;
                    this.updateCount(this.unreadCount);
                    this.renderNotifications();
                }
            });

            // Add click handler for the view button
            const viewBtn = item.querySelector('.view-application-btn');
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isStatusNotification) {
                    window.location.href = `/html/single-job.html?id=${notification.jobId}`;
                } else {
                    window.location.href = '/html/dashboard.html';
                }
            });

            list.appendChild(item);
        });
    }

    formatTime(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const diff = now - date;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    togglePanel() {
        if (this.panel.classList.contains('active')) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    showPanel() {
        this.panel.classList.add('active');
    }

    hidePanel() {
        this.panel.classList.remove('active');
    }

    updateCount(count) {
        this.counts.forEach(countElement => {
            if (count > 0) {
                countElement.textContent = count;
                countElement.style.display = 'flex';
            } else {
                countElement.style.display = 'none';
            }
        });
    }

    clearAllNotifications() {
        this.notifications = [];
        this.unreadCount = 0;
        this.updateCount(0);
        this.renderNotifications();
    }
}

// Initialize notification center when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NotificationCenter();
}); 