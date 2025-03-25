/**
 * Test suite for Platform Engagement Tracker
 * Run these tests from the browser console by loading this file 
 * and calling runAllTests() function
 */

// Test results storage
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
};

/**
 * Assert function for tests
 * @param {boolean} condition - Condition to test
 * @param {string} message - Test description
 * @param {Function} cleanup - Optional cleanup function to run after test
 */
function assert(condition, message, cleanup = null) {
    testResults.total++;
    
    if (condition) {
        testResults.passed++;
        testResults.details.push({
            status: 'PASS',
            message
        });
        console.log(`✅ PASS: ${message}`);
    } else {
        testResults.failed++;
        testResults.details.push({
            status: 'FAIL',
            message
        });
        console.error(`❌ FAIL: ${message}`);
    }
    
    if (cleanup && typeof cleanup === 'function') {
        try {
            cleanup();
        } catch (error) {
            console.error(`Error in cleanup for test "${message}":`, error);
        }
    }
}

/**
 * Run a test with setup and cleanup
 * @param {string} name - Test name
 * @param {Function} testFn - Test function
 */
async function runTest(name, testFn) {
    console.log(`\n📋 Running test: ${name}`);
    
    try {
        await testFn();
    } catch (error) {
        testResults.total++;
        testResults.failed++;
        testResults.details.push({
            status: 'ERROR',
            message: `${name} - ${error.message}`
        });
        
        console.error(`❌ ERROR: ${name} - ${error.message}`);
        console.error(error);
    }
}

/**
 * Print test results summary
 */
