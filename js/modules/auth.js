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
                // User is logged in
                await loginUser(user);
                return true;
            } else {
                window.authLog(`User ID ${loggedInUserId} not found in users array`, 'warn');
            }
        }
        
        // No logged in user, show auth screen
        window.authLog('No logged in user, showing auth screen');
        
        // Show auth content directly
        const authContent = document.getElementById('auth-content');
        const mainContent = document.getElementById('main-content');
        if (authContent && mainContent) {
            mainContent.style.display = 'none';
            authContent.style.display = 'block';
            window.authLog('Auth screen shown via direct DOM manipulation', 'success');
        } else {
            window.authLog('Could not find auth-content or main-content elements', 'error');
        }
        
        return false;
    } catch (error) {
        window.authLog(`Error during auth initialization: ${error.message}`, 'error');
        console.error('Full error:', error);
        
        // Still try to show auth screen in case of error
        try {
            const authContent = document.getElementById('auth-content');
            const mainContent = document.getElementById('main-content');
            if (authContent && mainContent) {
                mainContent.style.display = 'none';
                authContent.style.display = 'block';
                window.authLog('Auth screen shown via direct DOM manipulation after error', 'warn');
            }
        } catch (fallbackError) {
            window.authLog(`Failed to show auth screen: ${fallbackError.message}`, 'error');
        }
        
        return false;
    }
}

/**
 * Handle login form submission
 * @param {Event} e - Form submit event
 * @returns {Promise} Promise resolving when login is processed
 */
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
        
        window.authLog('Form elements found:', loginEmail && loginPassword ? 'Yes' : 'No');
        
        if (!loginEmail || !loginPassword || !loginErrorElement || !loginFormElement) {
            window.authLog('Missing form elements for login', 'error');
            return;
        }
        
        const email = loginEmail.value;
        const password = loginPassword.value;
        const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;
        
        window.authLog(`Login attempt for ${email} via handleLogin function`);
        window.authDebug.loginCount++;
        window.authDebug.lastLoginAttempt = { email, time: new Date().toISOString() };
        
        // Handle empty credentials
        if (!email || !password) {
            loginErrorElement.textContent = 'Please enter email and password';
            loginErrorElement.classList.remove('hidden');
            window.authLog('Login failed: Empty credentials', 'error');
            return;
        }
        
        // Find user by email
        const user = users.find(u => u.email === email);
        window.authLog('User found:', user ? 'Yes' : 'No');
        
        // Special case for demo account - make it easy to log in but still secure
        if (email === 'demo@example.com') {
            window.authLog('Demo account login attempt detected');
            
            // Make sure we have a demo user
            let demoUser = users.find(u => u.email === 'demo@example.com');
            
            // If demo user doesn't exist for some reason, create it
            if (!demoUser) {
                window.authLog('Demo user not found, creating it', 'warn');
                demoUser = {
                    id: generateId(),
                    name: 'Demo User',
                    email: 'demo@example.com',
                    password: hashPassword('password'),
                    createdAt: new Date().toISOString()
                };
                users.push(demoUser);
                await saveUsers(users);
            }
            
            // Only allow demo login with correct password
            if (password === 'password') {
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
        }
        
        // Regular user login flow
        if (!user) {
            loginErrorElement.textContent = 'Invalid email or password';
            loginErrorElement.classList.remove('hidden');
            window.authLog('Login failed: User not found', 'error');
            return;
        }
        
        // Hash password for comparison
        const hashedPassword = hashPassword(password);
        
        if (hashedPassword === null) {
            loginErrorElement.textContent = 'Authentication error. Please try again.';
            loginErrorElement.classList.remove('hidden');
            window.authLog('Login failed: Password hashing error', 'error');
            return;
        }
        
        window.authLog(`Password hash: ${hashedPassword.substring(0, 10)}...`);
        window.authLog(`Stored hash: ${user.password.substring(0, 10)}...`);
        
        if (user.password !== hashedPassword) {
            loginErrorElement.textContent = 'Invalid email or password';
            loginErrorElement.classList.remove('hidden');
            window.authLog('Login failed: Invalid credentials', 'error');
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
        
        window.authLog(`Login successful for user: ${user.email}`, 'success');
        
        // Log in the user
        await loginUser(user);
    } catch (error) {
        window.authLog(`Error during login: ${error.message}`, 'error');
        console.error('Full error:', error);
        
        // Show error to user
        const loginErrorElement = document.getElementById('login-error');
        if (loginErrorElement) {
            loginErrorElement.textContent = 'An unexpected error occurred. Please try again.';
            loginErrorElement.classList.remove('hidden');
        }
    }
}

