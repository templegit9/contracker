/**
 * Unit tests for authentication system
 */

import { initAuth, handleLogin, handleRegister, hashPassword, loginUser, handleLogout, __resetUsersArray } from '../modules/auth.js';
import { setCurrentUser, getCurrentUser, saveUsers, loadUsers } from '../modules/storage.js';

// Mock dependencies
jest.mock('../modules/storage.js', () => ({
    setCurrentUser: jest.fn(),
    getCurrentUser: jest.fn(),
    saveUsers: jest.fn(),
    loadUsers: jest.fn(),
    saveUserData: jest.fn(),
    loadUserData: jest.fn(),
    loadAllUserData: jest.fn(),
    removeUserData: jest.fn()
}));

// Mock DOM elements
document.body.innerHTML = `
    <div id="auth-content">
        <form id="login-form">
            <input type="email" id="login-email">
            <input type="password" id="login-password">
            <input type="checkbox" id="remember-me">
            <div id="login-error" class="hidden"></div>
        </form>
        <form id="register-form" class="hidden">
            <input type="text" id="register-name">
            <input type="email" id="register-email">
            <input type="password" id="register-password">
            <input type="password" id="register-confirm-password">
            <div id="register-error" class="hidden"></div>
        </form>
    </div>
    <div id="main-content" style="display: none;">
        <span id="current-user-name">User</span>
    </div>
`;

// Mock CryptoJS
window.CryptoJS = {
    SHA256: jest.fn().mockImplementation((str) => ({
        toString: () => str === 'password' ? '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8' : 'test-hash'
    }))
};

// Mock window.authLog and window.authDebug
window.authLog = jest.fn();
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

