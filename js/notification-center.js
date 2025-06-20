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
            return;
        }

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
                <h3 data-translate="notifications">Notifications</h3>
                <div class="notification-actions">
                    <button class="clear-all-btn" data-translate="clear-all">Clear All</button>
                    <button class="close-btn-1">&times;</button>
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

        const closeBtn = this.panel.querySelector('.close-btn-1');
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
        
        this.cleanupListeners();
        
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                this.loadNotifications(user.uid);
                this.setupJobApplicationListeners(user.uid);
                this.setupApplicationStatusListeners(user.uid);
            } else {
                this.hidePanel();
                this.updateCount(0);
                this.notifications = [];
                this.renderNotifications();
            }
        });
        this.unsubscribers.push(unsubscribe);
    }

    cleanupListeners() {
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
        
        const jobsQuery = query(
            collection(db, 'jobs'),
            where('postedBy', '==', userId)
        );

        const unsubscribeJobs = onSnapshot(jobsQuery, async (jobsSnapshot) => {
            
            this.cleanupApplicationListeners();
            
            jobsSnapshot.forEach(async (jobDoc) => {
                const jobId = jobDoc.id;
                const jobData = jobDoc.data();

                const applicationsQuery = query(
                    collection(db, 'applications'),
                    where('jobId', '==', jobId)
                );

                const unsubscribeApplications = onSnapshot(applicationsQuery, async (applicationsSnapshot) => {
                    const changes = applicationsSnapshot.docChanges();
                    
                    for (const change of changes) {
                        if (change.type === 'added') {
                            try {
                                const application = change.doc.data();
                                
                                const appliedAt = new Date(application.appliedAt || application.timestamp);
                                const now = new Date();
                                const isNewApplication = (now - appliedAt) < 5000; 

                                if (!isNewApplication) {
                                    continue;
                                }

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
        
        const applicationsQuery = query(
            collection(db, 'applications'),
            where('userId', '==', userId)
        );

        const unsubscribeApplications = onSnapshot(applicationsQuery, async (applicationsSnapshot) => {
            
            const changes = applicationsSnapshot.docChanges();
            
            for (const change of changes) {
                if (change.type === 'modified') {
                    try {
                        const application = change.doc.data();
                        const oldData = change.oldIndex !== -1 ? applicationsSnapshot.docs[change.oldIndex].data() : null;
                        
                      

                        if (application.status === 'approved' || application.status === 'rejected') {
                            
                            const jobDoc = await getDoc(doc(db, 'jobs', application.jobId));
                            if (!jobDoc.exists()) {
                                console.error('❌ Job not found:', application.jobId);
                                continue;
                            }

                            const jobData = jobDoc.data();
                        
                            await this.createStatusNotification(application, jobData, userId);
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
            const notificationsQuery = query(
                collection(db, 'notifications'),
                where('userId', '==', userId),
                orderBy('timestamp', 'desc')
            );

            const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
                this.notifications = [];
                this.unreadCount = 0;

                snapshot.forEach((doc) => {
                    const notification = { id: doc.id, ...doc.data() };
                    this.notifications.push(notification);
                    if (!notification.read) {
                        this.unreadCount++;
                    }
                });

             

                this.updateCount(this.unreadCount);
                this.renderNotifications();
            });
            this.unsubscribers.push(unsubscribe);
             if (window.updateTranslations) {
                            window.updateTranslations();
                        }
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

          
            if (!application || !job || !application.userId || !application.jobId) {
                console.error('DEBUG: Missing required data:', {
                    hasApplication: !!application,
                    hasJob: !!job,
                    userId: application?.userId,
                    jobId: application?.jobId
                });
                return;
            }

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
    

            if (!existingNotifications.empty) {
                return;
            }

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


            if (Object.values(notificationData).some(value => value === undefined)) {
                console.error('DEBUG: Invalid notification data:', notificationData);
                return;
            }

            const docRef = await addDoc(collection(db, 'notifications'), notificationData);
           
        } catch (error) {
            console.error('DEBUG: Error creating application notification:', error);
        }
    }

    async createStatusNotification(application, job, userId) {
        try {
       
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
          

            if (!existingNotifications.empty) {
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
                    ? {
                        jobPosterName: jobPosterName,
                        jobTitle: job.jobTitle || 'Untitled Job',
                        type: 'approved'
                    }
                    : {
                        jobPosterName: jobPosterName,
                        jobTitle: job.jobTitle || 'Untitled Job',
                        type: 'rejected'
                    },
                timestamp: new Date().toISOString(),
                read: false,
                userId: userId
            };
            if (window.updateTranslations) {
                            window.updateTranslations();
                        }


            const docRef = await addDoc(collection(db, 'notifications'), notificationData);

            await this.loadNotifications(userId);
            if (window.updateTranslations) {
                            window.updateTranslations();
                        }
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


            const notificationsQuery = query(
                collection(db, 'notifications'),
                where('userId', '==', user.uid)
            );

            const snapshot = await getDocs(notificationsQuery);

            if (snapshot.empty) {
                return;
            }

            const batch = writeBatch(db);

            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();

            this.notifications = [];
            this.unreadCount = 0;
            this.updateCount(0);
            this.renderNotifications();

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
                            <h4 data-translate="no-notifications">No Notifications Found</h4>
                            <p data-translate="notification-textt">You'll receive notifications here when someone applies to your posted jobs or when your applications are reviewed.</p>
                        </div>
                    </div>
                </div>
            `;
            if (window.updateTranslations) {
                window.updateTranslations();
            }
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
                            (() => {
                                // Handle both old and new message formats
                                if (typeof notification.message === 'string') {
                                    return notification.message;
                                } else if (notification.message && typeof notification.message === 'object') {
                                    const jobPosterName = notification.message.jobPosterName || 'The employer';
                                    const jobTitle = notification.message.jobTitle || 'Untitled Job';
                                    const type = notification.message.type || notification.status;
                                    return `<span>${jobPosterName}</span> <span data-translate="has-${type}"></span> <strong>${jobTitle}</strong>${type === 'approved' ? '!' : '.'}`;
                                } else {
                                    // Fallback for any other format
                                    return `<span>The employer</span> <span data-translate="has-${notification.status}"></span> <strong>${notification.jobTitle || 'Untitled Job'}</strong>${notification.status === 'approved' ? '!' : '.'}`;
                                }
                            })() : 
                            `<strong>${notification.applicantName}</strong> applied for <strong>${notification.jobTitle}</strong>`
                        }
                    </div>
                    <div class="application-actions">
                        <button class="view-application-btn" data-job-id="${notification.jobId}">
                            ${isStatusNotification ? '<span data-translate="view-job">View Job</span>' : 'View Application'}
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

        // Apply translations after all notifications are rendered
        if (window.updateTranslations) {
            window.updateTranslations();
        }
    }

    formatTime(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const diff = now - date;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d <span data-translate="ago">ago</span>`;
        if (hours > 0) return `${hours}h <span data-translate="ago">ago</span>`;
        if (minutes > 0) return `${minutes}m <span data-translate="ago">ago</span>`;
        return '<span data-translate="just-now">Just now</span>';
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

document.addEventListener('DOMContentLoaded', () => {
    new NotificationCenter();
}); 