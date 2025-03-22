/**
 * Authentication module for Platform Engagement Tracker
 */

import { setCurrentUser, getCurrentUser, saveUsers, loadUsers, removeUserData } from './storage.js';
import { loadDashboard } from '../components/dashboard.js';
import { showAuth, hideAuth } from '../components/auth-ui.js';

// Reference to users array
let users = [];

/**
 * Initialize authentication system
 * @returns {Promise} Promise resolving when auth is initialized
 */
export async function initAuth() {
    console.log('Initializing authentication system');
    
    try {
        // Load users from storage
        users = await loadUsers();
        console.log('Loaded users:', users.length);
        
        // Create demo account if no users exist
        if (users.length === 0) {
            console.log('Creating demo user');
            const demoUser = {
                id: generateId(),
                name: 'Demo User',
                email: 'demo@example.com',
                password: hashPassword('password'),
                createdAt: new Date().toISOString()
            };
            users.push(demoUser);
            await saveUsers(users);
            console.log('Demo user created');
        }
        
        // Check for logged in user
        const loggedInUserId = localStorage.getItem('loggedInUser');
        console.log('Logged in user ID from localStorage:', loggedInUserId);
        
        if (loggedInUserId) {
            const user = users.find(u => u.id === loggedInUserId);
            if (user) {
                console.log('Found logged in user:', user.email);
                // User is logged in
                await loginUser(user);
                return true;
            } else {
                console.log('User ID not found in users array');
            }
        }
        
        // No logged in user, show auth screen
        console.log('No logged in user, showing auth screen');
        showAuth();
        return false;
    } catch (error) {
        console.error('Error during auth initialization:', error);
        // Still show auth screen in case of error
        showAuth();
        return false;
    }
}

/**
 * Handle login form submission
 * @param {Event} e - Form submit event
 * @returns {Promise} Promise resolving when login is processed
 */
export async function handleLogin(e) {
    e.preventDefault();
    
    try {
        const loginEmail = document.getElementById('login-email');
        const loginPassword = document.getElementById('login-password');
        const rememberMeCheckbox = document.getElementById('remember-me');
        const loginErrorElement = document.getElementById('login-error');
        const loginFormElement = document.getElementById('login-form');
        
        if (!loginEmail || !loginPassword || !loginErrorElement || !loginFormElement) {
            console.error('Missing form elements for login');
            return;
        }
        
        const email = loginEmail.value;
        const password = loginPassword.value;
        const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;
        
        console.log('Login attempt:', email); // Debug (don't log password)
        
        // Find user by email
        const user = users.find(u => u.email === email);
        console.log('Found user:', user ? 'Yes' : 'No'); // Debug (don't log user data)
        
        if (!user || user.password !== hashPassword(password)) {
            loginErrorElement.textContent = 'Invalid email or password';
            loginErrorElement.classList.remove('hidden');
            console.log('Login failed: Invalid credentials');
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
        
        console.log('Login successful for user:', user.email);
        
        // Log in the user
        await loginUser(user);
    } catch (error) {
        console.error('Error during login:', error);
    }
}

/**
 * Handle register form submission
 * @param {Event} e - Form submit event
 * @returns {Promise} Promise resolving when registration is processed
 */
export async function handleRegister(e) {
    e.preventDefault();
    
    try {
        const nameInput = document.getElementById('register-name');
        const emailInput = document.getElementById('register-email');
        const passwordInput = document.getElementById('register-password');
        const confirmPasswordInput = document.getElementById('register-confirm-password');
        const registerErrorElement = document.getElementById('register-error');
        const registerFormElement = document.getElementById('register-form');
        const loginTabElement = document.getElementById('login-tab');
        
        if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput || 
            !registerErrorElement || !registerFormElement || !loginTabElement) {
            console.error('Missing form elements for registration');
            return;
        }
        
        const name = nameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Clear any previous styling
        registerErrorElement.classList.remove('text-green-500');
        
        // Check if passwords match
        if (password !== confirmPassword) {
            registerErrorElement.textContent = 'Passwords do not match';
            registerErrorElement.classList.remove('hidden');
            return;
        }
        
        // Check if email already exists
        if (users.some(u => u.email === email)) {
            registerErrorElement.textContent = 'Email is already registered';
            registerErrorElement.classList.remove('hidden');
            return;
        }
        
        // Create new user
        const newUser = {
            id: generateId(),
            name: name,
            email: email,
            password: hashPassword(password),
            createdAt: new Date().toISOString()
        };
        
        console.log('Creating new user:', email);
        
        // Add user to users array and save to storage
        users.push(newUser);
        await saveUsers(users);
        
        // Clear form and error
        registerFormElement.reset();
        
        // Display success message and switch to login tab
        registerErrorElement.textContent = 'Account created successfully! Please log in.';
        registerErrorElement.classList.remove('hidden');
        registerErrorElement.classList.add('text-green-500');
        
        console.log('Registration successful');
        
        // Switch to login tab
        loginTabElement.click();
    } catch (error) {
        console.error('Error during registration:', error);
    }
}

