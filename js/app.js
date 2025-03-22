/**
 * Main application entry point for Platform Engagement Tracker
 */

import { initAuth } from './modules/auth.js';
import { initAuthUI } from './components/auth-ui.js';
import { loadPreference } from './modules/storage.js';

/**
 * Initialize application
 */
async function initApp() {
    // Set up user dropdown menu
    setupUserMenu();
    
    // Initialize authentication UI
    initAuthUI();
    
    // Initialize authentication system
    // If user is logged in, this will automatically load the dashboard
    await initAuth();
    
    // Initialize dark mode toggle in main UI (auth UI initializes its own toggle)
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        // Set initial state based on preference
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedDarkMode = loadPreference('darkMode', null);
        
        if (savedDarkMode === true || (savedDarkMode === null && prefersDarkMode)) {
            darkModeToggle.checked = true;
            document.documentElement.classList.add('dark');
        }
        
        // Set up event listener
        darkModeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            
            // Save preference
            localStorage.setItem('darkMode', e.target.checked);
            
            // Update charts for better visibility in dark mode
            const updateChartsEvent = new CustomEvent('darkModeChanged', { 
                detail: { isDarkMode: e.target.checked } 
            });
            document.dispatchEvent(updateChartsEvent);
        });
    }
}

/**
 * Set up user menu dropdown
 */
function setupUserMenu() {
    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', (e) => {
            e.preventDefault();
            userDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }
}

// Initialize the app when DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    initApp();
});