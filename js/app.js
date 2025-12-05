/**
 * Main application entry point for Platform Engagement Tracker
 * Using session-based storage (no authentication required)
 */

import { getOrCreateSession, getCurrentSessionId, loadSession, createNewSession, copySessionIdToClipboard } from './modules/session.js';
import { loadPreference, savePreference, saveSessionData, loadSessionData, loadAllSessionData } from './modules/storage.js';
import { showNotification, normalizeUrl } from './modules/utils.js';
import { loadDashboard } from './components/dashboard.js';

/**
 * Initialize application
 */
async function initApp() {
    console.log('App initialization started');

    try {
        // Add version tracking for debugging
        const appVersion = '2.0.0';
        console.log(`Platform Engagement Tracker v${appVersion}`);
        console.log('Browser:', navigator.userAgent);

        // Check that dependencies are fully loaded
        checkDependencies();

        // Step 1: Initialize session
        console.log('Initializing session');
        const sessionId = getOrCreateSession();
        console.log(`Session ID: ${sessionId}`);

        // Step 2: Update UI with session ID
        updateSessionDisplay(sessionId);

        // Step 3: Setup UI components
        setupSessionMenu();
        initDarkModeToggle();
        setupMenuItems();
        setupModalControls();

        // Step 4: Show main content directly (no auth needed)
        const authContent = document.getElementById('auth-content');
        const mainContent = document.getElementById('main-content');

        if (authContent) authContent.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';

        // Step 5: Load dashboard
        await loadDashboard();

        // Hide loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.transition = 'opacity 0.5s ease-out';
            loadingIndicator.style.opacity = '0';
            setTimeout(() => {
                loadingIndicator.style.display = 'none';
            }, 500);
        }

        console.log('App initialization complete');
    } catch (error) {
        console.error('Error during app initialization:', error);

        // Show error to user
        const errorContainer = document.createElement('div');
        errorContainer.className = 'p-4 bg-red-100 border-l-4 border-red-500 text-red-700 fixed inset-x-0 bottom-0';
        errorContainer.innerHTML = `
            <p class="font-bold">Application Error</p>
            <p>There was an error initializing the application: ${error.message}</p>
        `;
        document.body.appendChild(errorContainer);

        // Hide the loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

/**
 * Update session ID display in UI
 * @param {string} sessionId - Session ID to display
 */
function updateSessionDisplay(sessionId) {
    const displays = ['current-session-id', 'session-id-display'];
    displays.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = sessionId;
    });
}

/**
 * Check that all dependencies are properly loaded
 */
function checkDependencies() {
    const dependencies = {
        tailwind: typeof window.tailwind !== 'undefined',
        chartjs: typeof window.Chart !== 'undefined',
        localforage: typeof window.localforage !== 'undefined'
    };

    console.log('Dependencies status:', dependencies);

    const missingDeps = Object.entries(dependencies)
        .filter(([, loaded]) => !loaded)
        .map(([name]) => name);

    if (missingDeps.length > 0) {
        console.warn(`Missing dependencies: ${missingDeps.join(', ')}`);
    }
}

/**
 * Initialize dark mode toggle
 */
function initDarkModeToggle() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedDarkMode = loadPreference('darkMode', null);

        if (savedDarkMode === true || (savedDarkMode === null && prefersDarkMode)) {
            darkModeToggle.checked = true;
            document.documentElement.classList.add('dark');
        }

        darkModeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }

            savePreference('darkMode', e.target.checked);

            // Update charts for better visibility in dark mode
            const updateChartsEvent = new CustomEvent('darkModeChanged', {
                detail: { isDarkMode: e.target.checked }
            });
            document.dispatchEvent(updateChartsEvent);
        });
    }
}

/**
 * Set up session menu dropdown
 */
