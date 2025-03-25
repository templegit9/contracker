/**
 * Charts component for Platform Engagement Tracker
 */

import { formatDate } from '../modules/utils.js';
import { PLATFORMS } from '../modules/config.js';

// Chart references
let viewsChart = null;
let engagementChart = null;
let platformDistributionChart = null;

/**
 * Render all dashboard charts
 * @param {Array} contentItems - Content items array
 * @param {Array} engagementData - Engagement data array
 */
export function renderCharts(contentItems, engagementData) {
    if (!contentItems || !engagementData || contentItems.length === 0) return;
    
    // Group engagement data by content URL (not ID) and get the latest record for each
    const latestEngagementByUrl = {};
    engagementData.forEach(engagement => {
        if (!latestEngagementByUrl[engagement.contentUrl] || 
            new Date(engagement.timestamp) > new Date(latestEngagementByUrl[engagement.contentUrl].timestamp)) {
            latestEngagementByUrl[engagement.contentUrl] = engagement;
        }
    });
    
    // Find matching content items for each engagement record
    const combinedData = [];
    Object.values(latestEngagementByUrl).forEach(engagement => {
        const contentItem = contentItems.find(item => normalizeUrl(item.url) === engagement.contentUrl);
        if (contentItem) {
            combinedData.push({
                ...contentItem,
                ...engagement
            });
        }
    });
    
    // Sort by views (descending)
    combinedData.sort((a, b) => b.views - a.views);
    
    // Render individual charts
    renderViewsChart(combinedData);
    renderEngagementChart(combinedData);
    renderPlatformDistributionChart(contentItems);
    
    // Listen for dark mode changes to update chart styles
    document.addEventListener('darkModeChanged', updateChartStyles);
}

/**
 * Render views chart
 * @param {Array} combinedData - Combined content and engagement data
 */
function renderViewsChart(combinedData) {
    const ctx = document.getElementById('views-chart').getContext('2d');
    
    // Prepare data for top 10 content items by views
    const top10 = combinedData.slice(0, 10);
    const labels = top10.map(item => truncateText(item.name, 20));
    const data = top10.map(item => item.views);
    const colors = top10.map(item => getPlatformColor(item.platform));
    
    // Check if chart already exists and destroy if needed
    if (viewsChart) {
        viewsChart.destroy();
    }
    
    // Create chart
    viewsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Views',
                data: data,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Views: ${context.raw.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: isDarkMode() ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: isDarkMode() ? '#e5e7eb' : '#374151'
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: isDarkMode() ? '#e5e7eb' : '#374151'
                    }
                }
            }
        }
    });
}

/**
 * Render engagement chart (likes and comments)
 * @param {Array} combinedData - Combined content and engagement data
 */
function renderEngagementChart(combinedData) {
    const ctx = document.getElementById('engagement-chart').getContext('2d');
    
    // Prepare data for top 5 content items by engagement
    const top5 = combinedData
        .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
        .slice(0, 5);
        
    const labels = top5.map(item => truncateText(item.name, 20));
    const likesData = top5.map(item => item.likes);
    const commentsData = top5.map(item => item.comments);
    
    // Check if chart already exists and destroy if needed
    if (engagementChart) {
        engagementChart.destroy();
    }
    
    // Create chart
    engagementChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Likes',
                    data: likesData,
                    backgroundColor: '#10B981',
                    borderColor: '#059669',
                    borderWidth: 1
                },
                {
                    label: 'Comments',
                    data: commentsData,
                    backgroundColor: '#3B82F6',
                    borderColor: '#2563EB',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: isDarkMode() ? '#e5e7eb' : '#374151'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            return `${label}: ${context.raw.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: isDarkMode() ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: isDarkMode() ? '#e5e7eb' : '#374151'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: isDarkMode() ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: isDarkMode() ? '#e5e7eb' : '#374151'
                    }
                }
            }
        }
    });
}

/**
 * Render platform distribution chart
 * @param {Array} contentItems - Content items array
 */
function renderPlatformDistributionChart(contentItems) {
    const ctx = document.getElementById('platform-chart').getContext('2d');
    
    // Group content by platform
    const platformCounts = {};
    
    contentItems.forEach(item => {
        platformCounts[item.platform] = (platformCounts[item.platform] || 0) + 1;
    });
    
    const labels = Object.keys(platformCounts).map(key => PLATFORMS[key]);
    const data = Object.values(platformCounts);
    const colors = Object.keys(platformCounts).map(getPlatformColor);
    
    // Check if chart already exists and destroy if needed
    if (platformDistributionChart) {
        platformDistributionChart.destroy();
    }
    
    // Create chart
    platformDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: isDarkMode() ? '#e5e7eb' : '#374151'
                    }
                }
            }
        }
    });
}

/**
 * Update chart styles based on dark mode
 * @param {Event} e - Custom event with dark mode state
 */
function updateChartStyles(e) {
    const isDarkMode = e.detail.isDarkMode;
    
    if (viewsChart) {
        updateChartAxesColors(viewsChart, isDarkMode);
        viewsChart.update();
    }
    
    if (engagementChart) {
        updateChartAxesColors(engagementChart, isDarkMode);
        engagementChart.update();
    }
    
    if (platformDistributionChart) {
        updateChartLegendColors(platformDistributionChart, isDarkMode);
        platformDistributionChart.update();
    }
}

/**
 * Update chart axes colors for dark mode
 * @param {Chart} chart - Chart.js instance
 * @param {boolean} isDarkMode - Dark mode state
 */
function updateChartAxesColors(chart, isDarkMode) {
    // Update grid colors
    if (chart.options.scales.x) {
        chart.options.scales.x.grid.color = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        chart.options.scales.x.ticks.color = isDarkMode ? '#e5e7eb' : '#374151';
    }
    
    if (chart.options.scales.y) {
        chart.options.scales.y.grid.color = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        chart.options.scales.y.ticks.color = isDarkMode ? '#e5e7eb' : '#374151';
    }
    
    // Update legend colors
    if (chart.options.plugins && chart.options.plugins.legend) {
        chart.options.plugins.legend.labels.color = isDarkMode ? '#e5e7eb' : '#374151';
    }
}

/**
 * Update chart legend colors for dark mode
 * @param {Chart} chart - Chart.js instance
 * @param {boolean} isDarkMode - Dark mode state
 */
function updateChartLegendColors(chart, isDarkMode) {
    if (chart.options.plugins && chart.options.plugins.legend) {
        chart.options.plugins.legend.labels.color = isDarkMode ? '#e5e7eb' : '#374151';
    }
}

/**
 * Get color for platform
 * @param {string} platform - Platform name
 * @returns {string} Color code
 */
function getPlatformColor(platform) {
    switch (platform) {
        case 'youtube':
            return '#FF0000';
        case 'servicenow':
            return '#00c487';
        case 'linkedin':
            return '#0A66C2';
        default:
            return '#6B7280';
    }
}

/**
 * Check if dark mode is enabled
 * @returns {boolean} Dark mode state
 */
function isDarkMode() {
    return document.documentElement.classList.contains('dark');
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Normalize URL by removing tracking parameters
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        // Remove common tracking parameters
        urlObj.searchParams.delete('utm_source');
        urlObj.searchParams.delete('utm_medium');
        urlObj.searchParams.delete('utm_campaign');
        urlObj.searchParams.delete('utm_content');
        urlObj.searchParams.delete('utm_term');
        urlObj.searchParams.delete('feature');
        // Remove hash
        urlObj.hash = '';
        return urlObj.toString();
    } catch (e) {
        // If URL parsing fails, return original
        return url;
    }
}