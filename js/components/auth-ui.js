/**
 * Authentication UI component for Platform Engagement Tracker
 */

import { handleLogin, handleRegister } from '../modules/auth.js';
import { loadPreference, savePreference } from '../modules/storage.js';

// DOM element references
let authContent;
let mainContent;
let loginForm;
let registerForm;
let loginTab;
let registerTab;
let loginError;
let registerError;
let authDarkModeToggle;

/**
 * Initialize authentication UI
 */
export function initAuthUI() {
    // Initialize DOM element references
    authContent = document.getElementById('auth-content');
    mainContent = document.getElementById('main-content');
    loginForm = document.getElementById('login-form');
    registerForm = document.getElementById('register-form');
    loginTab = document.getElementById('login-tab');
    registerTab = document.getElementById('register-tab');
    loginError = document.getElementById('login-error');
    registerError = document.getElementById('register-error');
    authDarkModeToggle = document.getElementById('auth-dark-mode-toggle');
    
    // Check if elements exist
    if (!loginForm || !registerForm || !loginTab || !registerTab) {
        console.error('Could not initialize auth UI: Missing required DOM elements');
        return;
    }
    
    // Set up tab switching
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('border-b-2', 'border-green-500', 'text-green-600', 'dark:text-green-400');
        loginTab.classList.remove('text-gray-500', 'dark:text-gray-400');
        registerTab.classList.remove('border-b-2', 'border-green-500', 'text-green-600', 'dark:text-green-400');
        registerTab.classList.add('text-gray-500', 'dark:text-gray-400');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    });
    
    registerTab.addEventListener('click', () => {
        registerTab.classList.add('border-b-2', 'border-green-500', 'text-green-600', 'dark:text-green-400');
        registerTab.classList.remove('text-gray-500', 'dark:text-gray-400');
        loginTab.classList.remove('border-b-2', 'border-green-500', 'text-green-600', 'dark:text-green-400');
        loginTab.classList.add('text-gray-500', 'dark:text-gray-400');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });
    
    // Set up form submissions
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    
    // Set up dark mode toggle
    initDarkMode();
    
    console.log('Auth UI initialized successfully');
}

/**
 * Initialize dark mode functionality
 */
function initDarkMode() {
    if (!authDarkModeToggle) {
        console.error('Could not initialize dark mode: Missing toggle element');
        return;
    }
    
    // Check for dark mode preference
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedDarkMode = loadPreference('darkMode', null);
    
    // Set initial dark mode based on saved preference or system preference
    if (savedDarkMode === true || (savedDarkMode === null && prefersDarkMode)) {
        document.documentElement.classList.add('dark');
        authDarkModeToggle.checked = true;
    }
    
    // Set up dark mode toggle
    authDarkModeToggle.addEventListener('change', toggleDarkMode);
}

/**
 * Toggle dark mode
 * @param {Event} e - Change event
 */
export function toggleDarkMode(e) {
    try {
        const isDarkMode = e && e.target ? e.target.checked : false;
        
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        // Save preference
        savePreference('darkMode', isDarkMode);
        
        // Keep both toggles in sync
        const mainToggle = document.getElementById('dark-mode-toggle');
        const authToggle = document.getElementById('auth-dark-mode-toggle');
        
        if (e && e.target && e.target.id === 'dark-mode-toggle' && authToggle) {
            authToggle.checked = isDarkMode;
        } else if (e && e.target && e.target.id === 'auth-dark-mode-toggle' && mainToggle) {
            mainToggle.checked = isDarkMode;
        }
        
        // Update charts for better visibility in dark mode
        const updateChartsEvent = new CustomEvent('darkModeChanged', { detail: { isDarkMode } });
        document.dispatchEvent(updateChartsEvent);
        
        console.log('Dark mode toggled:', isDarkMode ? 'on' : 'off');
    } catch (error) {
        console.error('Error toggling dark mode:', error);
    }
}

/**
 * Show authentication screen
 */
export function showAuth() {
    if (!authContent || !mainContent) {
        console.error('Cannot show auth screen: Missing DOM elements');
        return;
    }
    
    mainContent.style.display = 'none';
    authContent.style.display = 'block';
    console.log('Showing auth screen');
}

/**
 * Hide authentication screen
 */
export function hideAuth() {
    if (!authContent || !mainContent) {
        console.error('Cannot hide auth screen: Missing DOM elements');
        return;
    }
    
    authContent.style.display = 'none';
    mainContent.style.display = 'block';
    console.log('Hiding auth screen');
}