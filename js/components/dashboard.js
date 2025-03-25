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
let contracts = [];
let urlToContentMap = {};

// DOM elements - initialized in setupDashboard
let contentList;
let engagementList;
let contractsList;
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
        contracts = Array.isArray(userData.contracts) ? userData.contracts : [];
        
        console.log(`Loaded ${contentItems.length} content items, ${engagementData.length} engagement records, and ${contracts.length} contracts`);
        
        // Rebuild URL to content map
        rebuildUrlContentMap();
        
        // Set default date to today for content form
        const publishedDateInput = document.getElementById('content-published');
        if (publishedDateInput) {
            publishedDateInput.valueAsDate = new Date();
        }
        
        // Set default dates for contract form
        const contractStartDate = document.getElementById('contract-start-date');
        const contractEndDate = document.getElementById('contract-end-date');
        if (contractStartDate) {
            contractStartDate.valueAsDate = new Date();
        }
        if (contractEndDate) {
            // Set default end date to 1 year from now
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);
            contractEndDate.valueAsDate = endDate;
        }
        
        // Render data
        console.log('Rendering dashboard data...');
        renderContentItems();
        renderEngagementData();
        renderContracts();
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
        showNotification('Error loading dashboard: ' + error.message, 'error');
    }
}

/**
 * Setup DOM element references
 */
function setupDOMReferences() {
    try {
        contentList = document.getElementById('content-list');
        engagementList = document.getElementById('engagement-list');
        contractsList = document.getElementById('contracts-list');
        totalContentEl = document.getElementById('total-content');
        totalEngagementsEl = document.getElementById('total-engagements');
        topPlatformEl = document.getElementById('top-platform');
        
        // Log which elements were found
        console.log('DOM references initialized:', {
            contentList: !!contentList,
            engagementList: !!engagementList,
            contractsList: !!contractsList,
            totalContentEl: !!totalContentEl,
            totalEngagementsEl: !!totalEngagementsEl,
            topPlatformEl: !!topPlatformEl
        });
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
    if (contentForm) {
        contentForm.addEventListener('submit', handleContentFormSubmit);
        const contentUrlField = document.getElementById('content-url');
        if (contentUrlField) {
            contentUrlField.addEventListener('blur', checkForDuplicateUrl);
        }
        const fetchContentInfoBtn = document.getElementById('fetch-content-info');
        if (fetchContentInfoBtn) {
            fetchContentInfoBtn.addEventListener('click', fetchContentInfo);
        }
    }
    
    // Platform selection
    const platformSelect = document.getElementById('content-source');
    if (platformSelect) {
        platformSelect.addEventListener('change', updateUrlPlaceholder);
        updateUrlPlaceholder();
    }
    
    // Contract form
    const contractForm = document.getElementById('contract-form');
    if (contractForm) {
        contractForm.addEventListener('submit', handleContractFormSubmit);
    }
    
    // Refresh buttons
    const refreshDataBtn = document.getElementById('refresh-data');
    const refreshAllDataBtn = document.getElementById('refresh-all-data');
    if (refreshDataBtn) refreshDataBtn.addEventListener('click', refreshData);
    if (refreshAllDataBtn) refreshAllDataBtn.addEventListener('click', refreshData);
}

/**
 * Setup collapsible sections
 */
function setupCollapsibleSections() {
    setupCollapsibleSection('toggle-add-content', 'add-content-body', 'addContentCollapsed');
    setupCollapsibleSection('toggle-content-library', 'content-library-body', 'contentLibraryCollapsed');
    setupCollapsibleSection('toggle-engagement-data', 'engagement-data-body', 'engagementDataCollapsed');
    setupCollapsibleSection('toggle-contracts', 'contracts-body', 'contractsCollapsed');
}

/**
 * Setup a single collapsible section
 */
function setupCollapsibleSection(toggleId, bodyId, storageKey) {
    const toggleElement = document.getElementById(toggleId);
    const bodyElement = document.getElementById(bodyId);
    if (!toggleElement || !bodyElement) return;
    
    const icon = toggleElement.querySelector('.material-icons');
    
    toggleElement.addEventListener('click', () => {
        bodyElement.classList.toggle('hidden');
        if (icon) icon.classList.toggle('rotate-180');
        localStorage.setItem(storageKey, bodyElement.classList.contains('hidden'));
    });
    
    // Load saved preference
    const isCollapsed = localStorage.getItem(storageKey) === 'true';
    if (isCollapsed) {
        bodyElement.classList.add('hidden');
        if (icon) icon.classList.add('rotate-180');
    }
}

/**
 * Render content items
 */
function renderContentItems() {
    if (!contentList) {
        console.log('Content list element not found, skipping render');
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
            nameCell.innerHTML = `
                <div class="font-medium text-gray-900 dark:text-white">${item.name}</div>
                ${item.description ? `<div class="text-sm text-gray-500 dark:text-gray-400 mt-1">${item.description}</div>` : ''}
            `;
            
            const platformCell = document.createElement('td');
            platformCell.className = 'px-6 py-4 whitespace-nowrap';
            platformCell.innerHTML = `<span class="badge ${item.platform || 'other'}">${PLATFORMS[item.platform] || 'Other'}</span>`;
            
            const urlCell = document.createElement('td');
            urlCell.className = 'px-6 py-4';
            urlCell.innerHTML = `
                <a href="${item.url}" target="_blank" class="text-blue-500 hover:underline">
                    ${truncateText(item.url, 30)}
                </a>
            `;
            
            const actionsCell = document.createElement('td');
            actionsCell.className = 'px-6 py-4 text-right';
            actionsCell.innerHTML = `
                <button class="btn btn-sm btn-primary mr-2" onclick="viewContent('${item.id}')">View</button>
                <button class="btn btn-sm btn-danger" onclick="deleteContent('${item.id}')">Delete</button>
            `;
            
            row.appendChild(nameCell);
            row.appendChild(platformCell);
            row.appendChild(urlCell);
            row.appendChild(actionsCell);
            
            contentList.appendChild(row);
        });
    } catch (error) {
        console.error('Error rendering content items:', error);
        if (contentList) {
            contentList.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Error rendering content items</td></tr>';
        }
    }
}