function setupSessionMenu() {
    const sessionMenuButton = document.getElementById('session-menu-button');
    const sessionDropdown = document.getElementById('session-dropdown');

    if (sessionMenuButton && sessionDropdown) {
        sessionMenuButton.addEventListener('click', (e) => {
            e.preventDefault();
            sessionDropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!sessionMenuButton.contains(e.target) && !sessionDropdown.contains(e.target)) {
                sessionDropdown.classList.add('hidden');
            }
        });
    }

    // Copy session button
    const copyBtn = document.getElementById('copy-session-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const success = await copySessionIdToClipboard();
            if (success) {
                showNotification('Session ID copied to clipboard!');
            } else {
                showNotification('Failed to copy session ID', 'error');
            }
        });
    }

    // New session button
    const newSessionBtn = document.getElementById('new-session-btn');
    if (newSessionBtn) {
        newSessionBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Create a new session? Your current session data will be preserved and can be accessed later using your session ID.')) {
                const newId = createNewSession();
                updateSessionDisplay(newId);
                await loadDashboard();
                showNotification(`New session created: ${newId}`);
            }
        });
    }

    // Load session button
    const loadSessionBtn = document.getElementById('load-session-btn');
    const loadSessionInput = document.getElementById('load-session-input');
    const loadSessionError = document.getElementById('load-session-error');

    if (loadSessionBtn && loadSessionInput) {
        loadSessionBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const inputId = loadSessionInput.value.trim().toUpperCase();

            if (!inputId) {
                if (loadSessionError) {
                    loadSessionError.textContent = 'Please enter a session ID';
                    loadSessionError.classList.remove('hidden');
                }
                return;
            }

            if (inputId.length !== 8) {
                if (loadSessionError) {
                    loadSessionError.textContent = 'Session ID must be 8 characters';
                    loadSessionError.classList.remove('hidden');
                }
                return;
            }

            // Load the session
            const success = loadSession(inputId);
            if (success) {
                updateSessionDisplay(inputId);
                loadSessionInput.value = '';
                if (loadSessionError) loadSessionError.classList.add('hidden');
                await loadDashboard();
                showNotification(`Loaded session: ${inputId}`);

                // Close dropdown
                const sessionDropdown = document.getElementById('session-dropdown');
                if (sessionDropdown) sessionDropdown.classList.add('hidden');
            } else {
                if (loadSessionError) {
                    loadSessionError.textContent = 'Invalid session ID format';
                    loadSessionError.classList.remove('hidden');
                }
            }
        });

        // Also load on Enter key
        loadSessionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                loadSessionBtn.click();
            }
        });
    }
}

/**
 * Setup menu item click handlers
 */
function setupMenuItems() {
    // API settings
    const apiSettingsLink = document.getElementById('api-settings');
    if (apiSettingsLink) {
        apiSettingsLink.addEventListener('click', async (e) => {
            e.preventDefault();

            try {
                const apiConfig = await loadSessionData('apiConfig', {
                    youtube: { apiKey: '' },
                    servicenow: { instance: '', username: '', password: '' },
                    linkedin: { clientId: '', clientSecret: '' }
                });

                // Fill form fields
                document.getElementById('youtube-api-key').value = apiConfig.youtube?.apiKey || '';
                document.getElementById('servicenow-instance').value = apiConfig.servicenow?.instance || '';
                document.getElementById('servicenow-username').value = apiConfig.servicenow?.username || '';
                document.getElementById('servicenow-password').value = apiConfig.servicenow?.password || '';
                document.getElementById('linkedin-client-id').value = apiConfig.linkedin?.clientId || '';
                document.getElementById('linkedin-client-secret').value = apiConfig.linkedin?.clientSecret || '';

                showModal('api-modal');
            } catch (error) {
                console.error('Error loading API config:', error);
                showNotification('Error loading API settings', 'error');
            }
        });
    }

    // Import/Export
    const importExportLink = document.getElementById('import-export');
    if (importExportLink) {
        importExportLink.addEventListener('click', (e) => {
            e.preventDefault();
            showModal('import-modal');
        });
    }
}

/**
 * Setup modal controls (show/hide)
 */