describe('Authentication System', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        
        // Reset localStorage
        localStorage.clear();
        
        // Reset DOM elements
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('register-name').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm-password').value = '';
        
        // Reset display states
        document.getElementById('auth-content').style.display = 'block';
        document.getElementById('main-content').style.display = 'none';
        
        // Reset auth debug
        window.authDebug.errors = [];
        window.authDebug.loginCount = 0;
        window.authDebug.registerCount = 0;
        
        // Reset error elements
        const loginError = document.getElementById('login-error');
        const registerError = document.getElementById('register-error');
        loginError.textContent = '';
        registerError.textContent = '';
        loginError.classList.add('hidden');
        registerError.classList.add('hidden');
        registerError.classList.remove('text-green-500');
        
        // Reset users array in auth module
        __resetUsersArray();
        
        // Reset mock return values
        loadUsers.mockReset();
        loadUsers.mockResolvedValue([]);
        saveUsers.mockReset();
        saveUsers.mockResolvedValue(undefined);
        setCurrentUser.mockReset();
        setCurrentUser.mockResolvedValue(undefined);
    });

    describe('initAuth', () => {
        it('should initialize with demo user if no users exist', async () => {
            loadUsers.mockResolvedValue([]);
            
            await initAuth();
            
            expect(loadUsers).toHaveBeenCalled();
            expect(saveUsers).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    email: 'demo@example.com',
                    name: 'Demo User'
                })
            ]));
        });

        it('should load existing users without creating demo user', async () => {
            const existingUsers = [
                { id: '1', email: 'test@example.com', name: 'Test User' }
            ];
            loadUsers.mockResolvedValue(existingUsers);
            
            await initAuth();
            
            expect(loadUsers).toHaveBeenCalled();
            expect(saveUsers).not.toHaveBeenCalled();
        });
    });

    describe('handleLogin', () => {
        it('should successfully log in demo user', async () => {
            const demoUser = {
                id: 'demo-id',
                email: 'demo@example.com',
                name: 'Demo User',
                password: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
            };
            
            loadUsers.mockResolvedValue([demoUser]);
            
            // Set up form values
            document.getElementById('login-email').value = 'demo@example.com';
            document.getElementById('login-password').value = 'password';
            
            // Create and dispatch submit event
            const event = new Event('submit');
            event.preventDefault = jest.fn();
            
            await handleLogin(event);
            
            expect(setCurrentUser).toHaveBeenCalledWith(expect.objectContaining({
                id: 'demo-id',
                email: 'demo@example.com',
                name: 'Demo User',
                password: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
            }));
            expect(document.getElementById('auth-content').style.display).toBe('none');
            expect(document.getElementById('main-content').style.display).toBe('block');
        });

        it('should show error for invalid credentials', async () => {
            const demoUser = {
                id: 'demo-id',
                email: 'demo@example.com',
                name: 'Demo User',
                password: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
            };
            
            loadUsers.mockResolvedValue([demoUser]);
            
            // Set up form values with wrong password
            document.getElementById('login-email').value = 'demo@example.com';
            document.getElementById('login-password').value = 'wrong-password';
            
            const event = new Event('submit');
            event.preventDefault = jest.fn();
            
            // Initialize auth to load the users
            await initAuth();
            
            // Attempt login
            await handleLogin(event);
            
            const loginError = document.getElementById('login-error');
            expect(loginError.textContent).toBe('Incorrect password. Please try again.');
            expect(loginError.classList.contains('hidden')).toBe(false);
        });

        it('should show error for non-existent user', async () => {
            loadUsers.mockResolvedValue([]);
            
            // Set up form values for non-existent user
            document.getElementById('login-email').value = 'nonexistent@example.com';
            document.getElementById('login-password').value = 'password';
            
            const event = new Event('submit');
            event.preventDefault = jest.fn();
            
            await handleLogin(event);
            
            const loginError = document.getElementById('login-error');
            expect(loginError.textContent).toBe('No account found with this email address');
            expect(loginError.classList.contains('hidden')).toBe(false);
        });
    });

    describe('handleRegister', () => {
        it('should successfully register new user', async () => {
            loadUsers.mockResolvedValue([]);
            
            // Set up form values
            document.getElementById('register-name').value = 'New User';
            document.getElementById('register-email').value = 'new@example.com';
            document.getElementById('register-password').value = 'password123';
            document.getElementById('register-confirm-password').value = 'password123';
            
            const event = new Event('submit');
            event.preventDefault = jest.fn();
            
            await handleRegister(event);
            
            expect(saveUsers).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    email: 'new@example.com',
                    name: 'New User'
                })
            ]));
            
            const registerError = document.getElementById('register-error');
            expect(registerError.textContent).toBe('Account created successfully! Please log in.');
            expect(registerError.classList.contains('text-green-500')).toBe(true);
        });

        it('should show error for existing email', async () => {
            const existingUser = {
                id: '1',
                email: 'existing@example.com',
                name: 'Existing User'
            };
            
            // Set up mock to return existing user
            loadUsers.mockResolvedValue([existingUser]);
            
            // Set up form values with existing email
            document.getElementById('register-name').value = 'New User';
            document.getElementById('register-email').value = 'existing@example.com';
            document.getElementById('register-password').value = 'password123';
            document.getElementById('register-confirm-password').value = 'password123';
            
            const event = new Event('submit');
            event.preventDefault = jest.fn();
            
            // Initialize auth to load the existing user
            await initAuth();
            
            // Attempt to register
            await handleRegister(event);
            
            const registerError = document.getElementById('register-error');
            expect(registerError.textContent).toBe('Email is already registered. Please log in or use a different email.');
            expect(registerError.classList.contains('hidden')).toBe(false);
        });

        it('should show error for mismatched passwords', async () => {
            loadUsers.mockResolvedValue([]);
            
            // Set up form values with mismatched passwords
            document.getElementById('register-name').value = 'New User';
            document.getElementById('register-email').value = 'new@example.com';
            document.getElementById('register-password').value = 'password123';
            document.getElementById('register-confirm-password').value = 'different';
            
            const event = new Event('submit');
            event.preventDefault = jest.fn();
            
            await handleRegister(event);
            
            const registerError = document.getElementById('register-error');
            expect(registerError.textContent).toBe('Passwords do not match');
            expect(registerError.classList.contains('hidden')).toBe(false);
        });
    });

    describe('handleLogout', () => {
        it('should successfully log out user', async () => {
            // Set up logged in state
            setCurrentUser({ id: '1', email: 'test@example.com', name: 'Test User' });
            localStorage.setItem('loggedInUser', '1');
            
            await handleLogout();
            
            expect(setCurrentUser).toHaveBeenCalledWith(null);
            expect(localStorage.getItem('loggedInUser')).toBeNull();
            expect(document.getElementById('auth-content').style.display).toBe('block');
            expect(document.getElementById('main-content').style.display).toBe('none');
        });
    });

    describe('hashPassword', () => {
        it('should hash password correctly', () => {
            const password = 'password';
            const hashed = hashPassword(password);
            
            expect(hashed).toBe('5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8');
        });

        it('should return null for empty password', () => {
            const hashed = hashPassword('');
            
            expect(hashed).toBeNull();
        });

        it('should handle CryptoJS unavailability', () => {
            // Temporarily remove CryptoJS
            const originalCryptoJS = window.CryptoJS;
            window.CryptoJS = undefined;
            
            const hashed = hashPassword('password');
            
            // Restore CryptoJS
            window.CryptoJS = originalCryptoJS;
            
            expect(hashed).toBe('5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8');
        });
    });
}); 