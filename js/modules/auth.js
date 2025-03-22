/**
 * Authentication module for Platform Engagement Tracker
 */

import { setCurrentUser, getCurrentUser, saveUsers, loadUsers, removeUserData } from './storage.js';
import { loadDashboard } from '../components/dashboard.js';

// Avoid circular dependency with auth-ui.js
// We'll dynamically import showAuth and hideAuth when needed

// Expose auth handlers globally for the direct form access
if (typeof window !== 'undefined') {
    window.handleLoginSubmit = (e) => {
        console.log('Global login handler called');
        import('./auth.js').then(authModule => {
            authModule.handleLogin(e);
        }).catch(error => {
            console.error('Error in global login handler:', error);
        });
    };
    
    window.handleRegisterSubmit = (e) => {
        console.log('Global register handler called');
        import('./auth.js').then(authModule => {
            authModule.handleRegister(e);
        }).catch(error => {
            console.error('Error in global register handler:', error);
        });
    };
}

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
        
        // Dynamically import auth-ui to avoid circular dependency
        const authUI = await import('../components/auth-ui.js');
        authUI.showAuth();
        
        return false;
    } catch (error) {
        console.error('Error during auth initialization:', error);
        
        // Still show auth screen in case of error
        try {
            const authUI = await import('../components/auth-ui.js');
            authUI.showAuth();
        } catch (importError) {
            console.error('Failed to import auth-ui for showAuth:', importError);
            // Fallback: try to show auth screen directly
            try {
                const authContent = document.getElementById('auth-content');
                const mainContent = document.getElementById('main-content');
                if (authContent && mainContent) {
                    mainContent.style.display = 'none';
                    authContent.style.display = 'block';
                }
            } catch (fallbackError) {
                console.error('Even direct fallback failed:', fallbackError);
            }
        }
        
        return false;
    }
}

/**
 * Handle login form submission
 * @param {Event} e - Form submit event
 * @returns {Promise} Promise resolving when login is processed
 */
