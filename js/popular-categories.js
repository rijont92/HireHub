import { db } from './firebase-config.js';
import { collection, query, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { translations, currentLanguage } from './translations.js';

document.addEventListener('DOMContentLoaded', function() {
    
    const categoriesContainer = document.getElementById('categories-container');
    if (!categoriesContainer) {
        console.error('Categories container not found!');
        return;
    }
    
    const defaultCategories = {
        'IT & Software': {
            icon: 'fa-laptop-code',
            color: '#4CAF50',
            count: 0
        },
        'Design & Creative': {
            icon: 'fa-palette',
            color: '#9C27B0',
            count: 0
        },
        'Marketing': {
            icon: 'fa-bullhorn',
            color: '#FF9800',
            count: 0
        },
        'Sales': {
            icon: 'fa-chart-line',
            color: '#2196F3',
            count: 0
        },
        'Finance': {
            icon: 'fa-money-bill-wave',
            color: '#00BCD4',
            count: 0
        },
        'Healthcare': {
            icon: 'fa-heartbeat',
            color: '#F44336',
            count: 0
        },
        'Education': {
            icon: 'fa-graduation-cap',
            color: '#3F51B5',
            count: 0
        },
          'Others': {
            icon: 'fa-ellipsis-h',
            color: '#E91E63',
            count: 0
        }
    };

    function getCategoryIcon(category) {
        return defaultCategories[category]?.icon || 'fa-briefcase';
    }

    function getCategoryColor(category) {
        return defaultCategories[category]?.color || '#757575';
    }

    function createCategoryCard(category, count) {
        const icon = getCategoryIcon(category);
        const color = getCategoryColor(category);
        
        // Convert 'Others' to 'Other' for the URL
        const urlCategory = category === 'Others' ? 'Other' : category;
        
        return `
            <div class="category-col" onclick="window.location.href='/html/jobs.html?category=${encodeURIComponent(urlCategory)}'">
                <div class="category-icon" style="background-color: ${color}20">
                    <i class="fas ${icon}" style="color: ${color}"></i>
                </div>
                <div class="category-content">
                    <h4 data-translate="${category}">${category}</h4>
                    <p><span>${count}</span> <span data-translate="${count === 1 ? 'job_one' : 'job_many'}">${count === 1 ? translations[currentLanguage].job_one : translations[currentLanguage].job_many}</span></p>
                </div>
            </div>
        `;
         if (window.updateTranslations) {
                            window.updateTranslations();
                        }
    }

    async function loadPopularCategories() {
        try {
            
            categoriesContainer.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
            `;

            const jobsQuery = query(collection(db, 'jobs'));
            
            const querySnapshot = await getDocs(jobsQuery);

            
            const categoryCounts = { ...defaultCategories };
            
            querySnapshot.forEach((doc) => {
                const job = doc.data();
                if (job.category) {
                    if (defaultCategories[job.category]) {
                        categoryCounts[job.category].count++;
                    } else {
                        categoryCounts['Others'].count++;
                    }
                }
            });


            const categories = Object.entries(categoryCounts)
                .map(([category, data]) => ({ 
                    category, 
                    count: data.count,
                    icon: data.icon,
                    color: data.color
                }))
                .sort((a, b) => {
                    if (a.category === 'Others') return 1;
                    if (b.category === 'Others') return -1;
                    return b.count - a.count;
                });


            categoriesContainer.innerHTML = '';

            categories.forEach(({ category, count }) => {
                const categoryCard = createCategoryCard(category, count);
                categoriesContainer.innerHTML += categoryCard;
            });

                if (window.updateTranslations) {
                            window.updateTranslations();
                        }


        } catch (error) {
            console.error('Error loading popular categories:', error);
            categoriesContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error Loading Categories</h3>
                    <p>There was an error loading the categories. Please try again later.</p>
                    <p class="error-details">${error.message}</p>
                </div>
            `;
        }
    }

    loadPopularCategories();
}); 