/**
 * API integration module for Platform Engagement Tracker
 */

import { formatYouTubeDuration, hashCode, seededRandom } from './utils.js';
import { getCurrentUser, loadUserData, saveUserData } from './storage.js';
import { AVG_VIDEO_LENGTH_MINUTES } from './config.js';

/**
 * Fetch YouTube video information
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} Video information
 */
export async function fetchYouTubeContentInfo(videoId) {
    const apiConfig = await loadUserData('apiConfig', {});
    
    if (!apiConfig.youtube || !apiConfig.youtube.apiKey) {
        throw new Error('YouTube API key is not configured. Please add an API key in Settings.');
    }
    
    // Make API call to YouTube Data API - include contentDetails for duration
    const apiKey = apiConfig.youtube.apiKey;
    const videoInfoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
    
    const response = await fetch(videoInfoUrl);
    
    if (!response.ok) {
        throw new Error(`YouTube API returned status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
        throw new Error('No data found for this YouTube video');
    }
    
    const snippet = data.items[0].snippet;
    const contentDetails = data.items[0].contentDetails;
    
    // Parse ISO 8601 duration format
    let duration = '';
    if (contentDetails && contentDetails.duration) {
        duration = formatYouTubeDuration(contentDetails.duration);
    }
    
    return {
        title: snippet.title,
        publishedDate: new Date(snippet.publishedAt),
        duration: duration
    };
}

/**
 * Fetch YouTube video engagement metrics
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} Engagement metrics
 */
export async function fetchYouTubeEngagement(videoId) {
    const apiConfig = await loadUserData('apiConfig', {});
    
    if (!apiConfig.youtube || !apiConfig.youtube.apiKey) {
        console.error('YouTube API not configured');
        return simulateYouTubeEngagement(videoId);
    }
    
    try {
        console.log(`Fetching YouTube data for video ID: ${videoId}`);
        
        // Make a real API call to YouTube Data API v3
        const apiKey = apiConfig.youtube.apiKey;
        const videoStatsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`;
        const response = await fetch(videoStatsUrl);
        
        if (!response.ok) {
            throw new Error(`YouTube API returned status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if we got valid results
        if (!data.items || data.items.length === 0) {
            console.warn(`No data found for YouTube video ID: ${videoId}`);
            return simulateYouTubeEngagement(videoId);
        }
        
        // Extract the statistics from the API response
        const statistics = data.items[0].statistics;
        
        return {
            views: parseInt(statistics.viewCount) || 0,
            likes: parseInt(statistics.likeCount) || 0,
            comments: parseInt(statistics.commentCount) || 0,
            shares: 0, // YouTube API doesn't provide share count
            otherMetrics: {
                favorites: parseInt(statistics.favoriteCount) || 0
            }
        };
    } catch (error) {
        console.error('Error fetching YouTube data:', error);
        return simulateYouTubeEngagement(videoId);
    }
}

/**
 * Simulate YouTube engagement metrics when API fails
 * @param {string} videoId - YouTube video ID
 * @returns {Object} Simulated engagement metrics
 */
function simulateYouTubeEngagement(videoId) {
    const seed = hashCode(videoId);
    const rng = seededRandom(seed);
    
    return {
        views: Math.floor(rng() * 8000) + 2000,
        likes: Math.floor(rng() * 500),
        comments: Math.floor(rng() * 100),
        shares: 0,
        otherMetrics: {
            favorites: Math.floor(rng() * 20)
        }
    };
}

/**
 * Fetch ServiceNow blog information
 * @param {string} blogId - ServiceNow blog ID
 * @returns {Promise<Object>} Blog information
 */
export async function fetchServiceNowContentInfo(blogId) {
    // In a real implementation, you would make an API call to ServiceNow
    // For this demo, we'll use a fallback approach
    console.log(`Would fetch ServiceNow info for blog ID: ${blogId}`);
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Fallback to a title based on the blog ID
    return {
        title: `ServiceNow Blog: ${blogId}`,
        publishedDate: new Date() // Use current date as fallback
    };
}

/**
 * Fetch ServiceNow blog engagement metrics
 * @param {string} blogId - ServiceNow blog ID
 * @returns {Promise<Object>} Engagement metrics
 */
export async function fetchServiceNowEngagement(blogId) {
    const apiConfig = await loadUserData('apiConfig', {});
    
    if (!apiConfig.servicenow || !apiConfig.servicenow.instance || !apiConfig.servicenow.username) {
        console.error('ServiceNow API not configured');
        return simulateServiceNowEngagement(blogId);
    }
    
    try {
        // This would be a real API call in production
        console.log(`Fetching ServiceNow data for blog ID: ${blogId}`);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // For demonstration, use our simulated data function
        return simulateServiceNowEngagement(blogId);
        
    } catch (error) {
        console.error('Error fetching ServiceNow data:', error);
        return simulateServiceNowEngagement(blogId);
    }
}

/**
 * Simulate ServiceNow engagement metrics
 * @param {string} blogId - ServiceNow blog ID
 * @returns {Object} Simulated engagement metrics
 */
function simulateServiceNowEngagement(blogId) {
    const seed = hashCode(blogId);
    const rng = seededRandom(seed);
    
    return {
        views: Math.floor(rng() * 3000) + 1000,
        likes: Math.floor(rng() * 200),
        comments: Math.floor(rng() * 50),
        shares: Math.floor(rng() * 30),
        otherMetrics: {
            bookmarks: Math.floor(rng() * 40)
        }
    };
}

/**
 * Fetch LinkedIn post information
 * @param {string} postId - LinkedIn post ID
 * @returns {Promise<Object>} Post information
 */
export async function fetchLinkedInContentInfo(postId) {
    // In a real implementation, you would use LinkedIn API
    console.log(`Would fetch LinkedIn info for post ID: ${postId}`);
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Fallback to a title based on the post ID
    return {
        title: `LinkedIn Post: ${postId}`,
        publishedDate: new Date() // Use current date as fallback
    };
}

/**
 * Fetch LinkedIn post engagement metrics
 * @param {string} postId - LinkedIn post ID
 * @returns {Promise<Object>} Engagement metrics
 */
export async function fetchLinkedInEngagement(postId) {
    const apiConfig = await loadUserData('apiConfig', {});
    
    if (!apiConfig.linkedin || !apiConfig.linkedin.clientId || !apiConfig.linkedin.clientSecret) {
        console.error('LinkedIn API not configured');
        return simulateLinkedInEngagement(postId);
    }
    
    try {
        // This would be a real API call in production
        console.log(`Fetching LinkedIn data for post ID: ${postId}`);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // For demonstration, use our simulated data function
        return simulateLinkedInEngagement(postId);
        
    } catch (error) {
        console.error('Error fetching LinkedIn data:', error);
        return simulateLinkedInEngagement(postId);
    }
}

/**
 * Simulate LinkedIn engagement metrics
 * @param {string} postId - LinkedIn post ID
 * @returns {Object} Simulated engagement metrics
 */
function simulateLinkedInEngagement(postId) {
    const seed = hashCode(postId);
    const rng = seededRandom(seed);
    
    return {
        views: Math.floor(rng() * 2000) + 500,
        likes: Math.floor(rng() * 150),
        comments: Math.floor(rng() * 30),
        shares: Math.floor(rng() * 20),
        otherMetrics: {
            impressions: Math.floor(rng() * 5000),
            clicks: Math.floor(rng() * 200)
        }
    };
}

/**
 * Fetch engagement data for multiple content items
 * @param {Array} contentItems - Array of content items
 * @param {Array|null} itemsToFetch - Optional list of content IDs to fetch, if null fetch all
 * @returns {Promise<Array>} Array of engagement data objects
 */
export async function fetchEngagementData(contentItems, itemsToFetch = null) {
    try {
        console.log(`Starting to fetch engagement data for ${itemsToFetch ? itemsToFetch.length : 'all'} items`);
        
        // Ensure we have content items
        if (!contentItems || !Array.isArray(contentItems) || contentItems.length === 0) {
            console.warn('No content items available, returning empty engagement data');
            return [];
        }
        
        // Filter content items if specific ones are requested
        const itemsToProcess = itemsToFetch 
            ? contentItems.filter(item => itemsToFetch.includes(item.id))
            : contentItems;
        
        if (itemsToProcess.length === 0) {
            console.warn('No matching content items found to fetch engagement data');
            return [];
        }
        
        console.log(`Processing engagement data for ${itemsToProcess.length} content items`);
        
        // Process each content item
        const engagementPromises = itemsToProcess.map(async (item) => {
            try {
                if (!item || !item.url || !item.platform) {
                    console.warn('Skipping invalid content item:', item);
                    return null;
                }
                
                // Extract content ID from URL
                const contentId = item.contentId || extractContentId(item.url, item.platform);
                
                if (!contentId) {
                    console.warn(`Could not extract content ID from ${item.url}`);
                    return null;
                }
                
                // Fetch engagement based on platform
                let engagement;
                switch (item.platform) {
                    case 'youtube':
                        engagement = await fetchYouTubeEngagement(contentId);
                        break;
                    case 'servicenow':
                        engagement = await fetchServiceNowEngagement(contentId);
                        break;
                    case 'linkedin':
                        engagement = await fetchLinkedInEngagement(contentId);
                        break;
                    default:
                        // For unknown platforms, generate simulated data
                        engagement = simulateEngagement(contentId);
                }
                
                // Add metadata to engagement data
                return {
                    id: 'eng_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    contentId: item.id,
                    contentUrl: item.url,
                    contentName: item.name || item.title || 'Untitled',
                    platform: item.platform,
                    date: new Date().toISOString().split('T')[0],
                    timestamp: new Date().toISOString(),
                    ...engagement
                };
            } catch (itemError) {
                console.error(`Error processing content item ${item.id}:`, itemError);
                return null;
            }
        });
        
        // Wait for all engagement data to be fetched
        const engagementResults = await Promise.all(engagementPromises);
        
        // Filter out nulls (failed fetches)
        const validEngagementData = engagementResults.filter(item => item !== null);
        
        console.log(`Successfully fetched ${validEngagementData.length} engagement records`);
        return validEngagementData;
    } catch (error) {
        console.error('Error fetching engagement data:', error);
        return [];
    }
}

/**
 * Extract content ID from URL based on platform
 * @param {string} url - Content URL
 * @param {string} platform - Platform name
 * @returns {string} Content ID
 */
function extractContentId(url, platform) {
    try {
        if (!url) return '';
        
        // Handle missing protocol
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        
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
                return url.split('/').pop();
        }
    } catch (e) {
        console.error('Error extracting content ID:', e);
        // If URL parsing fails, return a fallback
        return url.split('/').pop();
    }
}

/**
 * Generate generic simulated engagement data
 * @param {string} contentId - Content ID
 * @returns {Object} Simulated engagement data
 */
function simulateEngagement(contentId) {
    const seed = hashCode(contentId);
    const rng = seededRandom(seed);
    
    return {
        views: Math.floor(rng() * 2000) + 500,
        likes: Math.floor(rng() * 150),
        comments: Math.floor(rng() * 30),
        shares: Math.floor(rng() * 20)
    };
}

// Ensure all required handler functions are exported
export { 
    fetchYouTubeContentInfo,
    fetchYouTubeEngagement,
    fetchServiceNowContentInfo,
    fetchServiceNowEngagement,
    fetchLinkedInContentInfo,
    fetchLinkedInEngagement
};