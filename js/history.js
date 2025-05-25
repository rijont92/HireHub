import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBy4bVUtUwSUSijmr0Rvjiwu9rlbWBhOG8",
  authDomain: "hirehub-218fb.firebaseapp.com",
  projectId: "hirehub-218fb",
  storageBucket: "hirehub-218fb.appspot.com",
  messagingSenderId: "415486449267",
  appId: "1:415486449267:web:142dfe1371a01f7a02bc06"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const historyList = document.getElementById('historyList');
const noHistory = document.getElementById('noHistory');
const searchInput = document.getElementById('searchInput');
const dateFilter = document.getElementById('dateFilter');

let currentUser = null;
let jobHistory = [];

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadJobHistory();
    } else {
        window.location.href = '/html/login.html';
    }
});

async function loadJobHistory() {
    try {
        if (!currentUser) {
            console.error('No authenticated user found');
            return;
        }

        const q = query(
            collection(db, 'jobHistory'),
            where('userId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        jobHistory = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.jobTitle && data.companyName && data.viewedAt) {
                jobHistory.push({
                    id: doc.id,
                    jobTitle: data.jobTitle,
                    companyName: data.companyName,
                    location: data.location || 'Not specified',
                    salary: data.salary || 'Not specified',
                    viewedAt: data.viewedAt,
                    jobId: data.jobId
                });
            }
        });

        jobHistory.sort((a, b) => {
            const dateA = a.viewedAt.toDate();
            const dateB = b.viewedAt.toDate();
            return dateB - dateA;
        });
        
        displayJobHistory(jobHistory);
    } catch (error) {
        console.error('Error loading job history:', error);
        historyList.innerHTML = `
            <div class="error-message">
                <i class="ri-error-warning-line"></i>
                <p>Error loading job history. Please try again later.</p>
            </div>
        `;
    }
}

function displayJobHistory(history) {
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        noHistory.style.display = 'block';
        return;
    }
    
    noHistory.style.display = 'none';
    
    history.forEach((job) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-item-header">
                <h3 class="history-item-title">${job.jobTitle}</h3>
                <span class="history-item-date">${formatDate(job.viewedAt)}</span>
            </div>
            <div class="history-item-details">
                <div class="history-item-detail">
                    <i class="ri-building-line"></i>
                    <span>${job.companyName}</span>
                </div>
                <div class="history-item-detail">
                    <i class="ri-map-pin-line"></i>
                    <span>${job.location}</span>
                </div>
                <div class="history-item-detail">
                    <i class="ri-money-dollar-circle-line"></i>
                    <span>${job.salary || 'Not specified'}</span>
                </div>
            </div>
            <div class="history-item-actions">
                <button class="view-job-btn" onclick="viewJob('${job.jobId}')">View Job</button>
                <button class="remove-history-btn" onclick="removeFromHistory('${job.id}')">Remove</button>
            </div>
        `;
        historyList.appendChild(historyItem);
    });
}

function formatDate(timestamp) {
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

window.viewJob = function(jobId) {
    window.location.href = `/html/single-job.html?id=${jobId}`;
};

window.removeFromHistory = async function(historyId) {
    try {
        await deleteDoc(doc(db, 'jobHistory', historyId));
        jobHistory = jobHistory.filter(job => job.id !== historyId);
        displayJobHistory(jobHistory);
    } catch (error) {
        console.error('Error removing from history:', error);
    }
};

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredHistory = jobHistory.filter(job => 
        job.jobTitle.toLowerCase().includes(searchTerm) ||
        job.companyName.toLowerCase().includes(searchTerm) ||
        job.location.toLowerCase().includes(searchTerm)
    );
    displayJobHistory(filteredHistory);
});

function compareDates(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return d1.getTime() === d2.getTime();
}

dateFilter.addEventListener('change', (e) => {
    const filterValue = e.target.value;
    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    let filteredHistory = [...jobHistory];
    
    
    switch (filterValue) {
        case 'week':
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            lastWeek.setHours(0, 0, 0, 0);
            
            filteredHistory = jobHistory.filter(job => {
                const jobDate = job.viewedAt.toDate();
                jobDate.setHours(0, 0, 0, 0);
                return jobDate >= lastWeek && !compareDates(jobDate, now);
            });
            break;
            
        case 'month':
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            lastMonth.setHours(0, 0, 0, 0);
            
            filteredHistory = jobHistory.filter(job => {
                const jobDate = job.viewedAt.toDate();
                jobDate.setHours(0, 0, 0, 0);
                return jobDate >= lastMonth && !compareDates(jobDate, now);
            });
            break;
            
        case 'year':
            const currentYear = now.getFullYear();
            
            filteredHistory = jobHistory.filter(job => {
                const jobDate = job.viewedAt.toDate();
                const jobYear = jobDate.getFullYear();
                return jobYear === currentYear - 1;
            });
            break;
            
        case 'all':
            break;
    }
    
    displayJobHistory(filteredHistory);
});
