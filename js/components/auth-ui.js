/**
 * Authentication UI component for Platform Engagement Tracker
 */

import { handleLogin, handleRegister } from '../modules/auth.js';
import { loadPreference, savePreference } from '../modules/storage.js';

// DOM elements
const authContent = document.getElementById('auth-content');
const mainContent = document.getElementById('main-content');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const authDarkModeToggle = document.getElementById('auth-dark-mode-toggle');

/**
 * Initialize authentication UI
 */
export function initAuthUI() {
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
}

/**
 * Initialize dark mode functionality
 */
function initDarkMode() {
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
    const isDarkMode = e.target.checked;
    
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
    
    if (e.target.id === 'dark-mode-toggle' && authToggle) {
        authToggle.checked = isDarkMode;
    } else if (e.target.id === 'auth-dark-mode-toggle' && mainToggle) {
        mainToggle.checked = isDarkMode;
    }
    
    // Update charts for better visibility in dark mode
    const updateChartsEvent = new CustomEvent('darkModeChanged', { detail: { isDarkMode } });
    document.dispatchEvent(updateChartsEvent);
}

/**
 * Show authentication screen
 */
export function showAuth() {
    mainContent.style.display = 'none';
    authContent.style.display = 'block';
}

/**
 * Hide authentication screen
 */
export function hideAuth() {
    authContent.style.display = 'none';
    mainContent.style.display = 'block';
}