/**
 * Handle register form submission
 * @param {Event} e - Form submit event
 * @returns {Promise} Promise resolving when registration is processed
 */
export async function handleRegister(e) {
    window.authLog('Register form submitted via auth.js handler');
    e.preventDefault();
    
    try {
        // Get form elements
        const nameInput = document.getElementById('register-name');
        const emailInput = document.getElementById('register-email');
        const passwordInput = document.getElementById('register-password');
        const confirmPasswordInput = document.getElementById('register-confirm-password');
        const registerErrorElement = document.getElementById('register-error');
        const registerFormElement = document.getElementById('register-form');
        const loginTabElement = document.getElementById('login-tab');
        
        window.authLog('Form elements found:', nameInput && emailInput ? 'Yes' : 'No');
        
        if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput || 
            !registerErrorElement || !registerFormElement || !loginTabElement) {
            window.authLog('Missing form elements for registration', 'error');
            return;
        }
        
        const name = nameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        window.authLog(`Register attempt for ${email}`);
        window.authDebug.registerCount++;
        window.authDebug.lastRegisterAttempt = { name, email, time: new Date().toISOString() };
        
        // Clear any previous styling
        registerErrorElement.classList.remove('text-green-500');
        
        // Check if passwords match
        if (password !== confirmPassword) {
            registerErrorElement.textContent = 'Passwords do not match';
            registerErrorElement.classList.remove('hidden');
            window.authLog('Registration failed: Passwords do not match', 'error');
            return;
        }
        
        // Check if email already exists
        if (users.some(u => u.email === email)) {
            registerErrorElement.textContent = 'Email is already registered';
            registerErrorElement.classList.remove('hidden');
            window.authLog('Registration failed: Email already exists', 'error');
            return;
        }
        
        // Create new user
        const userId = generateId();
        const newUser = {
            id: userId,
            name: name,
            email: email,
            password: hashPassword(password),
            createdAt: new Date().toISOString()
        };
        
        window.authLog(`Creating new user: ${email} with ID: ${userId}`);
        
        // Add user to users array and save to storage
        users.push(newUser);
        await saveUsers(users);
        
        window.authLog(`User saved to storage, users array now has ${users.length} users`, 'success');
        
        // Clear form and error
        registerFormElement.reset();
        
        // Display success message and switch to login tab
        registerErrorElement.textContent = 'Account created successfully! Please log in.';
        registerErrorElement.classList.remove('hidden');
        registerErrorElement.classList.add('text-green-500');
        
        window.authLog('Registration successful', 'success');
        
        // Switch to login tab
        setTimeout(() => {
            loginTabElement.click();
            window.authLog('Switched to login tab after register', 'success');
            
            // Pre-fill email for convenience
            const loginEmail = document.getElementById('login-email');
            if (loginEmail) loginEmail.value = email;
        }, 1000);
    } catch (error) {
        window.authLog(`Error during registration: ${error.message}`, 'error');
        console.error('Full error:', error);
    }
}

/**
 * Login user and load their data
 * @param {Object} user - User object to log in
 * @returns {Promise} Promise resolving when user is logged in
 */
export async function loginUser(user) {
    try {
        window.authLog(`Logging in user: ${user.email}`);
        
        // Set current user in storage
        setCurrentUser(user);
        
        // Update UI with user name
        const userNameEl = document.getElementById('current-user-name');
        if (userNameEl) {
            userNameEl.textContent = user.name;
            window.authLog('Updated user name in header', 'success');
        } else {
            window.authLog('Could not find user-name element in DOM', 'error');
        }
        
        // Hide auth screen and show main content
        const authContent = document.getElementById('auth-content');
        const mainContent = document.getElementById('main-content');
        
        if (authContent && mainContent) {
            authContent.style.display = 'none';
            mainContent.style.display = 'block';
            window.authLog('Auth screen hidden, main content shown', 'success');
        } else {
            window.authLog('Could not find auth-content or main-content elements', 'error');
        }
        
        // Load dashboard data
        window.authLog('Loading dashboard data...');
        try {
            await loadDashboard();
            window.authLog('Dashboard loaded successfully', 'success');
        } catch (error) {
            window.authLog(`Error loading dashboard: ${error.message}`, 'error');
        }
    } catch (error) {
        window.authLog(`Error during user login: ${error.message}`, 'error');
        console.error('Full error:', error);
    }
}