/**
 * Render engagement data
 */
function renderEngagementData() {
    if (!engagementList) {
        console.log('Engagement list element not found, skipping render');
        return;
    }
    
    try {
        engagementList.innerHTML = '';
        
        if (!engagementData || engagementData.length === 0) {
            engagementList.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No engagement data available</td></tr>';
            return;
        }
        
        console.log(`Rendering ${engagementData.length} engagement records`);
        
        engagementData.forEach(item => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td class="px-6 py-4">${item.contentName || 'Unknown'}</td>
                <td class="px-6 py-4">${item.views?.toLocaleString() || '0'}</td>
                <td class="px-6 py-4">${item.likes?.toLocaleString() || '0'}</td>
                <td class="px-6 py-4">${item.comments?.toLocaleString() || '0'}</td>
                <td class="px-6 py-4 text-gray-500">${formatDateTime(item.timestamp)}</td>
            `;
            
            engagementList.appendChild(row);
        });
    } catch (error) {
        console.error('Error rendering engagement data:', error);
        if (engagementList) {
            engagementList.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error rendering engagement data</td></tr>';
        }
    }
}

/**
 * Render contracts
 */
function renderContracts() {
    if (!contractsList) {
        console.log('Contracts list element not found, skipping render');
        return;
    }
    
    try {
        contractsList.innerHTML = '';
        
        if (!contracts || contracts.length === 0) {
            contractsList.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No contracts added yet</td></tr>';
            return;
        }
        
        console.log(`Rendering ${contracts.length} contracts`);
        
        contracts.forEach(contract => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td class="px-6 py-4">
                    <div class="font-medium text-gray-900 dark:text-white">${contract.name}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">${contract.client}</div>
                </td>
                <td class="px-6 py-4">${formatCurrency(contract.value)}</td>
                <td class="px-6 py-4">${formatDate(contract.startDate)} - ${formatDate(contract.endDate)}</td>
                <td class="px-6 py-4 text-right">
                    <button class="btn btn-sm btn-primary mr-2" onclick="viewContract('${contract.id}')">View</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteContract('${contract.id}')">Delete</button>
                </td>
            `;
            
            contractsList.appendChild(row);
        });
    } catch (error) {
        console.error('Error rendering contracts:', error);
        if (contractsList) {
            contractsList.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error rendering contracts</td></tr>';
        }
    }
}

/**
 * Format currency value
 */
