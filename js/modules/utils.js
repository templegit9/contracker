/**
 * Utility functions for Platform Engagement Tracker
 */

/**
 * Format date as localized string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

/**
 * Format date and time as localized string
 * @param {string} dateTimeString - ISO date string
 * @returns {string} Formatted date and time
 */
export function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString();
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Parse YouTube ISO 8601 duration format to readable string
 * @param {string} isoDuration - ISO duration string (e.g., PT1H20M15S)
 * @returns {string} Formatted duration (e.g., 1:20:15)
 */
export function formatYouTubeDuration(isoDuration) {
    if (!isoDuration) return '';
    
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return '';
    
    const hours = (match[1] && match[1].replace('H', '')) || 0;
    const minutes = (match[2] && match[2].replace('M', '')) || 0;
    const seconds = (match[3] && match[3].replace('S', '')) || 0;
    
    let formatted = '';
    
    if (hours > 0) {
        formatted += `${hours}:`;
        formatted += `${minutes.toString().padStart(2, '0')}:`;
    } else {
        formatted += `${minutes}:`;
    }
    
    formatted += seconds.toString().padStart(2, '0');
    
    return formatted;
}

/**
 * Format file size with appropriate units
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes) {
    if (bytes < 1024) {
        return bytes + ' bytes';
    } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + ' KB';
    } else {
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}

/**
 * Normalize URL by removing tracking parameters
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
export function normalizeUrl(url) {
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

/**
 * Extract content ID from URL based on platform
 * @param {string} url - Content URL
 * @param {string} platform - Platform name
 * @returns {string} Content ID
 */
export function extractContentId(url, platform) {
    try {
        const urlObj = new URL(url);
        
        switch (platform) {
            case 'youtube':
                // Extract YouTube video ID
                // First try: from query parameter v
                let videoId = urlObj.searchParams.get('v');
                
                if (videoId) return videoId;
                
                // Second try: from youtu.be URLs
                if (urlObj.hostname === 'youtu.be') {
                    return urlObj.pathname.substring(1); // Remove the leading slash
                }
                
                // Third try: from /embed/ URLs
                if (urlObj.pathname.includes('/embed/')) {
                    return urlObj.pathname.split('/embed/')[1].split('/')[0];
                }
                
                // Fourth try: from /v/ URLs
                if (urlObj.pathname.includes('/v/')) {
                    return urlObj.pathname.split('/v/')[1].split('/')[0];
                }
                
                // Last resort: just the last part of the URL
                return url.split('/').pop();
            
            case 'servicenow':
                // Extract ServiceNow blog ID (last part of path)
                return urlObj.pathname.split('/').pop();
            
            case 'linkedin':
                // Extract LinkedIn post ID (end part of URL)
                // Try to match the pattern for LinkedIn posts
                const linkedInMatch = urlObj.pathname.match(/\/posts\/([^\/]+)/);
                if (linkedInMatch && linkedInMatch[1]) {
                    return linkedInMatch[1];
                }
                
                // Fallback to the last segment
                return urlObj.pathname.split('-').pop();
            
            default:
                return url;
        }
    } catch (e) {
        console.error('Error extracting content ID:', e);
        // If URL parsing fails, return a fallback
        return url;
    }
}

/**
 * Calculate video watch hours
 * @param {number} views - Number of views
 * @param {string} duration - Duration string (e.g., "5:30" or "1:20:15")
 * @param {number} avgWatchPercentage - Average percentage of video watched (0-1)
 * @returns {number} Total watch hours
 */
export function calculateWatchHours(views, duration, avgWatchPercentage) {
    if (!views) return 0;
    
    let durationHours = 0;
    
    if (duration) {
        const durationParts = duration.split(':').map(part => parseInt(part, 10));
        
        if (durationParts.length === 2) {
            // Minutes:Seconds format
            durationHours = (durationParts[0] * 60 + durationParts[1]) / 3600;
        } else if (durationParts.length === 3) {
            // Hours:Minutes:Seconds format
            durationHours = durationParts[0] + (durationParts[1] * 60 + durationParts[2]) / 3600;
        }
    } else {
        // If no duration available, assume average YouTube video length (4.4 minutes)
        durationHours = 4.4 / 60;
    }
    
    return views * durationHours * avgWatchPercentage;
}

/**
 * Format watch hours based on size
 * @param {number} hours - Hours to format
 * @returns {string} Formatted hours
 */
export function formatWatchHours(hours) {
    if (hours < 10) {
        return hours.toFixed(2);
    } else if (hours < 1000) {
        return hours.toFixed(1);
    } else {
        return Math.round(hours).toLocaleString();
    }
}

/**
 * Create a seeded random number generator
 * @param {number} seed - Seed value
 * @returns {Function} Random number generator
 */
export function seededRandom(seed) {
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

/**
 * Simple string hash function for seeding
 * @param {string} str - String to hash
 * @returns {number} Hash code
 */
export function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Show notification message
 * @param {string} message - Message text
 * @param {string} type - Message type (success, error)
 * @param {number} duration - Duration in ms
 */
export function showNotification(message, type = 'success', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="material-icons mr-2">${type === 'success' ? 'check_circle' : 'error'}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after duration
    setTimeout(() => {
        notification.remove();
    }, duration);
}