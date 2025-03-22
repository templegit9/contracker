/**
 * Main application entry point for Platform Engagement Tracker
 */

import { initAuth, handleLogout, deleteUserAccount, updateUserProfile, hashPassword, getCurrentUser } from './modules/auth.js';
import { initAuthUI } from './components/auth-ui.js';
import { loadPreference, savePreference, saveUserData, loadAllUserData, loadUserData } from './modules/storage.js';
import { showNotification } from './modules/utils.js';
import { loadDashboard } from './components/dashboard.js';

/**
 * Initialize application
 */
async function initApp() {
    // Set up user dropdown menu
    setupUserMenu();
    
    // Initialize authentication UI
    initAuthUI();
    
    // Initialize authentication system
    // If user is logged in, this will automatically load the dashboard
    await initAuth();
    
    // Initialize dark mode toggle in main UI (auth UI initializes its own toggle)
    initDarkModeToggle();
    
    // Initialize menu items
    setupMenuItems();
    
    // Initialize modal controls
    setupModalControls();
}

/**
 * Initialize dark mode toggle
 */
function initDarkModeToggle() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        // Set initial state based on preference
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedDarkMode = loadPreference('darkMode', null);
        
        if (savedDarkMode === true || (savedDarkMode === null && prefersDarkMode)) {
            darkModeToggle.checked = true;
            document.documentElement.classList.add('dark');
        }
        
        // Set up event listener
        darkModeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            
            // Save preference
            savePreference('darkMode', e.target.checked);
            
            // Update charts for better visibility in dark mode
            const updateChartsEvent = new CustomEvent('darkModeChanged', { 
                detail: { isDarkMode: e.target.checked } 
            });
            document.dispatchEvent(updateChartsEvent);
            
            // Keep auth toggle in sync
            const authToggle = document.getElementById('auth-dark-mode-toggle');
            if (authToggle) {
                authToggle.checked = e.target.checked;
            }
        });
    }
}

/**
 * Set up user menu dropdown
 */
function setupUserMenu() {
    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', (e) => {
            e.preventDefault();
            userDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }
}

/**
 * Setup menu item click handlers
 */
function setupMenuItems() {
    // Edit profile
    const editProfileLink = document.getElementById('edit-profile');
    if (editProfileLink) {
        editProfileLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Get current user
            const currentUser = getCurrentUser();
            if (currentUser) {
                // Fill form fields
                document.getElementById('profile-name').value = currentUser.name || '';
                document.getElementById('profile-email').value = currentUser.email || '';
                
                // Clear password fields
                document.getElementById('profile-current-password').value = '';
                document.getElementById('profile-new-password').value = '';
                document.getElementById('profile-confirm-password').value = '';
                
                // Clear messages
                const profileError = document.getElementById('profile-error');
                const profileSuccess = document.getElementById('profile-success');
                if (profileError) profileError.classList.add('hidden');
                if (profileSuccess) profileSuccess.classList.add('hidden');
                
                // Show the modal
                showModal('profile-modal');
            } else {
                showNotification('No user logged in', 'error');
            }
        });
    }
    
    // API settings
    const apiSettingsLink = document.getElementById('api-settings');
    if (apiSettingsLink) {
        apiSettingsLink.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Load current API config
            try {
                const apiConfig = await loadUserData('apiConfig', {
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
                
                // Show the modal
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
    
    // Logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
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
    
    // Profile form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileFormSubmit);
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
        { id: 'close-import-modal', modal: 'import-modal' },
        { id: 'close-profile-modal', modal: 'profile-modal' },
        { id: 'cancel-delete', modal: 'confirm-delete-modal' }
    ];
    
    closeButtons.forEach(button => {
        const el = document.getElementById(button.id);
        if (el) {
            el.addEventListener('click', () => {
                hideModal(button.modal);
            });
        }
    });
    
    // Delete account confirmation
    const deleteAccountBtn = document.getElementById('delete-account');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            hideModal('profile-modal');
            showModal('confirm-delete-modal');
        });
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            try {
                await deleteUserAccount();
                hideModal('confirm-delete-modal');
            } catch (error) {
                console.error('Error deleting account:', error);
            }
        });
    }
}

