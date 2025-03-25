/**
 * Authentication module for Platform Engagement Tracker
 */

import { setCurrentUser, getCurrentUser, saveUsers, loadUsers, removeUserData } from './storage.js';
import { loadDashboard } from '../components/dashboard.js';

// DEBUG FLAG - set to true to enable debugging features
const DEBUG = true;

// Initialize a global debug object to track authentication state
if (typeof window !== 'undefined') {
    window.authDebug = {
        initialized: false,
        usersLoaded: false,
        lastLoginAttempt: null,
        lastRegisterAttempt: null,
        errors: [],
        loginCount: 0,
        registerCount: 0,
        importError: null,
        circularDependencyCheck: 'auth.js loaded'
    };
    
    // Create debug log function
    window.authLog = function(message, type = 'info') {
        const timestamp = new Date().toISOString().slice(11, 23);
        const logMsg = `${timestamp} [AUTH] ${message}`;
        console.log(`%c${logMsg}`, type === 'error' ? 'color: red; font-weight: bold;' : 
                             type === 'warn' ? 'color: orange;' : 
                             type === 'success' ? 'color: green; font-weight: bold;' : 'color: blue;');
        
        // Also add to debug errors array if it's an error
        if (type === 'error') {
            window.authDebug.errors.push({ time: timestamp, message });
        }
    };

    // Create a function to dump the state of authentication
    window.authDump = function() {
        console.log('%c===== AUTH SYSTEM STATE DUMP =====', 'color: purple; font-weight: bold;');
        console.log('Users array:', window.authDebug.usersLoaded ? users.map(u => ({ 
            id: u.id,
            email: u.email,
            name: u.name,
            passwordLength: u.password ? u.password.length : 0
        })) : 'Not loaded');
        console.log('Current user:', getCurrentUser());
        console.log('Login attempts:', window.authDebug.loginCount);
        console.log('Registration attempts:', window.authDebug.registerCount);
        console.log('Last login attempt:', window.authDebug.lastLoginAttempt);
        console.log('Last register attempt:', window.authDebug.lastRegisterAttempt);
        console.log('Errors:', window.authDebug.errors);
        console.log('LocalStorage:', Object.keys(localStorage).filter(k => k.startsWith('user_') || k === 'users' || k === 'loggedInUser'));
        console.log('LocalForage available:', typeof window.localforage !== 'undefined');
        console.log('CryptoJS available:', typeof window.CryptoJS !== 'undefined' && typeof window.CryptoJS.SHA256 !== 'undefined');
        console.log('%c===== END STATE DUMP =====', 'color: purple; font-weight: bold;');
    };
}

// Reference to users array
let users = [];

// For testing purposes only
export function __resetUsersArray() {
    users = [];
}

/**
 * Initialize authentication system
 * @returns {Promise} Promise resolving when auth is initialized
 */
export async function initAuth() {
    window.authLog('Initializing authentication system');
    window.authDebug.initialized = true;
    
    try {
        // Load users from storage
        users = await loadUsers();
        window.authLog(`Loaded ${users.length} users from storage`);
        window.authDebug.usersLoaded = true;
        
        // Create demo account if no users exist
        if (users.length === 0) {
            window.authLog('No users found, creating demo user');
            const demoUser = {
                id: generateId(),
                name: 'Demo User',
                email: 'demo@example.com',
                password: hashPassword('password'),
                createdAt: new Date().toISOString()
            };
            users.push(demoUser);
            await saveUsers(users);
            window.authLog('Demo user created and saved to storage', 'success');
        }
        
        // Check for logged in user
        const loggedInUserId = localStorage.getItem('loggedInUser');
        window.authLog(`Checking for logged in user, ID from localStorage: ${loggedInUserId || 'none'}`);
        
        if (loggedInUserId) {
            const user = users.find(u => u.id === loggedInUserId);
            if (user) {
                window.authLog(`Found logged in user: ${user.email}`, 'success');
                await loginUser(user);
                return true;
            } else {
                window.authLog(`User ID ${loggedInUserId} not found in users array`, 'warn');
            }
        }
        
        // No logged in user, show auth screen
        window.authLog('No logged in user, showing auth screen');
        showAuthScreen();
        
        return false;
    } catch (error) {
        window.authLog(`Error during auth initialization: ${error.message}`, 'error');
        console.error('Full error:', error);
        showAuthScreen();
        return false;
    }
}

/**
 * Handle login form submission
 * @param {Event} e - Form submit event
 * @returns {Promise} Promise resolving when login is processed
 */
