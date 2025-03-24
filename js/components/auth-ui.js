/**
 * Authentication UI component for Platform Engagement Tracker
 */

// Note: We're not importing directly from auth.js to avoid circular dependencies
// The handlers will be imported dynamically in setupFormSubmissions()
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

// Handler references (to be set later)
let loginHandler;
let registerHandler;

/**
 * Initialize authentication UI
 */
export function initAuthUI() {
    console.log('Initializing Auth UI - DOM readyState:', document.readyState);
    
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
    
    // Log DOM element statuses
    console.log('DOM Elements:', {
        authContent: !!authContent,
        mainContent: !!mainContent,
        loginForm: !!loginForm,
        registerForm: !!registerForm,
        loginTab: !!loginTab,
        registerTab: !!registerTab,
    });
    
    // Check if elements exist
    if (!loginForm || !registerForm || !loginTab || !registerTab) {
        console.error('Could not initialize auth UI: Missing required DOM elements');
        
        // Add fallback initialization after a delay
        setTimeout(() => {
            console.log('Trying fallback initialization of auth UI');
            const retryInit = () => {
                authContent = document.getElementById('auth-content');
                mainContent = document.getElementById('main-content');
                loginForm = document.getElementById('login-form');
                registerForm = document.getElementById('register-form');
                loginTab = document.getElementById('login-tab');
                registerTab = document.getElementById('register-tab');
                loginError = document.getElementById('login-error');
                registerError = document.getElementById('register-error');
                authDarkModeToggle = document.getElementById('auth-dark-mode-toggle');
                
                if (loginForm && registerForm && loginTab && registerTab) {
                    console.log('Fallback initialization succeeded');
                    setupTabSwitching();
                    setupFormSubmissions();
                    initDarkMode();
                }
            };
            
            retryInit();
        }, 500);
        
        return;
    }
    
    setupTabSwitching();
    setupFormSubmissions();
    initDarkMode();
    
    console.log('Auth UI initialized successfully');
}

/**
 * Set up tab switching
 */
function setupTabSwitching() {
    console.log('Setting up auth tab event listeners');
    
    // Remove any existing event listeners (just in case of duplicate initialization)
    const newLoginTab = loginTab.cloneNode(true);
    const newRegisterTab = registerTab.cloneNode(true);
    
    if (loginTab.parentNode) {
        loginTab.parentNode.replaceChild(newLoginTab, loginTab);
    }
    
    if (registerTab.parentNode) {
        registerTab.parentNode.replaceChild(newRegisterTab, registerTab);
    }
    
    // Update references
    loginTab = newLoginTab;
    registerTab = newRegisterTab;
    
    // Create specific handler functions for better debugging
    const handleLoginTabClick = (e) => {
        console.log('Login tab clicked');
        e.preventDefault();
        
        // Switch active tab styling
        loginTab.classList.add('border-b-2', 'border-green-500', 'text-green-600', 'dark:text-green-400');
        loginTab.classList.remove('text-gray-500', 'dark:text-gray-400');
        registerTab.classList.remove('border-b-2', 'border-green-500', 'text-green-600', 'dark:text-green-400');
        registerTab.classList.add('text-gray-500', 'dark:text-gray-400');
        
        // Toggle form visibility
        console.log('Showing login form, hiding register form');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    };
    
    const handleRegisterTabClick = (e) => {
        console.log('Register tab clicked');
        e.preventDefault();
        
        // Switch active tab styling
        registerTab.classList.add('border-b-2', 'border-green-500', 'text-green-600', 'dark:text-green-400');
        registerTab.classList.remove('text-gray-500', 'dark:text-gray-400');
        loginTab.classList.remove('border-b-2', 'border-green-500', 'text-green-600', 'dark:text-green-400');
        loginTab.classList.add('text-gray-500', 'dark:text-gray-400');
        
        // Toggle form visibility
        console.log('Showing register form, hiding login form');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    };
    
    // Add the event listeners with debugging
    console.log('Adding login tab click listener');
    loginTab.addEventListener('click', handleLoginTabClick);
    
    console.log('Adding register tab click listener');
    registerTab.addEventListener('click', handleRegisterTabClick);
    
    // Add direct onclick attributes as backup
    loginTab.setAttribute('onclick', "document.getElementById('login-form').classList.remove('hidden'); document.getElementById('register-form').classList.add('hidden');");
    registerTab.setAttribute('onclick', "document.getElementById('register-form').classList.remove('hidden'); document.getElementById('login-form').classList.add('hidden');");
}

/**
 * Set up form submissions
 */
function setupFormSubmissions() {
    if (loginForm && registerForm) {
        console.log('Setting up form submission handlers');
        
        // Import the handlers on demand to avoid circular dependencies
        import('../modules/auth.js').then(authModule => {
            // Store references to the handlers
            loginHandler = authModule.handleLogin;
            registerHandler = authModule.handleRegister;
            
            // Create wrapper functions to ensure 'this' context is preserved
            const loginWrapper = (e) => {
                console.log('Login form submitted via wrapper');
                e.preventDefault(); // Ensure we prevent form submission
                loginHandler(e);
            };
            
            const registerWrapper = (e) => {
                console.log('Register form submitted via wrapper');
                e.preventDefault(); // Ensure we prevent form submission
                registerHandler(e);
            };
            
            // Remove any existing listeners (just in case)
            loginForm.removeEventListener('submit', loginWrapper);
            registerForm.removeEventListener('submit', registerWrapper);
            
            // Add the event listeners
            loginForm.addEventListener('submit', loginWrapper);
            registerForm.addEventListener('submit', registerWrapper);
            
            // REMOVED: Direct onsubmit attributes override
            // These were causing the form handlers to fail by returning false
            
            console.log('Form submission handlers successfully attached');
            
            // Expose handlers to window for access from HTML as backup
            window.handleLoginSubmit = loginWrapper;
            window.handleRegisterSubmit = registerWrapper;
        }).catch(error => {
            console.error('Error importing auth module:', error);
        });
    } else {
        console.error('Cannot set up form submissions: forms not found in DOM');
    }
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
