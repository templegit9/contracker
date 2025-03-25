/**
 * Dashboard component for Platform Engagement Tracker
 */

import { getCurrentUser, loadAllUserData, saveUserData } from '../modules/storage.js';
import { formatDate, formatDateTime, truncateText, normalizeUrl, calculateWatchHours, formatWatchHours, showNotification } from '../modules/utils.js';
import { fetchEngagementData } from '../modules/api.js';
import { renderCharts } from './charts.js';
import { PLATFORMS, AVG_WATCH_PERCENTAGE } from '../modules/config.js';

// In-memory data
let contentItems = [];
let engagementData = [];
let urlToContentMap = {};

// DOM elements - initialized in setupDashboard
let contentList;
let engagementList;
let totalContentEl;
let totalEngagementsEl;
let topPlatformEl;

/**
 * Load dashboard data and initialize components
 */
export async function loadDashboard() {
    console.log('Loading dashboard...');
    
    try {
        // Initialize UI references
        setupDOMReferences();
        
        // Load user data
        console.log('Loading user data...');
        const userData = await loadAllUserData();
        contentItems = Array.isArray(userData.contentItems) ? userData.contentItems : [];
        engagementData = Array.isArray(userData.engagementData) ? userData.engagementData : [];
        
        console.log(`Loaded ${contentItems.length} content items and ${engagementData.length} engagement records`);
        
        // Rebuild URL to content map
        rebuildUrlContentMap();
        
        // Set default date to today for content form
        const publishedDateInput = document.getElementById('content-published');
        if (publishedDateInput) {
            publishedDateInput.valueAsDate = new Date();
        } else {
            console.error('Could not find content-published input');
        }
        
        // Render data
        console.log('Rendering dashboard data...');
        renderContentItems();
        renderEngagementData();
        updateStats();
        
        // Render charts if all required elements exist
        try {
            renderCharts(contentItems, engagementData);
            console.log('Charts rendered successfully');
        } catch (error) {
            console.error('Error rendering charts:', error);
        }
        
        // Set up event listeners
        setupEventListeners();
        setupCollapsibleSections();
        
        console.log('Dashboard loaded successfully');
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

/**
 * Setup DOM element references
 */
function setupDOMReferences() {
    try {
        contentList = document.getElementById('content-list');
        engagementList = document.getElementById('engagement-list');
        totalContentEl = document.getElementById('total-content');
        totalEngagementsEl = document.getElementById('total-engagements');
        topPlatformEl = document.getElementById('top-platform');
        
        // Validate required elements
        if (!contentList) console.error('Could not find content-list element');
        if (!engagementList) console.error('Could not find engagement-list element');
        if (!totalContentEl) console.error('Could not find total-content element');
        if (!totalEngagementsEl) console.error('Could not find total-engagements element');
        if (!topPlatformEl) console.error('Could not find top-platform element');
        
        console.log('Dashboard DOM references initialized');
    } catch (error) {
        console.error('Error setting up dashboard DOM references:', error);
    }
}

/**
 * Setup event listeners for dashboard
 */
function setupEventListeners() {
    // Content form
    const contentForm = document.getElementById('content-form');
    const contentUrlField = document.getElementById('content-url');
    contentForm.addEventListener('submit', handleContentFormSubmit);
    contentUrlField.addEventListener('blur', checkForDuplicateUrl);
    document.getElementById('fetch-content-info').addEventListener('click', fetchContentInfo);
    
    // Data refresh buttons
    const refreshDataBtn = document.getElementById('refresh-data');
    const refreshAllDataBtn = document.getElementById('refresh-all-data');
    refreshDataBtn.addEventListener('click', refreshData);
    refreshAllDataBtn.addEventListener('click', refreshData);
    
    // Platform selection
    document.getElementById('content-source').addEventListener('change', function() {
        updateUrlPlaceholder();
        
        // Show/hide duration field based on platform
        const platform = this.value;
        const durationContainer = document.getElementById('duration-container');
        if (platform === 'youtube') {
            durationContainer.classList.remove('hidden');
        } else {
            durationContainer.classList.add('hidden');
        }
    });
    updateUrlPlaceholder();
}

/**
 * Setup collapsible sections
 */
function setupCollapsibleSections() {
    // Add New Content section
    const toggleAddContent = document.getElementById('toggle-add-content');
    const addContentBody = document.getElementById('add-content-body');
    const addContentIcon = toggleAddContent.querySelector('.material-icons');
    
    toggleAddContent.addEventListener('click', () => {
        addContentBody.classList.toggle('hidden');
        addContentIcon.classList.toggle('rotate-180');
        // Store preference in localStorage
        localStorage.setItem('addContentCollapsed', addContentBody.classList.contains('hidden'));
    });
    
    // Content Library section
    const toggleContentLibrary = document.getElementById('toggle-content-library');
    const contentLibraryBody = document.getElementById('content-library-body');
    const contentLibraryIcon = toggleContentLibrary.querySelector('.material-icons');
    
    toggleContentLibrary.addEventListener('click', () => {
        contentLibraryBody.classList.toggle('hidden');
        contentLibraryIcon.classList.toggle('rotate-180');
        // Store preference in localStorage
        localStorage.setItem('contentLibraryCollapsed', contentLibraryBody.classList.contains('hidden'));
    });
    
    // Engagement Data section
    const toggleEngagementData = document.getElementById('toggle-engagement-data');
    const engagementDataBody = document.getElementById('engagement-data-body');
    const engagementDataIcon = toggleEngagementData.querySelector('.material-icons');
    
    toggleEngagementData.addEventListener('click', () => {
        engagementDataBody.classList.toggle('hidden');
        engagementDataIcon.classList.toggle('rotate-180');
        // Store preference in localStorage
        localStorage.setItem('engagementDataCollapsed', engagementDataBody.classList.contains('hidden'));
    });
    
    // Load saved preferences
    const addContentCollapsed = localStorage.getItem('addContentCollapsed') === 'true';
    const contentLibraryCollapsed = localStorage.getItem('contentLibraryCollapsed') === 'true';
    const engagementDataCollapsed = localStorage.getItem('engagementDataCollapsed') === 'true';
    
    if (addContentCollapsed) {
        addContentBody.classList.add('hidden');
        addContentIcon.classList.add('rotate-180');
    }
    
    if (contentLibraryCollapsed) {
        contentLibraryBody.classList.add('hidden');
        contentLibraryIcon.classList.add('rotate-180');
    }
    
    if (engagementDataCollapsed) {
        engagementDataBody.classList.add('hidden');
        engagementDataIcon.classList.add('rotate-180');
    }
}

/**
 * Render content items
 */
function renderContentItems() {
    if (!contentList) {
        console.error('Cannot render content items: contentList is not defined');
        return;
    }
    
    try {
        contentList.innerHTML = '';
        
        if (!contentItems || contentItems.length === 0) {
            contentList.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No content items added yet</td></tr>';
            return;
        }
        
        console.log(`Rendering ${contentItems.length} content items`);
        
    contentItems.forEach(item => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.className = 'px-6 py-4';
        
        // Create a div for title and description
        const titleDiv = document.createElement('div');
        titleDiv.className = 'font-medium text-gray-900 dark:text-white';
        titleDiv.textContent = item.name;
        nameCell.appendChild(titleDiv);
        
        // Only show description if present
        if (item.description) {
            const descriptionDiv = document.createElement('div');
            descriptionDiv.className = 'text-sm text-gray-500 dark:text-gray-400 mt-1';
            descriptionDiv.textContent = item.description;
            nameCell.appendChild(descriptionDiv);
        }
        
        const platformCell = document.createElement('td');
        platformCell.className = 'px-6 py-4 whitespace-nowrap';
        const platformSpan = document.createElement('span');
        platformSpan.textContent = PLATFORMS[item.platform];
        
        // Add color based on platform
        if (item.platform === 'youtube') {
            platformSpan.className = 'badge youtube';
            
            // Add duration badge for YouTube videos if available
            if (item.duration) {
                const durationSpan = document.createElement('span');
                durationSpan.className = 'badge bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ml-2 flex items-center';
                durationSpan.innerHTML = `<span class="material-icons text-xs mr-1">timer</span> ${item.duration}`;
                platformCell.appendChild(durationSpan);
            }
        } else if (item.platform === 'servicenow') {
            platformSpan.className = 'badge servicenow';
        } else if (item.platform === 'linkedin') {
            platformSpan.className = 'badge linkedin';
        } else {
            platformSpan.className = 'badge other';
        }
        
        platformCell.appendChild(platformSpan);
        
        const publishedCell = document.createElement('td');
        publishedCell.className = 'px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200';
        publishedCell.textContent = formatDate(item.publishedDate);
        
        const addedCell = document.createElement('td');
        addedCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400';
        addedCell.textContent = formatDate(item.createdAt);
        
        const urlCell = document.createElement('td');
        urlCell.className = 'px-6 py-4 whitespace-normal';
        
        // Create a link instead of plain text
        const urlLink = document.createElement('a');
        urlLink.href = item.url;
        urlLink.target = '_blank';
        urlLink.className = 'text-blue-500 dark:text-blue-400 hover:underline text-sm';
        urlLink.title = item.url;
        urlLink.textContent = truncateText(item.url, 30);
        
        urlCell.appendChild(urlLink);
        
        const actionsCell = document.createElement('td');
        actionsCell.className = 'px-6 py-4 whitespace-nowrap text-sm';
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 mr-2 text-sm';
        viewBtn.innerHTML = '<span class="material-icons text-sm">visibility</span>';
        viewBtn.title = 'View Details';
        viewBtn.addEventListener('click', () => showContentDetails(item));
        
        const updateBtn = document.createElement('button');
        updateBtn.className = 'btn btn-primary text-sm mr-2';
        updateBtn.innerHTML = '<span class="material-icons text-sm">refresh</span>';
        updateBtn.title = 'Update Data';
        updateBtn.addEventListener('click', async () => {
            await fetchEngagementData(contentItems, [item]);
            renderEngagementData();
            updateStats();
            renderCharts(contentItems, engagementData);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn bg-red-500 hover:bg-red-600 text-white text-sm';
        deleteBtn.innerHTML = '<span class="material-icons text-sm">delete</span>';
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', () => deleteContent(item.id));
        
        actionsCell.appendChild(viewBtn);
        actionsCell.appendChild(updateBtn);
        actionsCell.appendChild(deleteBtn);
        
        row.appendChild(nameCell);
        row.appendChild(platformCell);
        row.appendChild(publishedCell);
        row.appendChild(addedCell);
        row.appendChild(urlCell);
        row.appendChild(actionsCell);
        
        contentList.appendChild(row);
    });
    
    } catch (error) {
        console.error('Error rendering content items:', error);
        contentList.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Error rendering content items</td></tr>';
    }
}

/**
 * Render engagement data
 */
function renderEngagementData() {
    if (!engagementList) {
        console.error('Cannot render engagement data: engagementList is not defined');
        return;
    }
    
    try {
        engagementList.innerHTML = '';
        
        if (!engagementData || engagementData.length === 0) {
            engagementList.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No engagement data available</td></tr>';
            return;
        }
        
        console.log(`Rendering ${engagementData.length} engagement records`);
    
    // Group engagement data by content URL (not ID) and get the latest record for each
    // This ensures duplicate URLs show the same engagement data
    const latestEngagementByUrl = {};
    engagementData.forEach(engagement => {
        if (!latestEngagementByUrl[engagement.contentUrl] || 
            new Date(engagement.timestamp) > new Date(latestEngagementByUrl[engagement.contentUrl].timestamp)) {
            latestEngagementByUrl[engagement.contentUrl] = engagement;
        }
    });
    
    Object.values(latestEngagementByUrl).forEach(engagement => {
        // Find content item based on URL, not ID
        // For items with duplicate URLs, we'll use the first one found
        const contentItem = contentItems.find(item => normalizeUrl(item.url) === engagement.contentUrl);
        if (!contentItem) return; // Skip if content was deleted
        
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.className = 'px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white';
        nameCell.textContent = contentItem.name;
        
        const platformCell = document.createElement('td');
        platformCell.className = 'px-6 py-4 whitespace-nowrap';
        const platformSpan = document.createElement('span');
        platformSpan.textContent = PLATFORMS[contentItem.platform];
        
        // Add color based on platform
        if (contentItem.platform === 'youtube') {
            platformSpan.className = 'badge youtube';
        } else if (contentItem.platform === 'servicenow') {
            platformSpan.className = 'badge servicenow';
        } else if (contentItem.platform === 'linkedin') {
            platformSpan.className = 'badge linkedin';
        } else {
            platformSpan.className = 'badge other';
        }
        
        platformCell.appendChild(platformSpan);
        
        const viewsCell = document.createElement('td');
        viewsCell.className = 'px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white';
        viewsCell.textContent = engagement.views.toLocaleString();
        
        // Add total hours of views (only for YouTube)
        const totalHoursCell = document.createElement('td');
        totalHoursCell.className = 'px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200';
        
        if (contentItem.platform === 'youtube') {
            // Calculate total watch hours
            const totalHours = calculateWatchHours(
                engagement.views, 
                contentItem.duration,
                AVG_WATCH_PERCENTAGE
            );
            
            // Format with appropriate decimal places
            totalHoursCell.textContent = formatWatchHours(totalHours);
            
            // Add a tooltip for explanation
            totalHoursCell.title = `Estimated total hours watched (views × video duration × average retention rate)`;
        } else {
            totalHoursCell.textContent = '-';
            totalHoursCell.className += ' text-gray-400 dark:text-gray-500';
        }
        
        const likesCell = document.createElement('td');
        likesCell.className = 'px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200';
        likesCell.textContent = engagement.likes.toLocaleString();
        
        const commentsCell = document.createElement('td');
        commentsCell.className = 'px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200';
        commentsCell.textContent = engagement.comments.toLocaleString();
        
        const updatedCell = document.createElement('td');
        updatedCell.className = 'px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 text-sm';
        updatedCell.textContent = formatDateTime(engagement.timestamp);
        
        row.appendChild(nameCell);
        row.appendChild(platformCell);
        row.appendChild(viewsCell);
        row.appendChild(totalHoursCell);
        row.appendChild(likesCell);
        row.appendChild(commentsCell);
        row.appendChild(updatedCell);
        
        engagementList.appendChild(row);
    });
    
    } catch (error) {
        console.error('Error rendering engagement data:', error);
        engagementList.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-red-500">Error rendering engagement data</td></tr>';
    }
}

/**
 * Update dashboard statistics
 */
function updateStats() {
    try {
        if (!totalContentEl || !totalEngagementsEl || !topPlatformEl) {
            console.error('Cannot update stats: Missing DOM elements');
            return;
        }
        
        // Total content items
        totalContentEl.textContent = contentItems ? contentItems.length : 0;
        
        // Calculate total engagements (views from latest record for each URL)
        let totalViews = 0;
        let engagementsByPlatform = {};
    
    // Get the latest engagement data for each content URL
    const latestEngagementByUrl = {};
    engagementData.forEach(engagement => {
        if (!latestEngagementByUrl[engagement.contentUrl] || 
            new Date(engagement.timestamp) > new Date(latestEngagementByUrl[engagement.contentUrl].timestamp)) {
            latestEngagementByUrl[engagement.contentUrl] = engagement;
        }
    });
    
    // Calculate totals and by platform
    Object.values(latestEngagementByUrl).forEach(engagement => {
        const contentItem = contentItems.find(item => normalizeUrl(item.url) === engagement.contentUrl);
        if (!contentItem) return;
        
        totalViews += engagement.views;
        
        engagementsByPlatform[contentItem.platform] = (engagementsByPlatform[contentItem.platform] || 0) + engagement.views;
    });
    
    totalEngagementsEl.textContent = totalViews.toLocaleString();
    
    // Find top platform
    const topPlatform = Object.keys(engagementsByPlatform).reduce((a, b) => 
        engagementsByPlatform[a] > engagementsByPlatform[b] ? a : b, null);
    
    if (topPlatform && engagementsByPlatform[topPlatform] > 0) {
        topPlatformEl.textContent = PLATFORMS[topPlatform];
    } else {
        topPlatformEl.textContent = '-';
    }
    
    } catch (error) {
        console.error('Error updating dashboard statistics:', error);
    }
}

/**
 * Refresh all engagement data
 */
async function refreshData() {
    if (contentItems.length === 0) {
        showNotification('No content items to refresh', 'error');
        return;
    }
    
    const refreshBtn = document.getElementById('refresh-data');
    const refreshAllBtn = document.getElementById('refresh-all-data');
    
    refreshBtn.disabled = true;
    refreshAllBtn.disabled = true;
    refreshBtn.innerHTML = '<span class="material-icons animate-spin">refresh</span> Refreshing...';
    refreshAllBtn.innerHTML = '<span class="material-icons animate-spin">refresh</span> Refreshing...';
    
    try {
        await fetchEngagementData(contentItems);
        renderEngagementData();
        updateStats();
        renderCharts(contentItems, engagementData);
        
        showNotification('Engagement data refreshed successfully');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showNotification('Error refreshing data', 'error');
    } finally {
        refreshBtn.disabled = false;
        refreshAllBtn.disabled = false;
        refreshBtn.innerHTML = '<span class="material-icons mr-1">refresh</span> Refresh Data';
        refreshAllBtn.innerHTML = '<span class="material-icons mr-1">refresh</span> Refresh All';
    }
}

/**
 * Delete content
 * @param {string} id - Content ID
 */
async function deleteContent(id) {
    if (confirm('Are you sure you want to delete this content? This operation cannot be undone.')) {
        // Get the content item
        const contentItem = contentItems.find(c => c.id === id);
        if (!contentItem) return;
        
        // Find all content items with the same URL
        const normalizedUrl = normalizeUrl(contentItem.url);
        const sameUrlContentItems = contentItems.filter(c => normalizeUrl(c.url) === normalizedUrl);
        
        if (sameUrlContentItems.length > 1) {
            // If there are other content items with the same URL, just remove this one
            contentItems = contentItems.filter(c => c.id !== id);
        } else {
            // If this is the only content item with this URL, remove it and its engagement data
            contentItems = contentItems.filter(c => c.id !== id);
            engagementData = engagementData.filter(e => e.contentUrl !== normalizedUrl);
            
            // Remove from URL map
            delete urlToContentMap[normalizedUrl];
        }
        
        // Save to user-specific storage
        await saveUserData('contentItems', contentItems);
        await saveUserData('engagementData', engagementData);
        
        // Update UI
        renderContentItems();
        renderEngagementData();
        updateStats();
        renderCharts(contentItems, engagementData);
        
        showNotification('Content deleted successfully');
    }
}

/**
 * Handle content form submission
 * @param {Event} e - Form submit event
 */
async function handleContentFormSubmit(e) {
    e.preventDefault();
    
    const contentName = document.getElementById('content-name').value;
    const contentDescription = document.getElementById('content-description').value;
    const platform = document.getElementById('content-source').value;
    const contentUrl = document.getElementById('content-url').value;
    const publishedDate = document.getElementById('content-published').value;
    
    // Normalize the URL
    const normalizedUrl = normalizeUrl(contentUrl);
    
    // Check if URL already exists
    const existingContentId = urlToContentMap[normalizedUrl];
    if (existingContentId) {
        // Find the existing content item
        const existingContent = contentItems.find(item => item.id === existingContentId);
        
        if (confirm(`This URL has already been added as "${existingContent.name}". Do you want to update its information?`)) {
            // Update existing content item
            existingContent.name = contentName;
            existingContent.description = contentDescription;
            existingContent.publishedDate = publishedDate;
            
            // Update duration for YouTube videos
            if (platform === 'youtube') {
                existingContent.duration = document.getElementById('content-duration').value;
            }
            
            // Save to localforage
            await saveUserData('contentItems', contentItems);
            
            // Update UI
            renderContentItems();
            renderEngagementData();
            updateStats();
            renderCharts(contentItems, engagementData);
            
            showNotification('Content updated successfully');
        }
        
        // Reset form
        document.getElementById('content-form').reset();
        document.getElementById('content-published').valueAsDate = new Date();
        document.getElementById('duplicate-warning').classList.add('hidden');
        
        return;
    }
    
    // Extract content ID from URL
    const contentId = extractContentId(contentUrl, platform);
    
    // Get duration for YouTube videos
    const duration = platform === 'youtube' ? document.getElementById('content-duration').value : null;
    
    // Create new content item
    const newContentItem = {
        id: generateId(),
        name: contentName,
        description: contentDescription || '', // Optional description
        platform: platform,
        url: contentUrl,
        contentId: contentId,
        publishedDate: publishedDate,
        duration: duration, // Only for YouTube videos
        createdAt: new Date().toISOString(),
        lastUpdated: null
    };
    
    // Add to data structure
    contentItems.push(newContentItem);
    
    // Update URL map
    urlToContentMap[normalizedUrl] = newContentItem.id;
    
    // Save to user-specific storage
    await saveUserData('contentItems', contentItems);
    
    // Fetch initial engagement data
    await fetchEngagementData(contentItems, [newContentItem]);
    
    // Update UI
    renderContentItems();
    renderEngagementData();
    updateStats();
    renderCharts(contentItems, engagementData);
    
    // Reset form
    document.getElementById('content-form').reset();
    document.getElementById('content-published').valueAsDate = new Date();
    document.getElementById('duplicate-warning').classList.add('hidden');
    
    showNotification('Content added successfully');
}

/**
 * Update URL placeholder based on selected platform
 */
function updateUrlPlaceholder() {
    const platform = document.getElementById('content-source').value;
    const urlField = document.getElementById('content-url');
    
    switch (platform) {
        case 'youtube':
            urlField.placeholder = 'https://youtube.com/watch?v=XXXX';
            break;
        case 'servicenow':
            urlField.placeholder = 'https://community.servicenow.com/blog/XXXX';
            break;
        case 'linkedin':
            urlField.placeholder = 'https://www.linkedin.com/posts/XXXX';
            break;
        default:
            urlField.placeholder = 'https://example.com';
    }
}

/**
 * Check for duplicate URL
 */
function checkForDuplicateUrl() {
    const contentUrlField = document.getElementById('content-url');
    const duplicateWarning = document.getElementById('duplicate-warning');
    const url = contentUrlField.value;
    
    if (!url) return;
    
    const normalizedUrl = normalizeUrl(url);
    const existingContentId = urlToContentMap[normalizedUrl];
    
    if (existingContentId) {
        // Show warning
        duplicateWarning.classList.remove('hidden');
        
        // Find the existing content item
        const existingContent = contentItems.find(item => item.id === existingContentId);
        if (existingContent) {
            duplicateWarning.textContent = `Warning: This URL has already been added as "${existingContent.name}".`;
        }
    } else {
        // Hide warning
        duplicateWarning.classList.add('hidden');
    }
}

/**
 * Fetch content information
 */
async function fetchContentInfo() {
    // Implementation from original file...
}

/**
 * Show content details
 * @param {Object} contentItem - Content item
 */
function showContentDetails(contentItem) {
    // Implementation from original file...
}

/**
 * Rebuild URL to content map
 */
function rebuildUrlContentMap() {
    urlToContentMap = {};
    contentItems.forEach(item => {
        const normalizedUrl = normalizeUrl(item.url);
        urlToContentMap[normalizedUrl] = item.id;
    });
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}