function setupModalControls() {
    // API settings form
    const apiForm = document.getElementById('api-form');
    if (apiForm) {
        apiForm.addEventListener('submit', handleApiFormSubmit);
    }

    // Export data button
    const exportButton = document.getElementById('export-data');
    if (exportButton) {
        exportButton.addEventListener('click', handleExportData);
    }

    // Import data button
    const importButton = document.getElementById('import-data');
    if (importButton) {
        importButton.addEventListener('click', handleImportData);
    }

    // Close buttons for all modals
    const closeButtons = [
        { id: 'close-content-modal', modal: 'content-modal' },
        { id: 'close-api-modal', modal: 'api-modal' },
        { id: 'close-import-modal', modal: 'import-modal' }
    ];

    closeButtons.forEach(button => {
        const el = document.getElementById(button.id);
        if (el) {
            el.addEventListener('click', () => {
                hideModal(button.modal);
            });
        }
    });
}

/**
 * Show a modal by ID
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Hide a modal by ID
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Handle API form submission
 */
async function handleApiFormSubmit(e) {
    e.preventDefault();

    const apiConfig = {
        youtube: {
            apiKey: document.getElementById('youtube-api-key').value
        },
        servicenow: {
            instance: document.getElementById('servicenow-instance').value,
            username: document.getElementById('servicenow-username').value,
            password: document.getElementById('servicenow-password').value
        },
        linkedin: {
            clientId: document.getElementById('linkedin-client-id').value,
            clientSecret: document.getElementById('linkedin-client-secret').value
        }
    };

    try {
        await saveSessionData('apiConfig', apiConfig);
        showNotification('API settings saved successfully');
        hideModal('api-modal');
    } catch (error) {
        console.error('Error saving API settings:', error);
        showNotification('Error saving API settings', 'error');
    }
}

/**
 * Handle export data
 */
async function handleExportData() {
    try {
        const sessionData = await loadAllSessionData();

        const exportData = {
            type: 'platform-engagement-tracker-export',
            version: '2.0',
            sessionId: getCurrentSessionId(),
            timestamp: new Date().toISOString(),
            data: sessionData
        };

        const jsonData = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `platform-tracker-${getCurrentSessionId()}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);

        showNotification('Data exported successfully');
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Error exporting data', 'error');
    }
}

/**
 * Handle import data
 */
async function handleImportData() {
    try {
        const fileInput = document.getElementById('import-file');
        const importStatus = document.getElementById('import-status');
        const importMode = document.querySelector('input[name="import-mode"]:checked').value;

        if (!fileInput.files.length) {
            importStatus.textContent = 'Please select a file to import';
            importStatus.className = 'mt-2 text-sm text-red-500';
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const importData = JSON.parse(e.target.result);

                if (!importData.type || importData.type !== 'platform-engagement-tracker-export') {
                    throw new Error('Invalid import file format');
                }

                const currentData = await loadAllSessionData();

                let newData;
                if (importMode === 'replace') {
                    newData = importData.data;
                } else {
                    newData = {
                        apiConfig: { ...currentData.apiConfig, ...importData.data.apiConfig },
                        contentItems: mergeArrays(currentData.contentItems, importData.data.contentItems, 'id'),
                        engagementData: [...currentData.engagementData, ...importData.data.engagementData]
                    };
                }

                await saveSessionData('apiConfig', newData.apiConfig);
                await saveSessionData('contentItems', newData.contentItems);
                await saveSessionData('engagementData', newData.engagementData);

                importStatus.textContent = 'Data imported successfully';
                importStatus.className = 'mt-2 text-sm text-green-500';
                fileInput.value = '';

                showNotification('Data imported successfully');
                await loadDashboard();
            } catch (error) {
                console.error('Error processing import file:', error);
                importStatus.textContent = `Error: ${error.message}`;
                importStatus.className = 'mt-2 text-sm text-red-500';
            }
        };

        reader.onerror = () => {
            importStatus.textContent = 'Error reading file';
            importStatus.className = 'mt-2 text-sm text-red-500';
        };

        reader.readAsText(file);
    } catch (error) {
        console.error('Error importing data:', error);
        showNotification('Error importing data', 'error');
    }
}

/**
 * Merge arrays by ID
 */
function mergeArrays(arr1, arr2, idField) {
    const merged = [...arr1];
    const ids = new Set(arr1.map(item => item[idField]));

    arr2.forEach(item => {
        if (!ids.has(item[idField])) {
            merged.push(item);
            ids.add(item[idField]);
        }
    });

    return merged;
}

// Initialize the app when DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    initApp();
});