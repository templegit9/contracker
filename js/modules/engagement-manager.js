/**
 * Engagement Manager module for Platform Engagement Tracker
 * Handles operations for content engagement data
 */

import { saveUserData, loadUserData } from './storage.js';
import { AVG_WATCH_PERCENTAGE } from './config.js';

// Storage keys
const ENGAGEMENT_STORAGE_KEY = 'engagementData';

/**
 * Load all engagement data
 * @returns {Promise<Array>} Array of engagement data objects
 */
export async function loadEngagementData() {
    try {
        const engagementData = await loadUserData(ENGAGEMENT_STORAGE_KEY, []);
        console.log(`Loaded ${engagementData.length} engagement records`);
        return engagementData;
    } catch (error) {
        console.error('Error loading engagement data:', error);
        return [];
    }
}

/**
 * Save engagement data
 * @param {Array} engagementData - Array of engagement objects
 * @returns {Promise<boolean>} Success flag
 */
export async function saveEngagementData(engagementData) {
    try {
        if (!Array.isArray(engagementData)) {
            throw new Error('Engagement data must be an array');
        }
        
        await saveUserData(ENGAGEMENT_STORAGE_KEY, engagementData);
        console.log(`Saved ${engagementData.length} engagement records`);
        return true;
    } catch (error) {
        console.error('Error saving engagement data:', error);
        return false;
    }
}

/**
 * Add engagement data for a content item
 * @param {Object} engagementData - Engagement data to add
 * @returns {Promise<Object>} Added engagement data with ID
 */
export async function addEngagementData(engagementData) {
    try {
        if (!engagementData || typeof engagementData !== 'object') {
            throw new Error('Invalid engagement data');
        }
        
        // Required fields validation
        const requiredFields = ['contentId', 'date', 'views'];
        for (const field of requiredFields) {
            if (engagementData[field] === undefined) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        // Load existing engagement data
        const existingData = await loadEngagementData();
        
        // Create new engagement entry with ID
        const newEngagement = {
            ...engagementData,
            id: generateEngagementId(),
            timestamp: engagementData.timestamp || new Date().toISOString()
        };
        
        // Add to engagement array
        existingData.push(newEngagement);
        
        // Save updated engagement data
        await saveEngagementData(existingData);
        
        return newEngagement;
    } catch (error) {
        console.error('Error adding engagement data:', error);
        throw error;
    }
}

/**
 * Calculate engagement metrics for content items
 * @param {Array} contentItems - Array of content items
 * @param {Array} engagementData - Array of engagement data
 * @returns {Object} Engagement metrics
 */
export function calculateEngagementMetrics(contentItems, engagementData) {
    try {
        // Initialize metrics object
        const metrics = {
            totalViews: 0,
            totalContent: contentItems.length,
            averageViewsPerItem: 0,
            topPerformingContent: null,
            recentTrend: 'stable',
            platformPerformance: {},
            engagementOverTime: []
        };
        
        if (!contentItems.length) {
            return metrics;
        }
        
        // Calculate total views
        metrics.totalViews = engagementData.reduce((sum, item) => sum + (item.views || 0), 0);
        
        // Calculate average views per item
        metrics.averageViewsPerItem = metrics.totalViews / metrics.totalContent;
        
        // Find top performing content
        const contentViewsMap = {};
        
        // Map content IDs to total views
        engagementData.forEach(engagement => {
            const contentId = engagement.contentId;
            contentViewsMap[contentId] = (contentViewsMap[contentId] || 0) + engagement.views;
        });
        
        // Find the content with most views
        let maxViews = 0;
        let topContentId = null;
        
        Object.entries(contentViewsMap).forEach(([contentId, views]) => {
            if (views > maxViews) {
                maxViews = views;
                topContentId = contentId;
            }
        });
        
        // Find the top content item
        if (topContentId) {
            metrics.topPerformingContent = contentItems.find(item => item.id === topContentId) || null;
        }
        
        // Calculate platform performance
        const platformViews = {};
        const platformContent = {};
        
        // Count content by platform
        contentItems.forEach(item => {
            const platform = item.platform || 'other';
            platformContent[platform] = (platformContent[platform] || 0) + 1;
        });
        
        // Sum views by platform
        engagementData.forEach(engagement => {
            const contentId = engagement.contentId;
            const content = contentItems.find(item => item.id === contentId);
            
            if (content) {
                const platform = content.platform || 'other';
                platformViews[platform] = (platformViews[platform] || 0) + engagement.views;
            }
        });
        
        // Calculate average views per platform
        Object.keys(platformContent).forEach(platform => {
            const totalViews = platformViews[platform] || 0;
            const contentCount = platformContent[platform] || 0;
            
            metrics.platformPerformance[platform] = {
                totalContent: contentCount,
                totalViews: totalViews,
                averageViews: contentCount > 0 ? totalViews / contentCount : 0
            };
        });
        
        // Calculate engagement over time (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        // Filter recent engagement data
        const recentEngagement = engagementData.filter(item => {
            const date = new Date(item.date);
            return date >= thirtyDaysAgo && date <= now;
        });
        
        // Group by date
        const dateViewsMap = {};
        recentEngagement.forEach(item => {
            const dateStr = item.date.split('T')[0]; // Get just the date part
            dateViewsMap[dateStr] = (dateViewsMap[dateStr] || 0) + item.views;
        });
        
        // Convert to array sorted by date
        metrics.engagementOverTime = Object.entries(dateViewsMap)
            .map(([date, views]) => ({ date, views }))
            .sort((a, b) => a.date.localeCompare(b.date));
        
        // Determine recent trend
        if (metrics.engagementOverTime.length >= 2) {
            const first = metrics.engagementOverTime[0].views;
            const last = metrics.engagementOverTime[metrics.engagementOverTime.length - 1].views;
            
            if (last > first * 1.1) {
                metrics.recentTrend = 'increasing';
            } else if (last < first * 0.9) {
                metrics.recentTrend = 'decreasing';
            } else {
                metrics.recentTrend = 'stable';
            }
        }
        
        return metrics;
    } catch (error) {
        console.error('Error calculating engagement metrics:', error);
        return {
            totalViews: 0,
            totalContent: contentItems.length,
            averageViewsPerItem: 0,
            topPerformingContent: null,
            recentTrend: 'unknown',
            platformPerformance: {},
            engagementOverTime: []
        };
    }
}

/**
 * Generate unique engagement ID
 * @returns {string} Unique engagement ID
 */
function generateEngagementId() {
    return 'engagement_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
} 