/**
 * Handle logout
 */
export async function handleLogout() {
    window.authLog('Logging out user');
    
    // Clear current user
    setCurrentUser(null);
    
    // Remove from localStorage
    localStorage.removeItem('loggedInUser');
    
    // Switch to auth screen
    const authContent = document.getElementById('auth-content');
    const mainContent = document.getElementById('main-content');
    
    if (authContent && mainContent) {
        mainContent.style.display = 'none';
        authContent.style.display = 'block';
        window.authLog('Logged out, auth screen shown', 'success');
    } else {
        window.authLog('Could not find auth-content or main-content elements', 'error');
    }
}

/**
 * Hash password using SHA-256
 * @param {string} password - Plain text password
 * @returns {string|null} Hashed password or null if error
 */
export function hashPassword(password) {
    try {
        if (!password) {
            window.authLog('Empty password passed to hashPassword', 'error');
            return null;
        }
        
        // Check if CryptoJS is available
        if (typeof window.CryptoJS === 'undefined' || !window.CryptoJS.SHA256) {
            window.authLog('CryptoJS is not available for password hashing', 'error');
            
            // Special case for demo account to make sure it works
            if (password === 'password') {
                window.authLog('Using fallback hash for demo password', 'warn');
                return '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'; // SHA-256 of 'password'
            }
            
            return null;
        }
        
        // Standard path - hash the password
        const hash = window.CryptoJS.SHA256(password).toString();
        window.authLog(`Password hash generated: ${hash.substring(0, 10)}...`);
        return hash;
    } catch (error) {
        window.authLog(`Error hashing password: ${error.message}`, 'error');
        console.error('Full error:', error);
        
        // Special case for demo account to ensure it works
        if (password === 'password') {
            window.authLog('Using fallback hash for demo password after error', 'warn');
            return '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
        }
        
        return null;
    }
}

/**
 * Update user information
 * @param {Object} userData - Updated user data
 * @returns {Promise<boolean>} Promise resolving when user is updated
 */
export async function updateUserProfile(userData) {
    try {
        window.authLog(`Updating user profile: ${JSON.stringify(userData)}`);
        
        const currentUser = getCurrentUser();
        if (!currentUser) {
            window.authLog('No current user, cannot update profile', 'error');
            return false;
        }
        
        // Find user in users array
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex === -1) {
            window.authLog(`User with ID ${currentUser.id} not found in users array`, 'error');
            return false;
        }
        
        // Update fields
        Object.assign(users[userIndex], userData);
        
        // Save updated users
        await saveUsers(users);
        window.authLog('User profile updated and saved to storage', 'success');
        
        // Update current user
        setCurrentUser(users[userIndex]);
        
        return true;
    } catch (error) {
        window.authLog(`Error updating user profile: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Delete user account
 * @returns {Promise<boolean>} Promise resolving with success status
 */
export async function deleteUserAccount() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            window.authLog('No current user, cannot delete account', 'error');
            return false;
        }
        
        window.authLog(`Deleting account for user: ${currentUser.email}`);
        
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex === -1) {
            window.authLog(`User with ID ${currentUser.id} not found in users array`, 'error');
            return false;
        }
        
        // Remove user from users array
        users.splice(userIndex, 1);
        await saveUsers(users);
        window.authLog('User removed from users array and saved to storage', 'success');
        
        // Remove user data
        await removeUserData(currentUser.id);
        window.authLog(`User data removed for ID: ${currentUser.id}`, 'success');
        
        // Log out
        await handleLogout();
        
        return true;
    } catch (error) {
        window.authLog(`Error deleting user account: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Initialize the debug dump function automatically after a delay
if (DEBUG && typeof window !== 'undefined') {
    setTimeout(() => {
        window.authLog('Auto-initializing auth debug dump', 'info');
        window.authDump && window.authDump();
    }, 3000);
}
