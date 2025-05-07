import { auth, db } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

document.addEventListener('DOMContentLoaded', function() {
    const featuredContainer = document.getElementById('featured-container');
    
    // Function to format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    }

    // Function to calculate application progress
    function calculateProgress(applications, vacancy) {
        if (!applications || !vacancy) return 0;
        return Math.min(Math.round((applications.length / vacancy) * 100), 100);
    }

    // Function to calculate job hotness score
    function calculateHotnessScore(job) {
        let score = 0;
        
        // Factor 1: Recency (max 40 points)
        const postedDate = new Date(job.postedDate);
        const now = new Date();
        const daysOld = Math.floor((now - postedDate) / (1000 * 60 * 60 * 24));
        score += Math.max(0, 40 - (daysOld * 2)); // 40 points for today, decreasing by 2 points per day

        // Factor 2: Application Rate (max 30 points)
        const applicationRate = job.applications ? job.applications.length / job.vacancy : 0;
        score += Math.min(30, applicationRate * 30); // Up to 30 points based on application rate

        // Factor 3: Vacancy Size (max 15 points)
        score += Math.min(15, job.vacancy * 1.5); // More vacancies = higher score, max 15 points

        // Factor 4: Job Type Bonus (max 15 points)
        const jobTypeBonus = {
            'full-time': 15,
            'part-time': 10,
            'contract': 8,
            'internship': 5
        };
        score += jobTypeBonus[job.jobType.toLowerCase()] || 0;

        return score;
    }

    // Function to create job card HTML
    function createJobCard(job) {
        const progress = calculateProgress(job.applications, job.vacancy);
        const timeAgo = formatDate(job.postedDate);
        
        return `
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
                                    <p>${timeAgo}</p>
                                </div>
                            </div>
                        </div>
                        <div class="featured-job-time">
                            <div class="time-job">
                                <p>${job.jobType}</p>
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

                    <div class="featured-bar-container">
                        <div class="featured-bar">
                            <div class="featured-bar-color" data-value="${progress}"></div>
                        </div>
                    </div>

                    <div class="featured-p-number">
                        <p>${job.applications ? job.applications.length : 0} applied <span>of ${job.vacancy} vacancy</span></p>
                    </div>
                </div>
            </a>
        `;
    }

    // Function to load hot jobs
    async function loadHotJobs() {
        try {
            // Query active jobs
            const jobsQuery = query(
                collection(db, 'jobs'),
                where('status', '==', 'active'),
                limit(20) // Fetch more jobs to select the best ones
            );

            const querySnapshot = await getDocs(jobsQuery);
            
            if (querySnapshot.empty) {
                featuredContainer.innerHTML = `
                    <div class="no-jobs-message">
                        <i class="fas fa-briefcase"></i>
                        <h3>No Jobs Available</h3>
                        <p>Check back later for new opportunities</p>
                    </div>
                `;
                return;
            }

            // Clear existing content
            featuredContainer.innerHTML = '';

            // Convert to array and calculate hotness scores
            const jobs = [];
            querySnapshot.forEach((doc) => {
                const job = {
                    id: doc.id,
                    ...doc.data()
                };
                job.hotnessScore = calculateHotnessScore(job);
                jobs.push(job);
            });

            // Sort jobs by hotness score
            jobs.sort((a, b) => b.hotnessScore - a.hotnessScore);

            // Take top 6 jobs
            const topJobs = jobs.slice(0, 6);

            // Add each job to the container
            topJobs.forEach(job => {
                const jobCard = createJobCard(job);
                featuredContainer.innerHTML += jobCard;
            });

            // Initialize progress bars
            const progressBars = document.querySelectorAll('.featured-bar-color');
            progressBars.forEach(bar => {
                const value = bar.getAttribute('data-value');
                bar.style.width = `${value}%`;
            });

        } catch (error) {
            console.error('Error loading hot jobs:', error);
            featuredContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error Loading Jobs</h3>
                    <p>There was an error loading the jobs. Please try again later.</p>
                </div>
            `;
        }
    }

    // Load hot jobs when the page loads
    loadHotJobs();

    // Reload hot jobs when user authentication state changes
    onAuthStateChanged(auth, () => {
        loadHotJobs();
    });
}); 