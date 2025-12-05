/**
 * Session management module for Platform Engagement Tracker
 * Replaces authentication with simple session ID system
 */

// Current session ID
let currentSessionId = null;

/**
 * Generate a unique session ID (8 characters, alphanumeric)
 * @returns {string} Unique session ID
 */
export function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Get or create a session
 * Checks localStorage for existing session, creates new one if not found
 * @returns {string} Current session ID
 */
export function getOrCreateSession() {
    // Check for existing session in localStorage
    const savedSessionId = localStorage.getItem('currentSessionId');
    
    if (savedSessionId) {
        currentSessionId = savedSessionId;
        console.log(`Loaded existing session: ${currentSessionId}`);
    } else {
        // Generate new session
        currentSessionId = generateSessionId();
        localStorage.setItem('currentSessionId', currentSessionId);
        console.log(`Created new session: ${currentSessionId}`);
    }
    
    return currentSessionId;
}

/**
 * Get the current session ID
 * @returns {string|null} Current session ID or null if not initialized
 */
export function getCurrentSessionId() {
    return currentSessionId;
}

/**
 * Load a different session by ID
 * @param {string} sessionId - Session ID to load
 * @returns {boolean} True if session was loaded successfully
 */
export function loadSession(sessionId) {
    if (!sessionId || sessionId.length !== 8) {
        console.error('Invalid session ID format');
        return false;
    }
    
    // Update current session
    currentSessionId = sessionId.toUpperCase();
    localStorage.setItem('currentSessionId', currentSessionId);
    console.log(`Switched to session: ${currentSessionId}`);
    
    return true;
}

/**
 * Create a new session (clears current session reference but keeps data)
 * @returns {string} New session ID
 */
export function createNewSession() {
    currentSessionId = generateSessionId();
    localStorage.setItem('currentSessionId', currentSessionId);
    console.log(`Created new session: ${currentSessionId}`);
    return currentSessionId;
}

/**
 * Copy session ID to clipboard
 * @returns {Promise<boolean>} True if copied successfully
 */
export async function copySessionIdToClipboard() {
    if (!currentSessionId) {
        console.error('No session ID to copy');
        return false;
    }
    
    try {
        await navigator.clipboard.writeText(currentSessionId);
        console.log('Session ID copied to clipboard');
        return true;
    } catch (error) {
        console.error('Failed to copy session ID:', error);
        // Fallback for older browsers
        try {
            const textArea = document.createElement('textarea');
            textArea.value = currentSessionId;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (fallbackError) {
            console.error('Fallback copy also failed:', fallbackError);
            return false;
        }
    }
}
