/**
 * Configuration values for Platform Engagement Tracker
 */

// Platform names and display values
export const PLATFORMS = {
    youtube: 'YouTube',
    linkedin: 'LinkedIn',
    servicenow: 'ServiceNow',
    other: 'Other'
};

// Average watch percentage for YouTube videos (0-1)
export const AVG_WATCH_PERCENTAGE = 0.4; // 40% of video duration on average

// API retry settings
export const API_RETRY_ATTEMPTS = 3;
export const API_RETRY_DELAY = 1000; // milliseconds

// Version information
export const APP_VERSION = '1.0.0';
export const APP_BUILD_DATE = '2024-04-24';

// Default pagination limits
export const DEFAULT_PAGE_SIZE = 10;

// Default API configuration
export const DEFAULT_API_CONFIG = {
    youtube: { apiKey: null },
    servicenow: { instance: null, username: null, password: null },
    linkedin: { clientId: null, clientSecret: null, accessToken: null }
};

// Constants for watch time calculation
export const AVG_VIDEO_LENGTH_MINUTES = 4.4; // Default when duration isn't available