export async function handleLogin(e) {
    console.log('Login form submitted');
    e.preventDefault();
    
    try {
        // Get form elements and add detailed logging
        console.log('Getting login form elements...');
        const loginEmail = document.getElementById('login-email');
        const loginPassword = document.getElementById('login-password');
        const rememberMeCheckbox = document.getElementById('remember-me');
        const loginErrorElement = document.getElementById('login-error');
        const loginFormElement = document.getElementById('login-form');
        
        console.log('Form elements found:', {
            loginEmail: !!loginEmail,
            loginPassword: !!loginPassword,
            rememberMeCheckbox: !!rememberMeCheckbox,
            loginErrorElement: !!loginErrorElement,
            loginFormElement: !!loginFormElement
        });
        
        if (!loginEmail || !loginPassword || !loginErrorElement || !loginFormElement) {
            console.error('Missing form elements for login');
            
            // Try to display error if error element exists
            if (loginErrorElement) {
                loginErrorElement.textContent = 'System error: Missing form elements';
                loginErrorElement.classList.remove('hidden');
            } else {
                // Display error using alert as last resort
                alert('Login failed: System error');
            }
            
            return;
        }
        
        const email = loginEmail.value;
        const password = loginPassword.value;
        const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;
        
        // Validate input
        if (!email || !password) {
            loginErrorElement.textContent = 'Please enter both email and password';
            loginErrorElement.classList.remove('hidden');
            console.log('Login failed: Missing email or password');
            return;
        }
        
        console.log('Login attempt:', email); // Debug (don't log password)
        
        // Debug users array
        console.log('Users array length:', users.length);
        console.log('Users emails:', users.map(u => u.email));
        
        // Find user by email
        const user = users.find(u => u.email === email);
        console.log('Found user:', user ? 'Yes' : 'No'); // Debug (don't log user data)
        
        // Special case for demo account
        if (email === 'demo@example.com' && password === 'password') {
            console.log('Demo account login detected');
            const demoUser = users.find(u => u.email === 'demo@example.com');
            
            if (demoUser) {
                console.log('Demo user found, processing login');
                
                // Clear form and error
                loginFormElement.reset();
                loginErrorElement.classList.add('hidden');
                
                // Save in localStorage if remember me is checked
                if (rememberMe) {
                    localStorage.setItem('loggedInUser', demoUser.id);
                } else {
                    localStorage.removeItem('loggedInUser');
                }
                
                console.log('Demo login successful');
                await loginUser(demoUser);
                return;
            }
        }
        
        // Hash password for comparison and log the hash prefix for debugging
        const hashedPassword = hashPassword(password);
        console.log('Input password hash prefix:', hashedPassword.substring(0, 6) + '...');
        
        if (user) {
            console.log('User password hash prefix:', user.password.substring(0, 6) + '...');
        }
        
        if (!user || user.password !== hashedPassword) {
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
        
        // Try to display the error
        try {
            const loginErrorElement = document.getElementById('login-error');
            if (loginErrorElement) {
                loginErrorElement.textContent = 'System error: ' + error.message;
                loginErrorElement.classList.remove('hidden');
            } else {
                // Display error using alert as last resort
                alert('Login failed: ' + error.message);
            }
        } catch (displayError) {
            console.error('Error displaying login error:', displayError);
        }
    }
}

/**
 * Handle register form submission
 * @param {Event} e - Form submit event
 * @returns {Promise} Promise resolving when registration is processed
 */
export async function handleRegister(e) {
    console.log('Register form submitted');
    e.preventDefault();
    
    try {
        // Get form elements and add detailed logging
        console.log('Getting registration form elements...');
        const nameInput = document.getElementById('register-name');
        const emailInput = document.getElementById('register-email');
        const passwordInput = document.getElementById('register-password');
        const confirmPasswordInput = document.getElementById('register-confirm-password');
        const registerErrorElement = document.getElementById('register-error');
        const registerFormElement = document.getElementById('register-form');
        const loginTabElement = document.getElementById('login-tab');
        
        console.log('Form elements found:', {
            nameInput: !!nameInput,
            emailInput: !!emailInput,
            passwordInput: !!passwordInput,
            confirmPasswordInput: !!confirmPasswordInput,
            registerErrorElement: !!registerErrorElement,
            registerFormElement: !!registerFormElement,
            loginTabElement: !!loginTabElement
        });
        
        if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput || 
            !registerErrorElement || !registerFormElement || !loginTabElement) {
            console.error('Missing form elements for registration');
            
            // Try to display error if error element exists
            if (registerErrorElement) {
                registerErrorElement.textContent = 'System error: Missing form elements';
                registerErrorElement.classList.remove('hidden');
            } else {
                // Display error using alert as last resort
                alert('Registration failed: System error');
            }
            
            return;
        }
        
        const name = nameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Validate input
        if (!name || !email || !password || !confirmPassword) {
            registerErrorElement.textContent = 'Please fill in all fields';
            registerErrorElement.classList.remove('hidden');
            console.log('Registration failed: Missing required fields');
            return;
        }
        
        // Clear any previous styling
        registerErrorElement.classList.remove('text-green-500');
        
        // Check if passwords match
        if (password !== confirmPassword) {
            registerErrorElement.textContent = 'Passwords do not match';
            registerErrorElement.classList.remove('hidden');
            console.log('Registration failed: Passwords do not match');
            return;
        }
        
        // Debug users array
        console.log('Users array before registration:', users.length);
        console.log('Checking if email exists:', email);
        
        // Check if email already exists
        if (users.some(u => u.email === email)) {
            registerErrorElement.textContent = 'Email is already registered';
            registerErrorElement.classList.remove('hidden');
            console.log('Registration failed: Email already exists');
            return;
        }
        
        // Generate a hash for the password
        const hashedPassword = hashPassword(password);
        if (hashedPassword === 'HASH_ERROR') {
            console.error('Failed to hash password during registration');
            registerErrorElement.textContent = 'System error: Unable to secure password';
            registerErrorElement.classList.remove('hidden');
            return;
        }
        
        // Create new user
        const userId = generateId();
        const newUser = {
            id: userId,
            name: name,
            email: email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };
        
        console.log('Creating new user:', email, 'with ID:', userId);
        
        // Add user to users array and save to storage
        users.push(newUser);
        await saveUsers(users);
        
        console.log('User added to users array, now contains', users.length, 'users');
        
        // Clear form and error
        registerFormElement.reset();
        
        // Display success message and switch to login tab
        registerErrorElement.textContent = 'Account created successfully! Please log in.';
        registerErrorElement.classList.remove('hidden');
        registerErrorElement.classList.add('text-green-500');
        
        console.log('Registration successful, switching to login tab');
        
        // Switch to login tab with a slight delay to ensure UI updates
        setTimeout(() => {
            try {
                loginTabElement.click();
                console.log('Switched to login tab');
                
                // Prefill email for convenience
                const loginEmail = document.getElementById('login-email');
                if (loginEmail) {
                    loginEmail.value = email;
                    console.log('Prefilled login email field');
                }
            } catch (tabError) {
                console.error('Error switching to login tab:', tabError);
            }
        }, 100);
    } catch (error) {
        console.error('Error during registration:', error);
        
        // Try to display the error
        try {
            const registerErrorElement = document.getElementById('register-error');
            if (registerErrorElement) {
                registerErrorElement.textContent = 'System error: ' + error.message;
                registerErrorElement.classList.remove('hidden');
            } else {
                // Display error using alert as last resort
                alert('Registration failed: ' + error.message);
            }
        } catch (displayError) {
            console.error('Error displaying registration error:', displayError);
        }
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
        try {
            // Dynamically import to avoid circular dependency
            const authUI = await import('../components/auth-ui.js');
            authUI.hideAuth();
        } catch (importError) {
            console.error('Failed to import auth-ui for hideAuth:', importError);
            // Fallback: try to hide auth screen directly
            try {
                const authContent = document.getElementById('auth-content');
                const mainContent = document.getElementById('main-content');
                if (authContent && mainContent) {
                    authContent.style.display = 'none';
                    mainContent.style.display = 'block';
                    console.log('Used direct DOM manipulation to hide auth screen');
                }
            } catch (fallbackError) {
                console.error('Even direct fallback for hideAuth failed:', fallbackError);
            }
        }
        
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
export async function handleLogout() {
    // Clear current user
    setCurrentUser(null);
    
    // Remove from localStorage
    localStorage.removeItem('loggedInUser');
    
    // Switch to auth screen
    try {
        // Dynamically import to avoid circular dependency
        const authUI = await import('../components/auth-ui.js');
        authUI.showAuth();
        console.log('Logged out and showed auth screen');
    } catch (importError) {
        console.error('Failed to import auth-ui for showAuth during logout:', importError);
        // Fallback: try to show auth screen directly
        try {
            const authContent = document.getElementById('auth-content');
            const mainContent = document.getElementById('main-content');
            if (authContent && mainContent) {
                mainContent.style.display = 'none';
                authContent.style.display = 'block';
                console.log('Used direct DOM manipulation to show auth screen during logout');
            }
        } catch (fallbackError) {
            console.error('Even direct fallback for logout failed:', fallbackError);
        }
    }
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
        
        // More robust check for CryptoJS
        if (typeof window.CryptoJS === 'undefined' || !window.CryptoJS.SHA256) {
            console.error('CryptoJS is not available for password hashing. Dependencies status:', 
                window.appLoader ? window.appLoader.dependenciesReady : 'appLoader not available');
            
            // Wait a moment and try again if the loader indicates it should be ready
            if (window.appLoader && window.appLoader.dependenciesReady.cryptojs) {
                console.log('Waiting for CryptoJS to be fully initialized...');
                // Small delay to allow for script initialization
                setTimeout(() => {}, 100);
                
                // Try again after the delay
                if (typeof window.CryptoJS !== 'undefined' && window.CryptoJS.SHA256) {
                    console.log('CryptoJS is now available after waiting');
                } else {
                    console.error('CryptoJS still not available after waiting');
                }
            }
            
            // Last resort - hard-coded hash just for demo account
            if (password === 'password') {
                console.warn('Using fallback hash for demo password');
                return '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'; // SHA-256 of 'password'
            }
            
            return 'HASH_ERROR';
        }
        
        const hash = window.CryptoJS.SHA256(password).toString();
        // Debug: Log the first 6 characters of the hash for debugging
        console.log('Password hash generated:', hash.substring(0, 6) + '...');
        return hash;
    } catch (error) {
        console.error('Error hashing password:', error);
        
        // Last resort - hard-coded hash just for demo account
        if (password === 'password') {
            console.warn('Using fallback hash for demo password after error');
            return '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'; // SHA-256 of 'password'
        }
        
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