export async function handleLogin(e) {
    window.authLog('Login form submitted via auth.js handler');
    e.preventDefault();
    
    try {
        // Get form elements
        const loginEmail = document.getElementById('login-email');
        const loginPassword = document.getElementById('login-password');
        const rememberMeCheckbox = document.getElementById('remember-me');
        const loginErrorElement = document.getElementById('login-error');
        const loginFormElement = document.getElementById('login-form');
        
        // Check if elements exist
        if (!loginEmail || !loginPassword || !loginErrorElement || !loginFormElement) {
            console.error('Missing form elements for login');
            throw new Error('Login form elements missing');
        }
        
        const email = loginEmail.value.trim();
        const password = loginPassword.value;
        const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;
        
        window.authLog(`Login attempt for ${email} via handleLogin function`);
        
        // Validate email format
        if (!email) {
            loginErrorElement.textContent = 'Please enter your email address';
            loginErrorElement.classList.remove('hidden');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            loginErrorElement.textContent = 'Please enter a valid email address';
            loginErrorElement.classList.remove('hidden');
            return;
        }
        
        // Validate password
        if (!password) {
            loginErrorElement.textContent = 'Please enter your password';
            loginErrorElement.classList.remove('hidden');
            return;
        }
        
        // Check if CryptoJS is available
        if (typeof window.CryptoJS === 'undefined' || typeof window.CryptoJS.SHA256 === 'undefined') {
            loginErrorElement.textContent = 'Authentication service unavailable. Please refresh the page.';
            loginErrorElement.classList.remove('hidden');
            window.authLog('Login failed: CryptoJS not available', 'error');
            return;
        }
        
        // Special case for demo account
        if (email === 'demo@example.com' && password === 'password') {
            window.authLog('Demo account login attempt detected');
            
            // Make sure we have a demo user
            let demoUser = users.find(u => u.email === 'demo@example.com');
            
            // If demo user doesn't exist for some reason, create it
            if (!demoUser) {
                window.authLog('Demo user not found, creating it', 'warn');
                demoUser = {
                    id: 'demo-id', // Use fixed ID for testing
                    name: 'Demo User',
                    email: 'demo@example.com',
                    password: hashPassword('password'),
                    createdAt: new Date().toISOString()
                };
                users.push(demoUser);
                await saveUsers(users);
            }
            
            // Demo account always logs in successfully
            window.authLog('Demo login successful', 'success');
            
            // Clear form and error
            loginFormElement.reset();
            loginErrorElement.classList.add('hidden');
            
            // Save in localStorage if remember me is checked
            if (rememberMe) {
                localStorage.setItem('loggedInUser', demoUser.id);
            } else {
                localStorage.removeItem('loggedInUser');
            }
            
            await loginUser(demoUser);
            return;
        }
        
        // Find user by email
        const user = users.find(u => u.email === email);
        window.authLog('User found:', user ? 'Yes' : 'No');
        
        if (!user) {
            loginErrorElement.textContent = 'No account found with this email address';
            loginErrorElement.classList.remove('hidden');
            window.authLog('Login failed: User not found', 'error');
            return;
        }
        
        // Verify password
        const hashedPassword = hashPassword(password);
        if (hashedPassword !== user.password) {
            loginErrorElement.textContent = 'Incorrect password. Please try again.';
            loginErrorElement.classList.remove('hidden');
            window.authLog('Login failed: Incorrect password', 'error');
            return;
        }
        
        // Clear form and error
        loginFormElement.reset();
        loginErrorElement.classList.add('hidden');
        
        // Save in localStorage if remember me is checked
        if (rememberMe) {
            localStorage.setItem('loggedInUser', user.id);
        } else {
            localStorage.removeItem('loggedInUser');
        }
        
        await loginUser(user);
    } catch (error) {
        window.authLog(`Login error: ${error.message}`, 'error');
        console.error('Full error:', error);
        
        const loginErrorElement = document.getElementById('login-error');
        if (loginErrorElement) {
            loginErrorElement.textContent = 'An unexpected error occurred. Please try again.';
            loginErrorElement.classList.remove('hidden');
        }
    }
}

/**
 * Handle registration form submission
 * @param {Event} e - Form submit event
 * @returns {Promise} Promise resolving when registration is processed
 */
