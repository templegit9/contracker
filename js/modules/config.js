/**
 * Configuration module for Platform Engagement Tracker
 */

// Platform configuration
export const PLATFORMS = {
    youtube: 'Youtube',
    servicenow: 'ServiceNow Community',
    linkedin: 'LinkedIn'
};

// Default API configuration
export const DEFAULT_API_CONFIG = {
    youtube: { apiKey: null },
    servicenow: { instance: null, username: null, password: null },
    linkedin: { clientId: null, clientSecret: null, accessToken: null }
};

// Constants for watch time calculation
export const AVG_WATCH_PERCENTAGE = 0.55; // Average viewer watches 55% of content
export const AVG_VIDEO_LENGTH_MINUTES = 4.4; // Default when duration isn't available