function printResults() {
    console.log('\n---------------------------------');
    console.log('🔍 TEST RESULTS:');
    console.log(`Total tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
    console.log('---------------------------------');
    
    if (testResults.failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.details
            .filter(detail => detail.status !== 'PASS')
            .forEach(detail => {
                console.log(`- ${detail.message}`);
            });
    }
}

/**
 * Test DOM element existence and references
 */
async function testDOMElements() {
    await runTest('DOM Elements Existence', () => {
        // Auth elements
        const authElements = [
            'auth-content',
            'main-content',
            'login-form',
            'register-form',
            'login-tab',
            'register-tab',
            'login-error',
            'register-error',
            'auth-dark-mode-toggle'
        ];
        
        authElements.forEach(id => {
            const element = document.getElementById(id);
            assert(element !== null, `Auth element '${id}' exists in DOM`);
        });
        
        // Dashboard elements
        const dashboardElements = [
            'content-list',
            'engagement-list',
            'total-content',
            'total-engagements',
            'top-platform',
            'content-published',
            'user-menu-button',
            'user-dropdown',
            'dark-mode-toggle'
        ];
        
        dashboardElements.forEach(id => {
            const element = document.getElementById(id);
            assert(element !== null, `Dashboard element '${id}' exists in DOM`);
        });
    });
}

/**
 * Test module imports and exports
 */
async function testModuleImports() {
    await runTest('Module Imports', async () => {
        // Try importing each module to check for errors
        try {
            const authModule = await import('./modules/auth.js');
            assert(typeof authModule.initAuth === 'function', 'auth.js module exports initAuth function');
            assert(typeof authModule.handleLogin === 'function', 'auth.js module exports handleLogin function');
            assert(typeof authModule.handleRegister === 'function', 'auth.js module exports handleRegister function');
        } catch (error) {
            assert(false, `auth.js module imports correctly: ${error.message}`);
        }
        
        try {
            const storageModule = await import('./modules/storage.js');
            assert(typeof storageModule.loadUserData === 'function', 'storage.js module exports loadUserData function');
            assert(typeof storageModule.saveUserData === 'function', 'storage.js module exports saveUserData function');
        } catch (error) {
            assert(false, `storage.js module imports correctly: ${error.message}`);
        }
        
        try {
            const utilsModule = await import('./modules/utils.js');
            assert(typeof utilsModule.formatDate === 'function', 'utils.js module exports formatDate function');
            assert(typeof utilsModule.showNotification === 'function', 'utils.js module exports showNotification function');
        } catch (error) {
            assert(false, `utils.js module imports correctly: ${error.message}`);
        }
    });
}

/**
 * Test authentication functionality
 */
async function testAuthentication() {
    await runTest('Authentication', async () => {
        const { hashPassword, initAuth } = await import('./modules/auth.js');
        const { loadUsers } = await import('./modules/storage.js');
        
        // Test password hashing function
        const password = 'testpassword';
        const hashedPassword = hashPassword(password);
        assert(hashedPassword && hashedPassword.length > 0, 'hashPassword function returns a non-empty string');
        assert(hashPassword(password) === hashedPassword, 'hashPassword function is deterministic (same input gives same output)');
        
        // Test users list loading
        const users = await loadUsers();
        assert(Array.isArray(users), 'loadUsers returns an array');
        
        // Check if demo user exists
        if (users.length === 0) {
            // If no users, test should create demo user
            await initAuth();
            const usersAfterInit = await loadUsers();
            assert(usersAfterInit.length > 0, 'initAuth creates demo user when no users exist');
            
            if (usersAfterInit.length > 0) {
                const demoUser = usersAfterInit[0];
                assert(demoUser.email === 'demo@example.com', 'Demo user has correct email');
                assert(demoUser.password === hashPassword('password'), 'Demo user has correctly hashed password');
            }
        } else {
            // Users already exist, just check if they have required fields
            const firstUser = users[0];
            assert(firstUser.id && firstUser.email && firstUser.password, 'Users have required fields (id, email, password)');
        }
    });
}

/**
 * Test storage functionality
 */
async function testStorage() {
    await runTest('Storage', async () => {
        const { loadPreference, savePreference, saveUserData, loadUserData, setCurrentUser } = await import('./modules/storage.js');
        
        // Test preferences
        const prefKey = 'testPreference';
        const prefValue = { test: true, value: 123 };
        
        // Save and load preference
        savePreference(prefKey, prefValue);
        const loadedPref = loadPreference(prefKey);
        assert(JSON.stringify(loadedPref) === JSON.stringify(prefValue), 'savePreference and loadPreference work correctly');
        
        // Clean up test preference
        localStorage.removeItem(prefKey);
        
        // Test user data storage (requires a current user)
        // Create a temporary mock user
        const mockUser = { id: 'test-' + Date.now(), name: 'Test User', email: 'test@example.com' };
        setCurrentUser(mockUser);
        
        // Test saving and loading user data
        const dataKey = 'testData';
        const userData = { testField: 'testValue', number: 42 };
        
        await saveUserData(dataKey, userData);
        const loadedData = await loadUserData(dataKey);
        
        assert(loadedData && loadedData.testField === userData.testField, 'saveUserData and loadUserData work correctly');
        
        // Clean up test data
        if (window.localforage) {
            await localforage.removeItem(`user_${mockUser.id}_${dataKey}`);
        }
        
        // Reset current user
        setCurrentUser(null);
    });
}

/**
 * Test UI components
 */
async function testUIComponents() {
    await runTest('UI Components', async () => {
        const { toggleDarkMode } = await import('./components/auth-ui.js');
        
        // Test dark mode toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        const initialDarkMode = document.documentElement.classList.contains('dark');
        
        if (darkModeToggle) {
            // Create a custom event to test the toggle
            const event = new Event('change');
            event.target = { checked: !initialDarkMode, id: 'dark-mode-toggle' };
            
            // Toggle dark mode
            toggleDarkMode(event);
            
            // Check if dark mode was toggled
            const newDarkMode = document.documentElement.classList.contains('dark');
            assert(newDarkMode !== initialDarkMode, 'Dark mode toggle works correctly');
            
            // Reset to initial state
            event.target.checked = initialDarkMode;
            toggleDarkMode(event);
        } else {
            assert(false, 'Dark mode toggle element is missing');
        }
    });
}

/**
 * Test API and utils
 */
async function testAPIAndUtils() {
    await runTest('API and Utils', async () => {
        const { formatDate, formatDateTime, normalizeUrl, calculateWatchHours } = await import('./modules/utils.js');
        
        // Test formatDate function
        const testDate = '2023-01-15T12:30:45Z';
        const formattedDate = formatDate(testDate);
        assert(formattedDate && formattedDate.length > 0, 'formatDate returns non-empty string');
        
        // Test formatDateTime function
        const formattedDateTime = formatDateTime(testDate);
        assert(formattedDateTime && formattedDateTime.length > 0, 'formatDateTime returns non-empty string');
        
        // Test normalizeUrl function
        const urlWithTracking = 'https://example.com/?utm_source=test&utm_medium=email';
        const normalizedUrl = normalizeUrl(urlWithTracking);
        assert(normalizedUrl === 'https://example.com/', 'normalizeUrl removes tracking parameters');
        
        // Test calculateWatchHours function
        const views = 100;
        const duration = '5:30'; // 5 minutes, 30 seconds
        const watchPercentage = 0.55;
        
        const watchHours = calculateWatchHours(views, duration, watchPercentage);
        // 100 views * 5.5 minutes = 550 minutes = 9.17 hours * 0.55 = 5.04 hours
        assert(Math.abs(watchHours - 5.04) < 0.1, 'calculateWatchHours computes correct watch hours');
    });
}

/**
 * Complete test suite execution
 */
async function runAllTests() {
    console.log('🧪 Starting Platform Engagement Tracker tests...');
    
    // Reset test results
    testResults.total = 0;
    testResults.passed = 0;
    testResults.failed = 0;
    testResults.details = [];
    
    // Run all tests
    await testDOMElements();
    await testModuleImports();
    await testAuthentication();
    await testStorage();
    await testUIComponents();
    await testAPIAndUtils();
    
    // Print results
    printResults();
    
    return testResults;
}

// Export test functions
window.runAllTests = runAllTests;
window.assert = assert;
window.runTest = runTest;

console.log('✅ Test suite loaded. Run tests with: runAllTests()');