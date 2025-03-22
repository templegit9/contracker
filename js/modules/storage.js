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
    try {
        if (!currentUser) {
            console.error('saveUserData: No current user');
            return;
        }
        
        const userPrefix = `user_${currentUser.id}_`;
        const dataStr = JSON.stringify(data);
        
        // Check if localforage is available
        if (typeof window !== 'undefined' && window.localforage) {
            await window.localforage.setItem(userPrefix + key, dataStr);
            console.log(`Data saved for key: ${key} (${dataStr.length} chars)`);
        } else {
            // Fallback to localStorage
            console.warn('localforage not available, using localStorage fallback');
            localStorage.setItem(userPrefix + key, dataStr);
        }
    } catch (error) {
        console.error(`Error saving user data for key ${key}:`, error);
        // Last resort fallback - try localStorage directly
        try {
            const userPrefix = `user_${currentUser.id}_`;
            localStorage.setItem(userPrefix + key, JSON.stringify(data));
        } catch (innerError) {
            console.error('Even localStorage fallback failed:', innerError);
        }
    }
}

/**
 * Load data for current user
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {Promise<any>} Promise resolving with loaded data
 */
export async function loadUserData(key, defaultValue = null) {
    try {
        if (!currentUser) {
            console.warn('loadUserData: No current user, returning default value');
            return defaultValue;
        }
        
        const userPrefix = `user_${currentUser.id}_`;
        let data = null;
        
        // Try localforage first
        if (typeof window !== 'undefined' && window.localforage) {
            data = await window.localforage.getItem(userPrefix + key);
            console.log(`Data loaded from localforage for key: ${key}`);
        } 
        
        // If localforage failed or didn't find the data, try localStorage
        if (data === null) {
            const localData = localStorage.getItem(userPrefix + key);
            if (localData) {
                data = localData;
                console.log(`Data loaded from localStorage for key: ${key}`);
            }
        }
        
        if (data) {
            try {
                return JSON.parse(data);
            } catch (parseError) {
                console.error(`Error parsing JSON for key ${key}:`, parseError);
                return defaultValue;
            }
        }
        
        return defaultValue;
    } catch (error) {
        console.error(`Error loading user data for key ${key}:`, error);
        return defaultValue;
    }
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
    try {
        const usersJson = JSON.stringify(users);
        
        // Try localforage first
        if (typeof window !== 'undefined' && window.localforage) {
            await window.localforage.setItem('users', usersJson);
            console.log(`Saved ${users.length} users to localforage`);
        } else {
            // Fallback to localStorage
            localStorage.setItem('users', usersJson);
            console.log(`Saved ${users.length} users to localStorage (fallback)`);
        }
    } catch (error) {
        console.error('Error saving users:', error);
        
        // Last resort fallback
        try {
            localStorage.setItem('users', JSON.stringify(users));
        } catch (innerError) {
            console.error('Failed to save users even with localStorage fallback:', innerError);
        }
    }
}

/**
 * Load users list
 * @returns {Promise<Array>} Promise resolving with users array
 */
export async function loadUsers() {
    try {
        let usersData = null;
        
        // Try localforage first
        if (typeof window !== 'undefined' && window.localforage) {
            usersData = await window.localforage.getItem('users');
            console.log('Loaded users from localforage');
        }
        
        // If localforage failed or didn't find users, try localStorage
        if (usersData === null) {
            const localData = localStorage.getItem('users');
            if (localData) {
                usersData = localData;
                console.log('Loaded users from localStorage (fallback)');
            }
        }
        
        // Parse and return users
        if (usersData) {
            try {
                const users = JSON.parse(usersData);
                console.log(`Loaded ${users.length} users`);
                return users;
            } catch (parseError) {
                console.error('Error parsing users JSON:', parseError);
                return [];
            }
        }
        
        console.log('No users found, returning empty array');
        return [];
    } catch (error) {
        console.error('Error loading users:', error);
        return [];
    }
}

/**
 * Remove user data for the specified user ID
 * @param {string} userId - User ID to remove
 * @returns {Promise} Promise resolving when data is removed
 */
export async function removeUserData(userId) {
    try {
        const userPrefix = `user_${userId}_`;
        console.log(`Removing data for user: ${userId}`);
        
        // Try with localforage if available
        if (typeof window !== 'undefined' && window.localforage) {
            const keys = await window.localforage.keys();
            const userKeys = keys.filter(key => key.startsWith(userPrefix));
            
            console.log(`Found ${userKeys.length} items to remove`);
            
            for (const key of userKeys) {
                await window.localforage.removeItem(key);
            }
        }
        
        // Also clean localStorage for backup storage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(userPrefix)) {
                localStorage.removeItem(key);
            }
        }
        
        console.log(`Data removal for user ${userId} complete`);
    } catch (error) {
        console.error(`Error removing user data for ${userId}:`, error);
    }
}