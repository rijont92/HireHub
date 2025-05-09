import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

class NotificationCenter {
    constructor() {
        this.bells = document.querySelectorAll('.notification-bell');
        this.counts = document.querySelectorAll('.notification-count');
        this.panel = null;
        this.notifications = [];
        this.unreadCount = 0;
        this.unsubscribers = [];
        this.isInitialized = false;
        
        if (this.bells.length === 0 || this.counts.length === 0) {
            return;
        }
        
        this.init();
    }

    init() {
        if (this.isInitialized) {
            console.log('DEBUG: Notification center already initialized');
            return;
        }

        console.log('DEBUG: Initializing notification center');
        this.createPanel();
        this.setupEventListeners();
        this.setupAuthListener();
        this.isInitialized = true;
    }

    createPanel() {
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
        this.bells.forEach(bell => {
            bell.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.togglePanel();
            });
        });

        const closeBtn = this.panel.querySelector('.close-btn');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hidePanel();
        });

        const clearAllBtn = this.panel.querySelector('.clear-all-btn');
        clearAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearAllNotifications();
        });

        document.addEventListener('click', (e) => {
            if (this.panel && this.panel.classList.contains('active')) {
                if (!this.panel.contains(e.target) && !Array.from(this.bells).some(bell => bell.contains(e.target))) {
                    this.hidePanel();
                }
            }
        });
    }

    setupAuthListener() {
        console.log('DEBUG: Setting up auth listener');
        
        // Clean up existing listeners
        this.cleanupListeners();
        
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log('DEBUG: User authenticated, loading notifications');
                this.loadNotifications(user.uid);
                this.setupJobApplicationListeners(user.uid);
                this.setupApplicationStatusListeners(user.uid);
            } else {
                console.log('DEBUG: No user authenticated, clearing notifications');
                this.hidePanel();
                this.updateCount(0);
                this.notifications = [];
                this.renderNotifications();
            }
        });
        this.unsubscribers.push(unsubscribe);
    }

    cleanupListeners() {
        console.log('DEBUG: Cleaning up existing listeners');
        this.unsubscribers.forEach(unsubscribe => {
            try {
                unsubscribe();
            } catch (error) {
                console.error('DEBUG: Error unsubscribing:', error);
            }
        });
        this.unsubscribers = [];
    }

    setupJobApplicationListeners(userId) {
        console.log('DEBUG: Setting up job application listener for user:', userId);
        
        // Listen for jobs posted by the user
        const jobsQuery = query(
            collection(db, 'jobs'),
            where('postedBy', '==', userId)
        );

        const unsubscribeJobs = onSnapshot(jobsQuery, async (jobsSnapshot) => {
            console.log('DEBUG: Jobs snapshot received:', jobsSnapshot.size);
            
            // Clean up any existing application listeners
            this.cleanupApplicationListeners();
            
            jobsSnapshot.forEach(async (jobDoc) => {
                const jobId = jobDoc.id;
                const jobData = jobDoc.data();
                console.log('DEBUG: Processing job:', { jobId, jobTitle: jobData.jobTitle });

                // Listen for applications to this job
                const applicationsQuery = query(
                    collection(db, 'applications'),
                    where('jobId', '==', jobId)
                );

                const unsubscribeApplications = onSnapshot(applicationsQuery, async (applicationsSnapshot) => {
                    console.log('DEBUG: Applications snapshot received for job:', jobId);
                    const changes = applicationsSnapshot.docChanges();
                    console.log('DEBUG: Number of application changes:', changes.length);
                    
                    for (const change of changes) {
                        if (change.type === 'added') {
                            try {
                                const application = change.doc.data();
                                console.log('DEBUG: New application data:', application);
                                
                                // Check if the application is new (within last 5 seconds)
                                const appliedAt = new Date(application.appliedAt || application.timestamp);
                                const now = new Date();
                                const isNewApplication = (now - appliedAt) < 5000; // 5 seconds

                                if (!isNewApplication) {
                                    console.log('DEBUG: Skipping old application:', {
                                        appliedAt: appliedAt.toISOString(),
                                        now: now.toISOString()
                                    });
                                    continue;
                                }

                                // Get the applicant's user data
                                const userDoc = await getDoc(doc(db, 'users', application.userId));
                                if (!userDoc.exists()) {
                                    console.error('DEBUG: User document not found for applicant:', application.userId);
                                    continue;
                                }

                                const userData = userDoc.data();
                                if (!userData) {
                                    console.error('DEBUG: User data is empty for applicant:', application.userId);
                                    continue;
                                }

                                // Create notification for the job poster
                                await this.createApplicationNotification({
                                    ...application,
                                    fullName: userData.fullName || userData.name || 'Unknown Applicant',
                                    profileImage: userData.profileImage || userData.photoURL || '../img/useri.png'
                                }, jobData);
                            } catch (error) {
                                console.error('DEBUG: Error processing application notification:', error);
                            }
                        }
                    }
                });
                this.unsubscribers.push(unsubscribeApplications);
            });
        });
        this.unsubscribers.push(unsubscribeJobs);
    }

    cleanupApplicationListeners() {
        // Remove only application-related listeners
        this.unsubscribers = this.unsubscribers.filter(unsubscribe => {
            try {
                unsubscribe();
                return false;
            } catch (error) {
                console.error('DEBUG: Error unsubscribing from application listener:', error);
                return true;
            }
        });
    }

    setupApplicationStatusListeners(userId) {
        console.log('🔔 Setting up application status listener for user:', userId);
        
        const applicationsQuery = query(
            collection(db, 'applications'),
            where('userId', '==', userId)
        );

        const unsubscribeApplications = onSnapshot(applicationsQuery, async (applicationsSnapshot) => {
            console.log('📥 Application status changes detected');
            
            const changes = applicationsSnapshot.docChanges();
            console.log('📊 Number of status changes:', changes.length);
            
            for (const change of changes) {
                if (change.type === 'modified') {
                    try {
                        const application = change.doc.data();
                        const oldData = change.oldIndex !== -1 ? applicationsSnapshot.docs[change.oldIndex].data() : null;
                        
                        console.log('🔄 Status change detected:', {
                            applicationId: change.doc.id,
                            oldStatus: oldData?.status,
                            newStatus: application.status,
                            jobId: application.jobId
                        });

                        if (application.status === 'approved' || application.status === 'rejected') {
                            console.log('✅ Processing status update:', application.status);
                            
                            const jobDoc = await getDoc(doc(db, 'jobs', application.jobId));
                            if (!jobDoc.exists()) {
                                console.error('❌ Job not found:', application.jobId);
                                continue;
                            }

                            const jobData = jobDoc.data();
                            console.log('📋 Job data retrieved:', {
                                jobId: application.jobId,
                                jobTitle: jobData.jobTitle
                            });
                            
                            await this.createStatusNotification(application, jobData, userId);
                            console.log('📨 Status notification created');
                        }
                    } catch (error) {
                        console.error('❌ Error in status notification:', error);
                    }
                }
            }
        });
        
        this.unsubscribers.push(unsubscribeApplications);
    }

    async loadNotifications(userId) {
        try {
            console.log('DEBUG: Loading notifications for user:', userId);
            const notificationsQuery = query(
                collection(db, 'notifications'),
                where('userId', '==', userId),
                orderBy('timestamp', 'desc')
            );

            const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
                console.log('DEBUG: Notifications snapshot received:', snapshot.size);
                this.notifications = [];
                this.unreadCount = 0;

                snapshot.forEach((doc) => {
                    const notification = { id: doc.id, ...doc.data() };
                    this.notifications.push(notification);
                    if (!notification.read) {
                        this.unreadCount++;
                    }
                });

                console.log('DEBUG: Processed notifications:', {
                    total: this.notifications.length,
                    unread: this.unreadCount
                });

                this.updateCount(this.unreadCount);
                this.renderNotifications();
            });
            this.unsubscribers.push(unsubscribe);
        } catch (error) {
            console.error('DEBUG: Error loading notifications:', error);
        }
    }

    async createApplicationNotification(application, job) {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error('DEBUG: No current user found');
                return;
            }

            console.log('DEBUG: Creating application notification:', {
                jobId: application.jobId,
                applicantId: application.userId,
                applicantName: application.fullName
            });

            // Validate required data
            if (!application || !job || !application.userId || !application.jobId) {
                console.error('DEBUG: Missing required data:', {
                    hasApplication: !!application,
                    hasJob: !!job,
                    userId: application?.userId,
                    jobId: application?.jobId
                });
                return;
            }

            // Check if notification already exists within the last 5 minutes
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const existingNotificationsQuery = query(
                collection(db, 'notifications'),
                where('userId', '==', user.uid),
                where('type', '==', 'application'),
                where('jobId', '==', application.jobId),
                where('applicantId', '==', application.userId),
                where('timestamp', '>=', fiveMinutesAgo)
            );

            const existingNotifications = await getDocs(existingNotificationsQuery);
            console.log('DEBUG: Checking for existing notifications:', {
                count: existingNotifications.size,
                userId: user.uid,
                jobId: application.jobId,
                applicantId: application.userId,
                timeWindow: '5 minutes'
            });

            if (!existingNotifications.empty) {
                console.log('DEBUG: Recent notification already exists, skipping');
                return;
            }

            // Ensure all required fields are present with fallbacks
            const notificationData = {
                type: 'application',
                jobId: application.jobId,
                jobTitle: job.jobTitle || 'Untitled Job',
                applicantId: application.userId,
                applicantName: application.fullName,
                applicantImage: application.profileImage,
                timestamp: new Date().toISOString(),
                read: false,
                userId: user.uid
            };

            console.log('DEBUG: Prepared notification data:', notificationData);

            // Validate all required fields are defined
            if (Object.values(notificationData).some(value => value === undefined)) {
                console.error('DEBUG: Invalid notification data:', notificationData);
                return;
            }

            const docRef = await addDoc(collection(db, 'notifications'), notificationData);
            console.log('DEBUG: Application notification created successfully:', {
                id: docRef.id,
                ...notificationData
            });
        } catch (error) {
            console.error('DEBUG: Error creating application notification:', error);
        }
    }

    async createStatusNotification(application, job, userId) {
        try {
            console.log('📝 Creating status notification for:', {
                userId,
                jobId: application.jobId,
                status: application.status
            });

            if (!application || !job || !application.jobId || !application.status) {
                console.error('❌ Missing required data for status notification');
                return;
            }

            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const existingNotificationsQuery = query(
                collection(db, 'notifications'),
                where('userId', '==', userId),
                where('type', '==', 'status'),
                where('jobId', '==', application.jobId),
                where('status', '==', application.status),
                where('timestamp', '>=', fiveMinutesAgo)
            );

            const existingNotifications = await getDocs(existingNotificationsQuery);
            console.log('🔍 Checking existing notifications:', {
                found: !existingNotifications.empty,
                userId,
                jobId: application.jobId,
                status: application.status
            });

            if (!existingNotifications.empty) {
                console.log('⏭️ Recent notification exists, skipping');
                return;
            }

            let jobPosterName = 'The employer';
            try {
                const jobPosterDoc = await getDoc(doc(db, 'users', job.postedBy));
                if (jobPosterDoc.exists()) {
                    const jobPosterData = jobPosterDoc.data();
                    jobPosterName = jobPosterData.fullName || jobPosterData.name || 'The employer';
                }
            } catch (error) {
                console.error('❌ Error getting job poster name:', error);
            }

            const notificationData = {
                type: 'status',
                status: application.status,
                jobId: application.jobId,
                jobTitle: job.jobTitle || 'Untitled Job',
                message: application.status === 'approved' 
                    ? `${jobPosterName} has approved your application for <strong>${job.jobTitle || 'Untitled Job'}</strong>!`
                    : `${jobPosterName} has rejected your application for <strong>${job.jobTitle || 'Untitled Job'}</strong>.`,
                timestamp: new Date().toISOString(),
                read: false,
                userId: userId
            };

            console.log('📤 Creating notification with data:', notificationData);

            const docRef = await addDoc(collection(db, 'notifications'), notificationData);
            console.log('✅ Status notification created:', docRef.id);

            await this.loadNotifications(userId);
            console.log('🔄 Notification panel updated');
        } catch (error) {
            console.error('❌ Error creating status notification:', error);
        }
    }

    async markAsRead(notificationId) {
        try {
            const notificationRef = doc(db, 'notifications', notificationId);
            await updateDoc(notificationRef, { read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async clearAllNotifications() {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.error('DEBUG: No current user found for clearing notifications');
                return;
            }

            console.log('DEBUG: Clearing all notifications for user:', user.uid);

            // Get all notifications for the current user
            const notificationsQuery = query(
                collection(db, 'notifications'),
                where('userId', '==', user.uid)
            );

            const snapshot = await getDocs(notificationsQuery);
            console.log('DEBUG: Found notifications to delete:', snapshot.size);

            if (snapshot.empty) {
                console.log('DEBUG: No notifications to clear');
                return;
            }

            // Create a batch write
            const batch = writeBatch(db);

            // Add each notification to the batch
            snapshot.forEach((doc) => {
                console.log('DEBUG: Adding notification to batch:', doc.id);
                batch.delete(doc.ref);
            });

            // Commit the batch
            await batch.commit();
            console.log('DEBUG: Successfully cleared all notifications');

            // Update local state
            this.notifications = [];
            this.unreadCount = 0;
            this.updateCount(0);
            this.renderNotifications();

            // Clean up and reinitialize listeners
            this.cleanupListeners();
            this.setupAuthListener();
        } catch (error) {
            console.error('DEBUG: Error clearing notifications:', error);
        }
    }

    renderNotifications() {
        const list = this.panel.querySelector('.notification-list');
        list.innerHTML = '';

        if (this.notifications.length === 0) {
            list.innerHTML = `
                <div class="notification-item empty-state">
                    <div class="notification-content">
                        <div class="notification-header oo">
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
            
            const isStatusNotification = notification.type === 'status';
            
            item.innerHTML = `
                <div class="notification-content">
                    <div class="notification-header-2">
                        ${isStatusNotification ? 
                            `<i class="fa-solid ${notification.status === 'approved' ? 'fa-check-circle' : 'fa-times-circle'}" 
                                style="color: ${notification.status === 'approved' ? '#2ecc71' : '#e74c3c'}"></i>` :
                            `<img src="${notification.applicantImage}" alt="${notification.applicantName}" class="notification-avatar">`
                        }
                        <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                    </div>
                    <div class="notification-message">
                        ${isStatusNotification ? 
                            notification.message : 
                            `<strong>${notification.applicantName}</strong> applied for <strong>${notification.jobTitle}</strong>`
                        }
                    </div>
                    <div class="application-actions">
                        <button class="view-application-btn" data-job-id="${notification.jobId}">
                            ${isStatusNotification ? 'View Job' : 'View Application'}
                        </button>
                    </div>
                </div>
                ${notification.read ? '' : '<div class="unread-dot"></div>'}
            `;

            item.addEventListener('click', () => {
                if (!notification.read) {
                    this.markAsRead(notification.id);
                }
            });

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
}

// Initialize notification center when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NotificationCenter();
}); 