function formatCurrency(value) {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

/**
 * Update dashboard statistics
 */
function updateStats() {
    try {
        if (totalContentEl) {
            totalContentEl.textContent = contentItems ? contentItems.length : 0;
        }
        
        if (totalEngagementsEl) {
            let totalViews = 0;
            engagementData.forEach(item => {
                totalViews += item.views || 0;
            });
            totalEngagementsEl.textContent = totalViews.toLocaleString();
        }
        
        if (topPlatformEl) {
            // Count content by platform
            const platformCounts = {};
            contentItems.forEach(item => {
                platformCounts[item.platform] = (platformCounts[item.platform] || 0) + 1;
            });
            
            // Find top platform
            let topPlatform = null;
            let maxCount = 0;
            
            Object.entries(platformCounts).forEach(([platform, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    topPlatform = platform;
                }
            });
            
            topPlatformEl.textContent = topPlatform ? (PLATFORMS[topPlatform] || topPlatform) : '-';
        }
    } catch (error) {
        console.error('Error updating dashboard statistics:', error);
    }
}

/**
 * Handle content form submission
 */
async function handleContentFormSubmit(e) {
    e.preventDefault();
    console.log('Content form submitted');
    
    try {
        // Get form values
        const form = e.target;
        const contentName = form.querySelector('#content-name').value.trim();
        const platform = form.querySelector('#content-source').value;
        const contentUrl = form.querySelector('#content-url').value.trim();
        const publishedDate = form.querySelector('#content-published').value;
        const description = form.querySelector('#content-description')?.value.trim() || '';
        
        // Validate required fields
        if (!contentName || !contentUrl || !publishedDate) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Create new content item
        const newContentItem = {
            id: generateId(),
            name: contentName,
            platform: platform,
            url: contentUrl,
            publishedDate: publishedDate,
            description: description,
            createdAt: new Date().toISOString()
        };
        
        // Get current user
        const currentUser = getCurrentUser();
        if (!currentUser) {
            showNotification('You must be logged in to add content', 'error');
            return;
        }
        
        // Add to content items array
        contentItems.push(newContentItem);
        
        // Save to user-specific storage
        await saveUserData(currentUser.id, 'contentItems', contentItems);
        
        // Reset form
        form.reset();
        
        // Set today's date for published date
        const publishedDateInput = form.querySelector('#content-published');
        if (publishedDateInput) {
            publishedDateInput.valueAsDate = new Date();
        }
        
        // Update UI
        renderContentItems();
        updateStats();
        
        // Show success message
        showNotification('Content added successfully', 'success');
    } catch (error) {
        console.error('Error adding content:', error);
        showNotification('Error adding content: ' + error.message, 'error');
    }
}

/**
 * Handle contract form submission
 */
async function handleContractFormSubmit(e) {
    e.preventDefault();
    console.log('Contract form submitted');
    
    try {
        // Get form values
        const form = e.target;
        const errorEl = form.querySelector('.error-message');
        
        // Get form values
        const name = form.querySelector('#contract-name').value.trim();
        const client = form.querySelector('#contract-client').value.trim();
        const value = parseFloat(form.querySelector('#contract-value').value);
        const startDate = form.querySelector('#contract-start-date').value;
        const endDate = form.querySelector('#contract-end-date').value;
        const description = form.querySelector('#contract-description').value.trim();
        
        // Validate required fields
        if (!name || !client || isNaN(value) || !startDate || !endDate || !description) {
            if (errorEl) {
                errorEl.textContent = 'Please fill in all required fields';
                errorEl.classList.remove('hidden');
            } else {
                showNotification('Please fill in all required fields', 'error');
            }
            return;
        }
        
        // Get current user
        const currentUser = getCurrentUser();
        if (!currentUser) {
            if (errorEl) {
                errorEl.textContent = 'You must be logged in to add contracts';
                errorEl.classList.remove('hidden');
            } else {
                showNotification('You must be logged in to add contracts', 'error');
            }
            return;
        }
        
        // Create contract object
        const newContract = {
            id: generateId(),
            name,
            client,
            value,
            startDate,
            endDate,
            description,
            createdAt: new Date().toISOString(),
            userId: currentUser.id
        };
        
        // Load existing contracts
        let userContracts = await loadUserData(currentUser.id, 'contracts') || [];
        if (!Array.isArray(userContracts)) userContracts = [];
        
        // Add new contract
        userContracts.push(newContract);
        
        // Save updated contracts
        await saveUserData(currentUser.id, 'contracts', userContracts);
        
        // Update local contracts array
        contracts = userContracts;
        
        // Clear form
        form.reset();
        if (errorEl) {
            errorEl.classList.add('hidden');
        }
        
        // Reset dates
        const contractStartDateInput = form.querySelector('#contract-start-date');
        const contractEndDateInput = form.querySelector('#contract-end-date');
        if (contractStartDateInput) {
            contractStartDateInput.valueAsDate = new Date();
        }
        if (contractEndDateInput) {
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);
            contractEndDateInput.valueAsDate = endDate;
        }
        
        // Update UI
        renderContracts();
        
        // Show success message
        showNotification('Contract added successfully', 'success');
    } catch (error) {
        console.error('Error adding contract:', error);
        const errorEl = e.target.querySelector('.error-message');
        if (errorEl) {
            errorEl.textContent = error.message || 'Failed to save contract';
            errorEl.classList.remove('hidden');
        } else {
            showNotification('Error adding contract: ' + error.message, 'error');
        }
    }
}

