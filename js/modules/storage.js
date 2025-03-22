/**
 * Storage module for Platform Engagement Tracker
 */

import { DEFAULT_API_CONFIG } from './config.js';

// Current user reference
let currentUser = null;

/**
 * Set current user for storage operations
 * @param {Object} user - User object
 */
export function setCurrentUser(user) {
    currentUser = user;
}

/**
 * Get current user
 * @returns {Object} Current user object
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Save data with user prefix to isolate user data
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 * @returns {Promise} Promise resolving when data is saved
 */
export async function saveUserData(key, data) {
    if (!currentUser) return;
    
    const userPrefix = `user_${currentUser.id}_`;
    await localforage.setItem(userPrefix + key, JSON.stringify(data));
}

/**
 * Load data for current user
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {Promise<any>} Promise resolving with loaded data
 */
export async function loadUserData(key, defaultValue = null) {
    if (!currentUser) return defaultValue;
    
    const userPrefix = `user_${currentUser.id}_`;
    const data = await localforage.getItem(userPrefix + key);
    
    return data ? JSON.parse(data) : defaultValue;
}

/**
 * Load all user data (content, engagement, config)
 * @returns {Promise<Object>} Promise resolving with all user data
 */
export async function loadAllUserData() {
    // Load API config
    const apiConfig = await loadUserData('apiConfig', DEFAULT_API_CONFIG);
    
    // Load content items
    const contentItems = await loadUserData('contentItems', []);
    
    // Load engagement data
    const engagementData = await loadUserData('engagementData', []);
    
    return {
        apiConfig,
        contentItems,
        engagementData
    };
}

/**
 * Save user preference
 * @param {string} key - Preference key
 * @param {any} value - Preference value
 */
export function savePreference(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Load user preference
 * @param {string} key - Preference key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Stored preference or default
 */
export function loadPreference(key, defaultValue = null) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
}

/**
 * Save users list
 * @param {Array} users - Array of user objects
 * @returns {Promise} Promise resolving when users are saved
 */
export async function saveUsers(users) {
    await localforage.setItem('users', JSON.stringify(users));
}

/**
 * Load users list
 * @returns {Promise<Array>} Promise resolving with users array
 */
export async function loadUsers() {
    const users = await localforage.getItem('users');
    return users ? JSON.parse(users) : [];
}

/**
 * Remove user data for the specified user ID
 * @param {string} userId - User ID to remove
 * @returns {Promise} Promise resolving when data is removed
 */
export async function removeUserData(userId) {
    const keys = await localforage.keys();
    const userPrefix = `user_${userId}_`;
    
    const userKeys = keys.filter(key => key.startsWith(userPrefix));
    
    for (const key of userKeys) {
        await localforage.removeItem(key);
    }
}