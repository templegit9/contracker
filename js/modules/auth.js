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
    // Load users from storage
    users = await loadUsers();
    
    // Create demo account if no users exist
    if (users.length === 0) {
        const demoUser = {
            id: generateId(),
            name: 'Demo User',
            email: 'demo@example.com',
            password: hashPassword('password'),
            createdAt: new Date().toISOString()
        };
        users.push(demoUser);
        await saveUsers(users);
    }
    
    // Check for logged in user
    const loggedInUserId = localStorage.getItem('loggedInUser');
    if (loggedInUserId) {
        const user = users.find(u => u.id === loggedInUserId);
        if (user) {
            // User is logged in
            await loginUser(user);
            return true;
        }
    }
    
    // No logged in user, show auth screen
    showAuth();
    return false;
}

/**
 * Handle login form submission
 * @param {Event} e - Form submit event
 * @returns {Promise} Promise resolving when login is processed
 */
export async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    console.log('Login attempt:', email, password); // Debug
    
    // Find user by email
    const user = users.find(u => u.email === email);
    console.log('Found user:', user); // Debug
    
    if (!user || user.password !== hashPassword(password)) {
        const loginError = document.getElementById('login-error');
        loginError.textContent = 'Invalid email or password';
        loginError.classList.remove('hidden');
        console.log('Hash comparison:', user?.password, hashPassword(password)); // Debug
        return;
    }
    
    // Clear form and error
    document.getElementById('login-form').reset();
    document.getElementById('login-error').classList.add('hidden');
    
    // Save in localStorage if remember me is checked
    if (rememberMe) {
        localStorage.setItem('loggedInUser', user.id);
    } else {
        localStorage.removeItem('loggedInUser');
    }
    
    // Log in the user
    await loginUser(user);
}

/**
 * Handle register form submission
 * @param {Event} e - Form submit event
 * @returns {Promise} Promise resolving when registration is processed
 */
export async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const registerError = document.getElementById('register-error');
    
    // Check if passwords match
    if (password !== confirmPassword) {
        registerError.textContent = 'Passwords do not match';
        registerError.classList.remove('hidden');
        return;
    }
    
    // Check if email already exists
    if (users.some(u => u.email === email)) {
        registerError.textContent = 'Email is already registered';
        registerError.classList.remove('hidden');
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
    
    // Add user to users array and save to storage
    users.push(newUser);
    await saveUsers(users);
    
    // Clear form and error
    document.getElementById('register-form').reset();
    registerError.classList.add('hidden');
    
    // Display success message and switch to login tab
    registerError.textContent = 'Account created successfully! Please log in.';
    registerError.classList.remove('hidden');
    registerError.classList.add('text-green-500');
    
    // Switch to login tab
    document.getElementById('login-tab').click();
}

/**
 * Login user and load their data
 * @param {Object} user - User object to log in
 * @returns {Promise} Promise resolving when user is logged in
 */
export async function loginUser(user) {
    setCurrentUser(user);
    
    // Update UI
    const userNameEl = document.getElementById('current-user-name');
    if (userNameEl) {
        userNameEl.textContent = user.name;
    }
    
    hideAuth();
    await loadDashboard();
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
    return CryptoJS.SHA256(password).toString();
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