/**
 * Update URL placeholder based on selected platform
 */
function updateUrlPlaceholder() {
    const platformSelect = document.getElementById('content-source');
    const urlField = document.getElementById('content-url');
    if (!platformSelect || !urlField) return;
    
    const platform = platformSelect.value;
    switch (platform) {
        case 'youtube':
            urlField.placeholder = 'https://youtube.com/watch?v=XXXX';
            break;
        case 'linkedin':
            urlField.placeholder = 'https://www.linkedin.com/posts/XXXX';
            break;
        case 'servicenow':
            urlField.placeholder = 'https://community.servicenow.com/XXXX';
            break;
        default:
            urlField.placeholder = 'https://example.com/content';
    }
}

/**
 * Check for duplicate URL
 */
function checkForDuplicateUrl() {
    const contentUrlField = document.getElementById('content-url');
    const duplicateWarning = document.getElementById('duplicate-warning');
    if (!contentUrlField || !duplicateWarning) return;
    
    const url = contentUrlField.value.trim();
    if (!url) return;
    
    const normalizedUrl = normalizeUrl(url);
    const existingItem = contentItems.find(item => normalizeUrl(item.url) === normalizedUrl);
    
    if (existingItem) {
        duplicateWarning.textContent = `Warning: This URL has already been added as "${existingItem.name}"`;
        duplicateWarning.classList.remove('hidden');
    } else {
        duplicateWarning.classList.add('hidden');
    }
}

/**
 * Fetch content info automatically
 */
async function fetchContentInfo() {
    // This would be implemented to fetch metadata from URLs
    // For now, just show a notification
    showNotification('This feature is not yet implemented', 'info');
}

/**
 * Refresh data
 */
async function refreshData() {
    try {
        showNotification('Refreshing data...', 'info');
        await loadDashboard();
        showNotification('Data refreshed successfully', 'success');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showNotification('Error refreshing data: ' + error.message, 'error');
    }
}

/**
 * Delete content
 */
function deleteContent(id) {
    if (!confirm('Are you sure you want to delete this content?')) return;
    
    try {
        // Remove from array
        contentItems = contentItems.filter(item => item.id !== id);
        
        // Save changes
        const currentUser = getCurrentUser();
        if (currentUser) {
            saveUserData(currentUser.id, 'contentItems', contentItems)
                .then(() => {
                    renderContentItems();
                    updateStats();
                    showNotification('Content deleted successfully', 'success');
                })
                .catch(error => {
                    console.error('Error saving after delete:', error);
                    showNotification('Error saving changes', 'error');
                });
        }
    } catch (error) {
        console.error('Error deleting content:', error);
        showNotification('Error deleting content', 'error');
    }
}

/**
 * Delete contract
 */
function deleteContract(id) {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    
    try {
        // Remove from array
        contracts = contracts.filter(item => item.id !== id);
        
        // Save changes
        const currentUser = getCurrentUser();
        if (currentUser) {
            saveUserData(currentUser.id, 'contracts', contracts)
                .then(() => {
                    renderContracts();
                    showNotification('Contract deleted successfully', 'success');
                })
                .catch(error => {
                    console.error('Error saving after delete:', error);
                    showNotification('Error saving changes', 'error');
                });
        }
    } catch (error) {
        console.error('Error deleting contract:', error);
        showNotification('Error deleting contract', 'error');
    }
}

/**
 * View content details
 */
function viewContent(id) {
    const content = contentItems.find(item => item.id === id);
    if (!content) return;
    
    alert(`Content Details:\n\nName: ${content.name}\nPlatform: ${PLATFORMS[content.platform] || content.platform}\nURL: ${content.url}\nPublished: ${formatDate(content.publishedDate)}\nDescription: ${content.description || 'None'}`);
}

/**
 * View contract details
 */
function viewContract(id) {
    const contract = contracts.find(item => item.id === id);
    if (!contract) return;
    
    alert(`Contract Details:\n\nName: ${contract.name}\nClient: ${contract.client}\nValue: ${formatCurrency(contract.value)}\nDuration: ${formatDate(contract.startDate)} - ${formatDate(contract.endDate)}\nDescription: ${contract.description || 'None'}`);
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

// Make functions available in the global scope
window.viewContent = viewContent;
window.deleteContent = deleteContent;
window.viewContract = viewContract;
window.deleteContract = deleteContract;