/**
 * Show a modal by ID
 * @param {string} modalId - ID of the modal to show
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Hide a modal by ID
 * @param {string} modalId - ID of the modal to hide
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Handle API form submission
 * @param {Event} e - Form submit event
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
        // Save API config
        await saveUserData('apiConfig', apiConfig);
        
        // Show success notification
        showNotification('API settings saved successfully');
        
        // Close the modal
        hideModal('api-modal');
    } catch (error) {
        console.error('Error saving API settings:', error);
        showNotification('Error saving API settings', 'error');
    }
}

/**
 * Handle profile form submission
 * @param {Event} e - Form submit event
 */
async function handleProfileFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    const currentPassword = document.getElementById('profile-current-password').value;
    const newPassword = document.getElementById('profile-new-password').value;
    const confirmPassword = document.getElementById('profile-confirm-password').value;
    
    const profileError = document.getElementById('profile-error');
    const profileSuccess = document.getElementById('profile-success');
    
    // Reset messages
    profileError.textContent = '';
    profileError.classList.add('hidden');
    profileSuccess.textContent = '';
    profileSuccess.classList.add('hidden');
    
    // Prepare update data
    const userData = { name, email };
    
    // If changing password
    if (currentPassword && newPassword) {
        if (newPassword !== confirmPassword) {
            profileError.textContent = 'New passwords do not match';
            profileError.classList.remove('hidden');
            return;
        }
        
        // Verify current password and update with new one
        try {
            const currentUser = getCurrentUser();
            if (hashPassword(currentPassword) !== currentUser.password) {
                profileError.textContent = 'Current password is incorrect';
                profileError.classList.remove('hidden');
                return;
            }
            
            userData.password = hashPassword(newPassword);
        } catch (error) {
            profileError.textContent = 'Error verifying password';
            profileError.classList.remove('hidden');
            return;
        }
    }
    
    try {
        // Update user profile
        const success = await updateUserProfile(userData);
        
        if (success) {
            profileSuccess.textContent = 'Profile updated successfully';
            profileSuccess.classList.remove('hidden');
            
            // Update user name in header
            const userNameEl = document.getElementById('current-user-name');
            if (userNameEl) {
                userNameEl.textContent = name;
            }
            
            // Clear password fields
            document.getElementById('profile-current-password').value = '';
            document.getElementById('profile-new-password').value = '';
            document.getElementById('profile-confirm-password').value = '';
        } else {
            profileError.textContent = 'Error updating profile';
            profileError.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        profileError.textContent = 'Error updating profile: ' + error.message;
        profileError.classList.remove('hidden');
    }
}

/**
 * Handle export data
 */
async function handleExportData() {
    try {
        // Load all user data
        const userData = await loadAllUserData();
        
        // Prepare export object
        const exportData = {
            type: 'platform-engagement-tracker-export',
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: userData
        };
        
        // Convert to JSON
        const jsonData = JSON.stringify(exportData, null, 2);
        
        // Create download link
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create a download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `platform-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
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
                // Parse the JSON data
                const importData = JSON.parse(e.target.result);
                
                // Validate import data
                if (!importData.type || importData.type !== 'platform-engagement-tracker-export') {
                    throw new Error('Invalid import file format');
                }
                
                // Get the current user data
                const currentData = await loadAllUserData();
                
                // Prepare the new data based on import mode
                let newData;
                
                if (importMode === 'replace') {
                    // Replace all data
                    newData = importData.data;
                } else {
                    // Merge with existing data
                    newData = {
                        apiConfig: { ...currentData.apiConfig, ...importData.data.apiConfig },
                        contentItems: mergeArrays(currentData.contentItems, importData.data.contentItems, 'id'),
                        engagementData: [...currentData.engagementData, ...importData.data.engagementData]
                    };
                }
                
                // Save the new data
                await saveUserData('apiConfig', newData.apiConfig);
                await saveUserData('contentItems', newData.contentItems);
                await saveUserData('engagementData', newData.engagementData);
                
                // Update UI
                importStatus.textContent = 'Data imported successfully';
                importStatus.className = 'mt-2 text-sm text-green-500';
                
                // Clear file input
                fileInput.value = '';
                
                // Show notification
                showNotification('Data imported successfully');
                
                // Refresh the dashboard
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
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @param {string} idField - ID field name
 * @returns {Array} Merged array
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