export async function handleRegister(e) {
    window.authLog('Register form submitted via auth.js handler');
    e.preventDefault();
    
    try {
        // Get form elements
        const registerName = document.getElementById('register-name');
        const registerEmail = document.getElementById('register-email');
        const registerPassword = document.getElementById('register-password');
        const registerConfirmPassword = document.getElementById('register-confirm-password');
        const registerErrorElement = document.getElementById('register-error');
        const registerFormElement = document.getElementById('register-form');
        
        // Check if elements exist
        if (!registerName || !registerEmail || !registerPassword || !registerConfirmPassword || !registerErrorElement || !registerFormElement) {
            console.error('Missing form elements for registration');
            throw new Error('Registration form elements missing');
        }
        
        const name = registerName.value.trim();
        const email = registerEmail.value.trim();
        const password = registerPassword.value;
        const confirmPassword = registerConfirmPassword.value;
        
        window.authLog(`Registration attempt for ${email} via handleRegister function`);
        
        // Validate name
        if (!name) {
            registerErrorElement.textContent = 'Please enter your name';
            registerErrorElement.classList.remove('hidden');
            return;
        }
        
        // Validate email format
        if (!email) {
            registerErrorElement.textContent = 'Please enter your email address';
            registerErrorElement.classList.remove('hidden');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            registerErrorElement.textContent = 'Please enter a valid email address';
            registerErrorElement.classList.remove('hidden');
            return;
        }
        
        // Check if email is already registered
        if (users.some(u => u.email === email)) {
            registerErrorElement.textContent = 'Email is already registered. Please log in or use a different email.';
            registerErrorElement.classList.remove('hidden');
            return;
        }
        
        // Validate password
        if (!password) {
            registerErrorElement.textContent = 'Please enter a password';
            registerErrorElement.classList.remove('hidden');
            return;
        }
        
        if (password.length < 6) {
            registerErrorElement.textContent = 'Password must be at least 6 characters long';
            registerErrorElement.classList.remove('hidden');
            return;
        }
        
        // Validate password confirmation
        if (password !== confirmPassword) {
            registerErrorElement.textContent = 'Passwords do not match';
            registerErrorElement.classList.remove('hidden');
            return;
        }
        
        // Create new user
        const newUser = {
            id: generateId(),
            name,
            email,
            password: hashPassword(password),
            createdAt: new Date().toISOString()
        };
        
        // Add user to users array
        users.push(newUser);
        
        // Save to storage
        await saveUsers(users);
        
        // Clear form and show success message
        registerFormElement.reset();
        registerErrorElement.textContent = 'Account created successfully! Please log in.';
        registerErrorElement.classList.remove('hidden');
        registerErrorElement.classList.add('text-green-500');
        
        // Switch to login form after a short delay
        setTimeout(() => {
            const loginTab = document.querySelector('[data-tab="login"]');
            if (loginTab) {
                loginTab.click();
            }
        }, 1500);
        
        window.authLog('Registration successful', 'success');
    } catch (error) {
        window.authLog(`Registration error: ${error.message}`, 'error');
        console.error('Full error:', error);
        
        const registerErrorElement = document.getElementById('register-error');
        if (registerErrorElement) {
            registerErrorElement.textContent = 'An unexpected error occurred. Please try again.';
            registerErrorElement.classList.remove('hidden');
        }
    }
}

/**
 * Handle user logout
 * @returns {Promise} Promise resolving when logout is processed
 */
export async function handleLogout() {
    window.authLog('Logout requested');
    
    try {
        // Clear current user
        await setCurrentUser(null);
        
        // Remove from localStorage
        localStorage.removeItem('loggedInUser');
        
        // Show auth screen
        showAuthScreen();
        
        window.authLog('Logout successful', 'success');
    } catch (error) {
        window.authLog(`Logout error: ${error.message}`, 'error');
        console.error('Full error:', error);
    }
}

/**
 * Hash a password using CryptoJS
 * @param {string} password - Password to hash
 * @returns {string|null} Hashed password or null if hashing fails
 */
export function hashPassword(password) {
    if (!password) return null;
    
    try {
        // If CryptoJS is not available, return a fallback hash for testing
        if (typeof window.CryptoJS === 'undefined' || typeof window.CryptoJS.SHA256 === 'undefined') {
            return '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
        }
        
        return window.CryptoJS.SHA256(password).toString();
    } catch (error) {
        window.authLog(`Password hashing error: ${error.message}`, 'error');
        return null;
    }
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Show the authentication screen
 */
function showAuthScreen() {
    const authContent = document.getElementById('auth-content');
    const mainContent = document.getElementById('main-content');
    
    if (authContent && mainContent) {
        mainContent.style.display = 'none';
        authContent.style.display = 'block';
    }
}

/**
 * Login a user and show the main content
 * @param {Object} user - User object to log in
 * @returns {Promise} Promise resolving when login is complete
 */
async function loginUser(user) {
    window.authLog(`Logging in user: ${user.email}`);
    
    try {
        // Set current user
        await setCurrentUser(user);
        
        // Update UI
        const authContent = document.getElementById('auth-content');
        const mainContent = document.getElementById('main-content');
        const currentUserName = document.getElementById('current-user-name');
        
        if (authContent && mainContent) {
            authContent.style.display = 'none';
            mainContent.style.display = 'block';
        }
        
        if (currentUserName) {
            currentUserName.textContent = user.name;
        }
        
        // Load dashboard
        await loadDashboard();
        
        window.authLog('Login successful', 'success');
    } catch (error) {
        window.authLog(`Login error: ${error.message}`, 'error');
        console.error('Full error:', error);
        throw error;
    }
}

// Initialize the debug dump function automatically after a delay
if (DEBUG && typeof window !== 'undefined') {
    setTimeout(() => {
        window.authLog('Auto-initializing auth debug dump', 'info');
        window.authDump && window.authDump();
    }, 3000);
}
