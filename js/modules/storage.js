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
            throw new Error('No current user');
        }
        
        const userPrefix = `user_${currentUser.id}_`;
        const dataStr = JSON.stringify(data);
        
        // Try to use localforage first (preferred)
        if (typeof window !== 'undefined' && window.localforage) {
            try {
                await window.localforage.setItem(userPrefix + key, dataStr);
                console.log(`Data saved with localforage for key: ${key} (${dataStr.length} chars)`);
                return;
            } catch (localforageError) {
                console.warn(`Error saving with localforage, will try localStorage: ${localforageError.message}`);
                // Continue to localStorage fallback
            }
        }
        
        // Fallback to localStorage
        try {
            localStorage.setItem(userPrefix + key, dataStr);
            console.log(`Data saved with localStorage for key: ${key} (${dataStr.length} chars)`);
        } catch (localStorageError) {
            throw new Error(`Failed to save data: ${localStorageError.message}`);
        }
    } catch (error) {
        console.error(`Error saving user data for key ${key}:`, error);
        throw error; // Re-throw to allow caller to handle
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
        
        // Try localforage first (preferred)
        if (typeof window !== 'undefined' && window.localforage) {
            try {
                data = await window.localforage.getItem(userPrefix + key);
                if (data !== null) {
                    console.log(`Data loaded from localforage for key: ${key}`);
                    return JSON.parse(data);
                }
            } catch (localforageError) {
                console.warn(`Error loading from localforage, will try localStorage: ${localforageError.message}`);
                // Continue to localStorage fallback
            }
        }
        
        // Try localStorage as fallback
        try {
            data = localStorage.getItem(userPrefix + key);
            if (data !== null) {
                console.log(`Data loaded from localStorage for key: ${key}`);
                return JSON.parse(data);
            }
        } catch (localStorageError) {
            console.warn(`Error loading from localStorage: ${localStorageError.message}`);
            // Continue to return default value
        }
        
        // No data found in either storage, return default
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
        // Validate users array
        if (!Array.isArray(users)) {
            throw new Error('Invalid users data: must be an array');
        }
        
        // Validate each user object
        users.forEach(user => {
            if (!user || typeof user !== 'object') {
                throw new Error('Invalid user object in users array');
            }
            if (!user.id || typeof user.id !== 'string') {
                throw new Error('Invalid user ID in users array');
            }
            if (!user.email || typeof user.email !== 'string') {
                throw new Error('Invalid user email in users array');
            }
            if (!user.password || typeof user.password !== 'string') {
                throw new Error('Invalid user password in users array');
            }
        });
        
        const usersJson = JSON.stringify(users);
        
        // Try localforage first
        if (typeof window !== 'undefined' && window.localforage) {
            try {
                await window.localforage.setItem('users', usersJson);
                console.log(`Saved ${users.length} users to localforage`);
            } catch (localforageError) {
                console.warn(`Error saving with localforage, will try localStorage: ${localforageError.message}`);
                // Continue to localStorage fallback
            }
        }
        
        // Fallback to localStorage
        try {
            localStorage.setItem('users', usersJson);
            console.log(`Saved ${users.length} users to localStorage (fallback)`);
        } catch (localStorageError) {
            throw new Error(`Failed to save users: ${localStorageError.message}`);
        }
    } catch (error) {
        console.error('Error saving users:', error);
        throw error; // Re-throw to allow caller to handle
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
            try {
                usersData = await window.localforage.getItem('users');
                console.log('Loaded users from localforage');
            } catch (localforageError) {
                console.warn(`Error loading from localforage, will try localStorage: ${localforageError.message}`);
            }
        }
        
        // If localforage failed or didn't find users, try localStorage
        if (usersData === null) {
            try {
                const localData = localStorage.getItem('users');
                if (localData) {
                    usersData = localData;
                    console.log('Loaded users from localStorage (fallback)');
                }
            } catch (localStorageError) {
                console.warn(`Error loading from localStorage: ${localStorageError.message}`);
            }
        }
        
        // Parse and validate users
        if (usersData) {
            try {
                const users = JSON.parse(usersData);
                
                // Validate users array
                if (!Array.isArray(users)) {
                    throw new Error('Invalid users data: must be an array');
                }
                
                // Validate each user object
                users.forEach(user => {
                    if (!user || typeof user !== 'object') {
                        throw new Error('Invalid user object in users array');
                    }
                    if (!user.id || typeof user.id !== 'string') {
                        throw new Error('Invalid user ID in users array');
                    }
                    if (!user.email || typeof user.email !== 'string') {
                        throw new Error('Invalid user email in users array');
                    }
                    if (!user.password || typeof user.password !== 'string') {
                        throw new Error('Invalid user password in users array');
                    }
                });
                
                console.log(`Loaded ${users.length} users`);
                return users;
            } catch (parseError) {
                console.error('Error parsing users JSON:', parseError);
                // If data is corrupted, clear it
                try {
                    localStorage.removeItem('users');
                    if (window.localforage) {
                        await window.localforage.removeItem('users');
                    }
                } catch (clearError) {
                    console.error('Error clearing corrupted users data:', clearError);
                }
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
