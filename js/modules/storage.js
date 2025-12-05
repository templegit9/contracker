/**
 * Storage module for Platform Engagement Tracker
 * Uses session-based storage (no authentication required)
 */

import { DEFAULT_API_CONFIG } from './config.js';
import { getCurrentSessionId } from './session.js';

/**
 * Get storage key prefix for current session
 * @returns {string} Storage key prefix
 */
function getSessionPrefix() {
    const sessionId = getCurrentSessionId();
    if (!sessionId) {
        console.warn('No session ID available');
        return 'session_unknown_';
    }
    return `session_${sessionId}_`;
}

/**
 * Save data for current session
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 * @returns {Promise} Promise resolving when data is saved
 */
export async function saveSessionData(key, data) {
    try {
        const prefix = getSessionPrefix();
        const dataStr = JSON.stringify(data);

        // Try to use localforage first (preferred)
        if (typeof window !== 'undefined' && window.localforage) {
            try {
                await window.localforage.setItem(prefix + key, dataStr);
                console.log(`Data saved with localforage for key: ${key}`);
                return;
            } catch (localforageError) {
                console.warn(`Error saving with localforage: ${localforageError.message}`);
            }
        }

        // Fallback to localStorage
        localStorage.setItem(prefix + key, dataStr);
        console.log(`Data saved with localStorage for key: ${key}`);
    } catch (error) {
        console.error(`Error saving session data for key ${key}:`, error);
        throw error;
    }
}

/**
 * Load data for current session
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {Promise<any>} Promise resolving with loaded data
 */
export async function loadSessionData(key, defaultValue = null) {
    try {
        const prefix = getSessionPrefix();
        let data = null;

        // Try localforage first (preferred)
        if (typeof window !== 'undefined' && window.localforage) {
            try {
                data = await window.localforage.getItem(prefix + key);
                if (data !== null) {
                    console.log(`Data loaded from localforage for key: ${key}`);
                    return JSON.parse(data);
                }
            } catch (localforageError) {
                console.warn(`Error loading from localforage: ${localforageError.message}`);
            }
        }

        // Try localStorage as fallback
        data = localStorage.getItem(prefix + key);
        if (data !== null) {
            console.log(`Data loaded from localStorage for key: ${key}`);
            return JSON.parse(data);
        }

        return defaultValue;
    } catch (error) {
        console.error(`Error loading session data for key ${key}:`, error);
        return defaultValue;
    }
}

/**
 * Load all session data (content, engagement, config)
 * @returns {Promise<Object>} Promise resolving with all session data
 */
export async function loadAllSessionData() {
    const apiConfig = await loadSessionData('apiConfig', DEFAULT_API_CONFIG);
    const contentItems = await loadSessionData('contentItems', []);
    const engagementData = await loadSessionData('engagementData', []);

    return {
        apiConfig,
        contentItems,
        engagementData
    };
}

/**
 * Save user preference (global, not session-specific)
 * @param {string} key - Preference key
 * @param {any} value - Preference value
 */
export function savePreference(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Load user preference (global, not session-specific)
 * @param {string} key - Preference key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Stored preference or default
 */
export function loadPreference(key, defaultValue = null) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
}

// Legacy aliases for backward compatibility
export const saveUserData = saveSessionData;
export const loadUserData = loadSessionData;
export const loadAllUserData = loadAllSessionData;

// Legacy functions - no longer needed but kept as no-ops
export function setCurrentUser() { }
export function getCurrentUser() { return null; }
export async function saveUsers() { }
export async function loadUsers() { return []; }
export async function removeUserData() { }