/**
 * Login user and load their data
 * @param {Object} user - User object to log in
 * @returns {Promise} Promise resolving when user is logged in
 */
export async function loginUser(user) {
    try {
        console.log('Logging in user:', user.email);
        
        // Set current user in storage
        setCurrentUser(user);
        
        // Update UI with user name
        const userNameEl = document.getElementById('current-user-name');
        if (userNameEl) {
            userNameEl.textContent = user.name;
            console.log('Updated user name in header');
        } else {
            console.error('Could not find user-name element in DOM');
        }
        
        // Hide auth screen and show main content
        hideAuth();
        
        // Load dashboard data
        console.log('Loading dashboard data...');
        try {
            await loadDashboard();
            console.log('Dashboard loaded successfully');
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    } catch (error) {
        console.error('Error during user login:', error);
    }
}

/**
 * Handle logout
 */
export function handleLogout() {
    // Clear current user
    setCurrentUser(null);
    
    // Remove from localStorage
    localStorage.removeItem('loggedInUser');
    
    // Switch to auth screen
    showAuth();
}

/**
 * Hash password using SHA-256
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
export function hashPassword(password) {
    try {
        if (!password) {
            console.error('Empty password passed to hashPassword');
            return '';
        }
        
        // Check if window is defined (browser environment)
        if (typeof window === 'undefined') {
            console.error('hashPassword: window is not defined');
            return 'HASH_ERROR';
        }
        
        // Check if CryptoJS is available
        if (typeof window.CryptoJS === 'undefined' || !window.CryptoJS.SHA256) {
            console.error('CryptoJS is not available for password hashing');
            return 'HASH_ERROR';
        }
        
        const hash = window.CryptoJS.SHA256(password).toString();
        // Debug: Log the first 6 characters of the hash for debugging
        console.log('Password hash generated:', hash.substring(0, 6) + '...');
        return hash;
    } catch (error) {
        console.error('Error hashing password:', error);
        return 'HASH_ERROR';
    }
}

/**
 * Update user information
 * @param {Object} userData - Updated user data
 * @returns {Promise} Promise resolving when user is updated
 */
export async function updateUserProfile(userData) {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    // Find user in users array
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return false;
    
    // Update fields
    Object.assign(users[userIndex], userData);
    
    // Save updated users
    await saveUsers(users);
    
    // Update current user
    setCurrentUser(users[userIndex]);
    
    return true;
}

/**
 * Delete user account
 * @returns {Promise<boolean>} Promise resolving with success status
 */
export async function deleteUserAccount() {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex === -1) return false;
    
    // Remove user from users array
    users.splice(userIndex, 1);
    await saveUsers(users);
    
    // Remove user data
    await removeUserData(currentUser.id);
    
    // Log out
    handleLogout();
    
    return true;
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// removeUserData is now imported from storage.js