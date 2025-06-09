import { auth, db } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { createNewChat, openChat } from './chat.js';
import { translations } from './translations.js';

let currentLanguage = 'en'; // Default language

document.addEventListener('DOMContentLoaded', function() {
    const featuredContainer = document.getElementById('featured-container');
    
    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const jobDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        const diffTime = Math.abs(today - jobDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return { type: 'Today' };
        if (diffDays === 1) return { type: 'Yesterday' };
        if (diffDays < 7) return { type: 'days ago', number: diffDays };
        if (diffDays < 30) return { type: 'weeks ago', number: Math.floor(diffDays / 7) };
        return { type: 'months ago', number: Math.floor(diffDays / 30) };
    }

    function calculateProgress(applications, vacancy) {
        if (!applications || !vacancy) return 0;
        return Math.min(Math.round((applications.length / vacancy) * 100), 100);
    }

    function calculateHotnessScore(job) {
        let score = 0;
        
        const postedDate = new Date(job.postedDate);
        const now = new Date();
        const daysOld = Math.floor((now - postedDate) / (1000 * 60 * 60 * 24));
        score += Math.max(0, 40 - (daysOld * 2)); 

        const applicationRate = job.applications ? job.applications.length / job.vacancy : 0;
        score += Math.min(30, applicationRate * 30); 

        score += Math.min(15, job.vacancy * 1.5); 

        const jobTypeBonus = {
            'full-time': 15,
            'part-time': 10,
            'contract': 8,
            'internship': 5
        };
        score += jobTypeBonus[job.jobType.toLowerCase()] || 0;

        if (job.isHotJob) {
            score += 100; 
        }

        return score;
    }

    function createJobCard(job) {
        const progress = calculateProgress(job.applications, job.vacancy);
        const timeInfo = formatDate(job.postedDate);
        
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';

        const status_r = {
            "full-time": "full-time",
            "part-time": "part-time",
            "contract": "contract",
            "internship": "internship"
        }
        
        jobCard.innerHTML = `
            <a href="html/single-job.html?id=${job.id}">
                <div class="featured-col">
                    <div class="featured-top-row">
                        <div class="featured-top">
                            <div class="featured-logo">
                                <img src="${job.companyLogo || 'img/logo.png'}" alt="${job.companyName}">
                            </div>
                            <div class="job-title">
                                <div class="job-title-top">
                                    <h4>${job.companyName}</h4>
                                </div>
                                <div class="job-title-bottom">
                                    <p>${timeInfo.number ? timeInfo.number + ' ' : ''}<span data-translate="${timeInfo.type}">${translations[currentLanguage][timeInfo.type] || timeInfo.type}</span></p>
                                </div>
                            </div>
                        </div>
                        <div class="featured-job-time">
                            <div class="time-job">
                                <p data-translate="${status_r[job.jobType]}">${translations[currentLanguage][status_r[job.jobType]] || job.jobType}</p>
                            </div>
                        </div>
                    </div>

                    <div class="featured-price">
                        <p>${job.jobTitle}</p>
                    </div>

                    <div class="location">
                        <div class="location-icon">
                            <i class="fa fa-map-marker-alt"></i>
                        </div>
                        <div class="location-p">
                            <p>${job.location}</p>
                        </div>
                    </div>

                    <div class="featured-p-number">
                        <p>${job.applications ? job.applications.length : 0} <span data-translate="applied">${translations[currentLanguage]['applied']}</span> <span data-translate="of">${translations[currentLanguage]['of']}</span> ${job.vacancy} <span data-translate="${job.vacancy === 1 ? 'vacancy_singular' : 'vacancy_plural'}">${translations[currentLanguage][job.vacancy === 1 ? 'vacancy_singular' : 'vacancy_plural']}</span></p>
                    </div>
                </div>
            </a>
        `;
        const messageButton = document.createElement('button');
        messageButton.className = 'message-job-poster';
        messageButton.innerHTML = `<i class="ri-message-2-line"></i> <span data-translate="Message">${translations[currentLanguage]['Message']}</span>`;
        messageButton.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!job.postedBy) return;
            let otherUserName = 'User';
            try {
                const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', job.postedBy)));
                userDoc.forEach((doc) => {
                    const user = doc.data();
                    if (user.displayName) otherUserName = user.displayName;
                });
            } catch (e) {}
            const chatId = await createNewChat(job.postedBy, otherUserName, job.companyName);
            if (chatId) {
                document.getElementById('chatWidget').classList.add('active');
                openChat(chatId, job.postedBy);
            }
        });
        
        return jobCard;
    }

    async function loadHotJobs() {
        try {
            const jobsQuery = query(
                collection(db, 'jobs'),
                where('status', '==', 'active'),
                limit(20)
            );

            const querySnapshot = await getDocs(jobsQuery);
            
            if (querySnapshot.empty) {
                featuredContainer.innerHTML = `
                    <div class="no-jobs-message">
                        <i class="fas fa-briefcase"></i>
                        <h3 data-translate="No Jobs Available">No Jobs Available</h3>
                        <p data-translate="Check back later for new opportunities">Check back later for new opportunities</p>
                    </div>
                `;
                return;
            }

            featuredContainer.innerHTML = '';

            const jobs = [];
            querySnapshot.forEach((doc) => {
                const job = {
                    id: doc.id,
                    ...doc.data()
                };
                job.hotnessScore = calculateHotnessScore(job);
                jobs.push(job);
            });

            jobs.sort((a, b) => {
                const scoreDiff = b.hotnessScore - a.hotnessScore;
                if (scoreDiff !== 0) return scoreDiff;
                
                const dateA = new Date(a.postedDate);
                const dateB = new Date(b.postedDate);
                return dateB - dateA;
            });

            const hotJobs = jobs.filter(job => job.isHotJob);

            const topJobs = jobs.slice(0, 6);

            topJobs.forEach(job => {
                const jobCard = createJobCard(job);
                featuredContainer.appendChild(jobCard);
            });

            // Apply translations after jobs are loaded
            if (window.updateTranslations) {
                window.updateTranslations();
            }

        } catch (error) {
            console.error('Error loading hot jobs:', error);
            featuredContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3 data-translate="Error Loading Jobs">Error Loading Jobs</h3>
                    <p data-translate="There was an error loading the jobs. Please try again later.">There was an error loading the jobs. Please try again later.</p>
                </div>
            `;
        }
    }

    loadHotJobs();

    // Listen for language changes
    window.addEventListener('languageChanged', () => {
        if (window.updateTranslations) {
            window.updateTranslations();
        }
    });

    onAuthStateChanged(auth, () => {
        loadHotJobs();
    });
}); 