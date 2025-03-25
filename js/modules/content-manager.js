/**
 * Content Manager module for Platform Engagement Tracker
 * Handles operations for content items across different platforms
 */

import { saveUserData, loadUserData } from './storage.js';
import { PLATFORMS } from './config.js';

// Storage keys
const CONTENT_STORAGE_KEY = 'contentItems';

/**
 * Load all content items
 * @returns {Promise<Array>} Array of content item objects
 */
export async function loadContentItems() {
    try {
        const contentItems = await loadUserData(CONTENT_STORAGE_KEY, []);
        console.log(`Loaded ${contentItems.length} content items`);
        return contentItems;
    } catch (error) {
        console.error('Error loading content items:', error);
        return [];
    }
}

/**
 * Save content items
 * @param {Array} contentItems - Array of content item objects
 * @returns {Promise<boolean>} Success flag
 */
export async function saveContentItems(contentItems) {
    try {
        if (!Array.isArray(contentItems)) {
            throw new Error('Content items must be an array');
        }
        
        await saveUserData(CONTENT_STORAGE_KEY, contentItems);
        console.log(`Saved ${contentItems.length} content items`);
        return true;
    } catch (error) {
        console.error('Error saving content items:', error);
        return false;
    }
}

/**
 * Add a new content item
 * @param {Object} contentData - Content item data
 * @returns {Promise<Object>} Newly created content item with ID
 */
export async function addContentItem(contentData) {
    try {
        if (!contentData || typeof contentData !== 'object') {
            throw new Error('Invalid content data');
        }
        
        // Required fields validation
        const requiredFields = ['title', 'url', 'platform'];
        for (const field of requiredFields) {
            if (!contentData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        // Validate platform
        if (!Object.keys(PLATFORMS).includes(contentData.platform)) {
            throw new Error(`Invalid platform: ${contentData.platform}`);
        }
        
        // Load existing content items
        const contentItems = await loadContentItems();
        
        // Check for duplicate URL
        const normalizedUrl = normalizeUrl(contentData.url);
        const isDuplicate = contentItems.some(item => 
            normalizeUrl(item.url) === normalizedUrl);
        
        if (isDuplicate) {
            throw new Error('A content item with this URL already exists');
        }
        
        // Create new content item with ID and timestamps
        const newContent = {
            ...contentData,
            id: generateContentId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to content items array
        contentItems.push(newContent);
        
        // Save updated content items
        await saveContentItems(contentItems);
        
        return newContent;
    } catch (error) {
        console.error('Error adding content item:', error);
        throw error;
    }
}

/**
 * Update existing content item
 * @param {string} contentId - ID of content item to update
 * @param {Object} contentData - Updated content data
 * @returns {Promise<Object>} Updated content item
 */
export async function updateContentItem(contentId, contentData) {
    try {
        if (!contentId) {
            throw new Error('Content ID is required');
        }
        
        // Load existing content items
        const contentItems = await loadContentItems();
        
        // Find content item index
        const contentIndex = contentItems.findIndex(c => c.id === contentId);
        if (contentIndex === -1) {
            throw new Error(`Content item not found with ID: ${contentId}`);
        }
        
        // If URL is being changed, check for duplicates
        if (contentData.url && contentData.url !== contentItems[contentIndex].url) {
            const normalizedUrl = normalizeUrl(contentData.url);
            const isDuplicate = contentItems.some((item, index) => 
                index !== contentIndex && normalizeUrl(item.url) === normalizedUrl);
            
            if (isDuplicate) {
                throw new Error('A content item with this URL already exists');
            }
        }
        
        // Create updated content item
        const updatedContent = {
            ...contentItems[contentIndex],
            ...contentData,
            updatedAt: new Date().toISOString()
        };
        
        // Update in array
        contentItems[contentIndex] = updatedContent;
        
        // Save updated content items
        await saveContentItems(contentItems);
        
        return updatedContent;
    } catch (error) {
        console.error('Error updating content item:', error);
        throw error;
    }
}

/**
 * Delete content item by ID
 * @param {string} contentId - ID of content item to delete
 * @returns {Promise<boolean>} Success flag
 */
export async function deleteContentItem(contentId) {
    try {
        // Load existing content items
        const contentItems = await loadContentItems();
        
        // Filter out the content item to delete
        const updatedContentItems = contentItems.filter(c => c.id !== contentId);
        
        // Check if content item was found and removed
        if (updatedContentItems.length === contentItems.length) {
            throw new Error(`Content item not found with ID: ${contentId}`);
        }
        
        // Save updated content items
        await saveContentItems(updatedContentItems);
        
        return true;
    } catch (error) {
        console.error('Error deleting content item:', error);
        throw error;
    }
}

/**
 * Search content items
 * @param {string} query - Search query
 * @param {Object} filters - Optional filters (platform, date range, etc.)
 * @returns {Promise<Array>} Filtered content items
 */
export async function searchContentItems(query, filters = {}) {
    try {
        // Load content items
        const contentItems = await loadContentItems();
        
        // Filter content items based on query and filters
        return contentItems.filter(item => {
            // Text search
            const searchableText = `${item.title} ${item.description || ''} ${item.tags || ''}`.toLowerCase();
            const searchMatch = !query || searchableText.includes(query.toLowerCase());
            
            // Platform filter
            const platformMatch = !filters.platform || item.platform === filters.platform;
            
            // Date range filter (created date)
            let dateMatch = true;
            if (filters.startDate || filters.endDate) {
                const itemDate = new Date(item.createdAt);
                
                if (filters.startDate) {
                    const startDate = new Date(filters.startDate);
                    dateMatch = dateMatch && itemDate >= startDate;
                }
                
                if (filters.endDate) {
                    const endDate = new Date(filters.endDate);
                    dateMatch = dateMatch && itemDate <= endDate;
                }
            }
            
            return searchMatch && platformMatch && dateMatch;
        });
    } catch (error) {
        console.error('Error searching content items:', error);
        return [];
    }
}

/**
 * Generate unique content ID
 * @returns {string} Unique content ID
 */
function generateContentId() {
    return 'content_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Normalize URL for comparison
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
    try {
        // Remove protocol, www, trailing slashes, and convert to lowercase
        return url.trim()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/+$/, '')
            .toLowerCase();
    } catch (error) {
        return url;
    }
} 