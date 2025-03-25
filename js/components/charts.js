/**
 * Charts module for Platform Engagement Tracker
 */

/**
 * Render charts based on content and engagement data
 * @param {Array} contentItems - Content items
 * @param {Array} engagementData - Engagement data
 */
export function renderCharts(contentItems, engagementData) {
    console.log('Charts rendering initiated');
    
    try {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not available, skipping chart rendering');
            return;
        }
        
        // Get canvas elements
        const platformDistribution = document.getElementById('platform-distribution-chart');
        const engagementOverTime = document.getElementById('engagement-over-time-chart');
        const performanceByPlatform = document.getElementById('performance-by-platform-chart');
        
        // Log which chart canvases were found
        console.log('Chart canvases found:', {
            platformDistribution: !!platformDistribution,
            engagementOverTime: !!engagementOverTime,
            performanceByPlatform: !!performanceByPlatform
        });
        
        // Render charts if canvases are available
        if (platformDistribution) {
            renderPlatformDistribution(platformDistribution, contentItems);
        }
        
        if (engagementOverTime) {
            renderEngagementOverTime(engagementOverTime, engagementData);
        }
        
        if (performanceByPlatform) {
            renderPerformanceByPlatform(performanceByPlatform, contentItems, engagementData);
        }
        
        console.log('Charts rendered successfully');
    } catch (error) {
        console.error('Error rendering charts:', error);
    }
}

/**
 * Render platform distribution chart
 * @param {HTMLElement} canvas - Canvas element
 * @param {Array} contentItems - Content items
 */
function renderPlatformDistribution(canvas, contentItems) {
    // Count content by platform
    const platforms = {};
    contentItems.forEach(item => {
        platforms[item.platform] = (platforms[item.platform] || 0) + 1;
    });
    
    // Chart data
    const labels = Object.keys(platforms);
    const data = Object.values(platforms);
    const colors = labels.map(platform => getPlatformColor(platform));
    
    // Create or update chart
    if (canvas._chart) {
        canvas._chart.destroy();
    }
    
    canvas._chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels.map(formatPlatformName),
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    fontColor: isDarkMode() ? '#e5e7eb' : '#4b5563'
                }
            },
            title: {
                display: true,
                text: 'Content Distribution by Platform',
                fontColor: isDarkMode() ? '#e5e7eb' : '#4b5563'
            }
        }
    });
}

/**
 * Render engagement over time chart
 * @param {HTMLElement} canvas - Canvas element
 * @param {Array} engagementData - Engagement data
 */
function renderEngagementOverTime(canvas, engagementData) {
    // Group engagement data by date and sum views
    const viewsByDate = {};
    engagementData.forEach(item => {
        const date = item.timestamp.split('T')[0];
        viewsByDate[date] = (viewsByDate[date] || 0) + (item.views || 0);
    });
    
    // Sort dates and prepare data
    const dates = Object.keys(viewsByDate).sort();
    const views = dates.map(date => viewsByDate[date]);
    
    // Create or update chart
    if (canvas._chart) {
        canvas._chart.destroy();
    }
    
    canvas._chart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Views',
                data: views,
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                xAxes: [{
                    ticks: {
                        fontColor: isDarkMode() ? '#e5e7eb' : '#4b5563'
                    },
                    gridLines: {
                        color: isDarkMode() ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                }],
                yAxes: [{
                    ticks: {
                        fontColor: isDarkMode() ? '#e5e7eb' : '#4b5563',
                        beginAtZero: true
                    },
                    gridLines: {
                        color: isDarkMode() ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                }]
            },
            legend: {
                labels: {
                    fontColor: isDarkMode() ? '#e5e7eb' : '#4b5563'
                }
            },
            title: {
                display: true,
                text: 'Engagement Over Time',
                fontColor: isDarkMode() ? '#e5e7eb' : '#4b5563'
            }
        }
    });
}

