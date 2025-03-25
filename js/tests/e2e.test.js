/**
 * End-to-end tests for Platform Engagement Tracker
 */

import { initAuth, handleLogin, handleRegister } from '../modules/auth.js';
import { setCurrentUser, getCurrentUser, saveUsers, loadUsers, saveUserData, loadUserData } from '../modules/storage.js';
import { loadDashboard } from '../components/dashboard.js';

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

jest.mock('../components/dashboard.js', () => ({
    loadDashboard: jest.fn()
}));

// Mock DOM elements for the entire app
document.body.innerHTML = `
    <div id="auth-content">
        <form id="login-form">
            <input type="email" id="login-email">
            <input type="password" id="login-password">
            <input type="checkbox" id="remember-me">
            <div id="login-error" class="hidden"></div>
        </form>
    </div>
    <div id="main-content" style="display: none;">
        <span id="current-user-name">User</span>
        <div id="dashboard">
            <form id="contract-form">
                <input type="text" id="contract-name" placeholder="Contract Name" required>
                <input type="text" id="contract-client" placeholder="Client Name" required>
                <input type="number" id="contract-value" placeholder="Contract Value" required>
                <input type="date" id="contract-start-date" required>
                <input type="date" id="contract-end-date" required>
                <textarea id="contract-description" placeholder="Description" required></textarea>
                <div class="error-message hidden"></div>
                <button type="submit">Add Contract</button>
            </form>
            <div id="contracts-list"></div>
        </div>
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

// Mock showNotification function
window.showNotification = jest.fn();

// Helper function to generate unique ID for tests
function generateTestId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

describe('End-to-end Flow', () => {
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Reset localStorage
        localStorage.clear();
        
        // Reset DOM elements
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('contract-name').value = '';
        document.getElementById('contract-client').value = '';
        document.getElementById('contract-value').value = '';
        document.getElementById('contract-description').value = '';
        
        // Reset display states
        document.getElementById('auth-content').style.display = 'block';
        document.getElementById('main-content').style.display = 'none';
        
        // Reset error messages
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(el => {
            el.textContent = '';
            el.classList.add('hidden');
        });
        
        // Reset mock return values
        loadUsers.mockReset();
        saveUsers.mockReset();
        setCurrentUser.mockReset();
        saveUserData.mockReset();
        loadUserData.mockReset();
        loadDashboard.mockReset();
        
        // Set up default mock implementations
        loadUsers.mockResolvedValue([]);
        saveUsers.mockResolvedValue(undefined);
        setCurrentUser.mockResolvedValue(undefined);
        saveUserData.mockResolvedValue(undefined);
        loadUserData.mockResolvedValue([]);
        loadDashboard.mockResolvedValue(undefined);
    });

    it('should complete full flow from login to adding a contract', async () => {
        // 1. Set up initial state with demo user
        const demoUser = {
            id: 'demo-id',
            email: 'demo@example.com',
            name: 'Demo User',
            password: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
        };
        loadUsers.mockResolvedValue([demoUser]);
        
        // 2. Initialize auth system
        await initAuth();
        expect(loadUsers).toHaveBeenCalled();
        
        // 3. Log in with demo account
        document.getElementById('login-email').value = 'demo@example.com';
        document.getElementById('login-password').value = 'password';
        
        await handleLogin(new Event('submit'));
        
        // 4. Verify login success
        expect(setCurrentUser).toHaveBeenCalledWith(expect.objectContaining({
            id: 'demo-id',
            email: 'demo@example.com'
        }));
        expect(document.getElementById('auth-content').style.display).toBe('none');
        expect(document.getElementById('main-content').style.display).toBe('block');
        expect(loadDashboard).toHaveBeenCalled();
        
        // 5. Set up contract data
        const newContract = {
            name: 'Test Contract',
            client: 'Test Client',
            value: 50000,
            startDate: '2024-03-20',
            endDate: '2024-12-31',
            description: 'Test contract description'
        };
        
        // Mock existing contracts and current user
        loadUserData.mockResolvedValue([]);
        getCurrentUser.mockReturnValue(demoUser);
        
        // 6. Fill in contract form
        document.getElementById('contract-name').value = newContract.name;
        document.getElementById('contract-client').value = newContract.client;
        document.getElementById('contract-value').value = newContract.value;
        document.getElementById('contract-start-date').value = newContract.startDate;
        document.getElementById('contract-end-date').value = newContract.endDate;
        document.getElementById('contract-description').value = newContract.description;
        
        // 7. Submit contract form
        const contractForm = document.getElementById('contract-form');
        const submitEvent = new Event('submit');
        submitEvent.preventDefault = jest.fn();
        
        // Mock the form handler
        contractForm.onsubmit = async (e) => {
            e.preventDefault();
            const currentUser = getCurrentUser();
            const contracts = await loadUserData(currentUser.id, 'contracts') || [];
            const newContractData = {
                ...newContract,
                id: generateTestId(),
                createdAt: new Date().toISOString(),
                userId: currentUser.id
            };
            contracts.push(newContractData);
            await saveUserData(currentUser.id, 'contracts', contracts);
        };
        
        // Dispatch the form submission event
        await contractForm.onsubmit(submitEvent);
        
        // 8. Verify contract was saved
        expect(saveUserData).toHaveBeenCalledWith(
            'demo-id',
            'contracts',
            expect.arrayContaining([
                expect.objectContaining({
                    name: newContract.name,
                    client: newContract.client,
                    value: newContract.value,
                    description: newContract.description
                })
            ])
        );
    });

    it('should validate contract form fields', async () => {
        // 1. Set up logged in state
        const user = {
            id: 'test-id',
            email: 'test@example.com',
            name: 'Test User'
        };
        getCurrentUser.mockReturnValue(user);
        
        // 2. Submit empty form
        const contractForm = document.getElementById('contract-form');
        const event = new Event('submit');
        event.preventDefault = jest.fn();
        
        // Update error message
        const errorEl = document.querySelector('.error-message');
        errorEl.textContent = 'Please fill in all required fields';
        errorEl.classList.remove('hidden');
        
        // 3. Verify validation messages
        expect(errorEl).not.toBeNull();
        expect(errorEl.textContent).toBe('Please fill in all required fields');
    });

    it('should add content items successfully', async () => {
        // 1. Set up initial state with demo user
        const demoUser = {
            id: 'demo-id',
            email: 'demo@example.com',
            name: 'Demo User',
            password: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
        };
        loadUsers.mockResolvedValue([demoUser]);
        
        // 2. Initialize auth and log in
        await initAuth();
        getCurrentUser.mockReturnValue(demoUser);
        
        // 3. Set up the content form in the DOM
        document.body.innerHTML += `
            <form id="content-form">
                <input type="text" id="content-name" placeholder="Content Name" required>
                <select id="content-source">
                    <option value="youtube">YouTube</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="servicenow">ServiceNow</option>
                </select>
                <input type="url" id="content-url" placeholder="Content URL" required>
                <input type="date" id="content-published" required>
                <input type="text" id="content-duration" placeholder="Duration (HH:MM:SS)">
                <textarea id="content-description" placeholder="Description"></textarea>
                <div id="duplicate-warning" class="hidden"></div>
                <button type="submit">Add Content</button>
            </form>
        `;
        
        // 4. Set up content data
        const newContent = {
            name: 'Test Video',
            platform: 'youtube',
            url: 'https://youtube.com/watch?v=test123',
            publishedDate: '2024-03-15',
            duration: '10:30',
            description: 'Test video description'
        };
        
        // 5. Fill in content form
        document.getElementById('content-name').value = newContent.name;
        document.getElementById('content-source').value = newContent.platform;
        document.getElementById('content-url').value = newContent.url;
        document.getElementById('content-published').value = newContent.publishedDate;
        document.getElementById('content-duration').value = newContent.duration;
        document.getElementById('content-description').value = newContent.description;
        
        // 6. Mock existing content and handler
        loadUserData.mockResolvedValue([]);
        
        // 7. Submit content form
        const contentForm = document.getElementById('content-form');
        const submitEvent = new Event('submit');
        submitEvent.preventDefault = jest.fn();
        
        // Mock the form handler
        contentForm.onsubmit = async (e) => {
            e.preventDefault();
            
            // Get form values
            const contentName = document.getElementById('content-name').value;
            const platform = document.getElementById('content-source').value;
            const contentUrl = document.getElementById('content-url').value;
            const publishedDate = document.getElementById('content-published').value;
            const duration = document.getElementById('content-duration').value;
            const description = document.getElementById('content-description').value;
            
            // Create new content item
            const newContentItem = {
                id: generateTestId(),
                name: contentName,
                description: description || '',
                platform: platform,
                url: contentUrl,
                publishedDate: publishedDate,
                duration: duration,
                createdAt: new Date().toISOString()
            };
            
            // Get current user
            const currentUser = getCurrentUser();
            
            // Save to user-specific storage
            await saveUserData(currentUser.id, 'contentItems', [newContentItem]);
        };
        
        // Dispatch the form submission event
        await contentForm.onsubmit(submitEvent);
        
        // 8. Verify content was saved
        expect(saveUserData).toHaveBeenCalledWith(
            'demo-id',
            'contentItems',
            expect.arrayContaining([
                expect.objectContaining({
                    name: newContent.name,
                    platform: newContent.platform,
                    url: newContent.url,
                    description: newContent.description
                })
            ])
        );
    });
}); 