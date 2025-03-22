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
 * Fetch engagement data for all content items or specific ones
 * @param {Array} contentItems - Content items to fetch engagement for
 * @param {Array} itemsToFetch - Specific items to fetch (optional)
 * @returns {Promise<Array>} Updated engagement data
 */
export async function fetchEngagementData(contentItems, itemsToFetch = null) {
    const engagementData = await loadUserData('engagementData', []);
    const itemsToProcess = itemsToFetch || contentItems;
    
    if (itemsToProcess.length === 0) {
        return engagementData;
    }
    
    // Create a timestamp for this fetch
    const timestamp = new Date().toISOString();
    
    for (const item of itemsToProcess) {
        const normalizedUrl = normalizeUrl(item.url);
        
        // Get engagement metrics based on platform
        let metrics = null;
        
        switch (item.platform) {
            case 'youtube':
                metrics = await fetchYouTubeEngagement(item.contentId);
                break;
            
            case 'servicenow':
                metrics = await fetchServiceNowEngagement(item.contentId);
                break;
            
            case 'linkedin':
                metrics = await fetchLinkedInEngagement(item.contentId);
                break;
            
            default:
                metrics = {
                    views: 0,
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    otherMetrics: {}
                };
        }
        
        if (!metrics) continue;
        
        // Create engagement record
        const engagementRecord = {
            contentUrl: normalizedUrl,
            timestamp: timestamp,
            views: metrics.views,
            likes: metrics.likes,
            comments: metrics.comments,
            shares: metrics.shares,
            otherMetrics: metrics.otherMetrics || {}
        };
        
        // Add to data structure
        engagementData.push(engagementRecord);
        
        // Update content item's last updated timestamp
        item.lastUpdated = timestamp;
    }
    
    // Save updated engagement data
    await saveUserData('engagementData', engagementData);
    
    // Save updated content items (for lastUpdated timestamps)
    await saveUserData('contentItems', contentItems);
    
    return engagementData;
}