/**
 * Render performance by platform chart
 * @param {HTMLElement} canvas - Canvas element
 * @param {Array} contentItems - Content items
 * @param {Array} engagementData - Engagement data
 */
function renderPerformanceByPlatform(canvas, contentItems, engagementData) {
    // Map content to platform
    const contentPlatformMap = {};
    contentItems.forEach(item => {
        contentPlatformMap[normalizeUrl(item.url)] = item.platform;
    });
    
    // Calculate average views by platform
    const viewsByPlatform = {};
    const countByPlatform = {};
    
    engagementData.forEach(item => {
        const platform = contentPlatformMap[item.contentUrl];
        if (platform) {
            viewsByPlatform[platform] = (viewsByPlatform[platform] || 0) + (item.views || 0);
            countByPlatform[platform] = (countByPlatform[platform] || 0) + 1;
        }
    });
    
    // Calculate averages
    const platforms = Object.keys(viewsByPlatform);
    const avgViews = platforms.map(platform => {
        return viewsByPlatform[platform] / countByPlatform[platform];
    });
    
    // Create or update chart
    if (canvas._chart) {
        canvas._chart.destroy();
    }
    
    canvas._chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: platforms.map(formatPlatformName),
            datasets: [{
                label: 'Average Views',
                data: avgViews,
                backgroundColor: platforms.map(getPlatformColor),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                xAxes: [{
                    ticks: {
                        fontColor: isDarkMode() ? '#e5e7eb' : '#4b5563'
                    },
                    gridLines: {
                        color: isDarkMode() ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                }],
                yAxes: [{
                    ticks: {
                        fontColor: isDarkMode() ? '#e5e7eb' : '#4b5563',
                        beginAtZero: true
                    },
                    gridLines: {
                        color: isDarkMode() ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                }]
            },
            legend: {
                labels: {
                    fontColor: isDarkMode() ? '#e5e7eb' : '#4b5563'
                }
            },
            title: {
                display: true,
                text: 'Average Performance by Platform',
                fontColor: isDarkMode() ? '#e5e7eb' : '#4b5563'
            }
        }
    });
}

/**
 * Format platform name
 * @param {string} platform - Platform key
 * @returns {string} Formatted platform name
 */
function formatPlatformName(platform) {
    switch (platform) {
        case 'youtube':
            return 'YouTube';
        case 'linkedin':
            return 'LinkedIn';
        case 'servicenow':
            return 'ServiceNow';
        default:
            return platform || 'Other';
    }
}

/**
 * Get platform color
 * @param {string} platform - Platform key
 * @returns {string} Color for platform
 */
function getPlatformColor(platform) {
    switch (platform) {
        case 'youtube':
            return 'rgba(255, 0, 0, 0.7)';  // YouTube red
        case 'linkedin':
            return 'rgba(10, 102, 194, 0.7)';  // LinkedIn blue
        case 'servicenow':
            return 'rgba(0, 196, 135, 0.7)';  // ServiceNow green
        default:
            return 'rgba(107, 114, 128, 0.7)';  // Gray
    }
}

/**
 * Normalize URL for comparison
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
    if (!url) return '';
    url = url.toLowerCase().trim();
    
    // Remove protocols, www, trailing slashes
    return url.replace(/^(https?:\/\/)?(www\.)?/, '')
        .replace(/\/$/, '');
}

/**
 * Check if dark mode is active
 * @returns {boolean} True if dark mode is active
 */
function isDarkMode() {
    return document.documentElement.classList.contains('dark');
}

// Listen for dark mode changes to update charts
document.addEventListener('darkModeChanged', (e) => {
    console.log('Dark mode changed, updating charts');
    try {
        const contentItems = window.contentItems || [];
        const engagementData = window.engagementData || [];
        renderCharts(contentItems, engagementData);
    } catch (error) {
        console.error('Error updating charts after dark mode change:', error);
    }
});