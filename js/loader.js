/**
 * Loader script for Platform Engagement Tracker
 * Ensures dependencies are loaded before app initialization
 */

// Dependencies check
let dependenciesReady = {
    tailwind: false,
    chartjs: false,
    localforage: false,
    cryptojs: false
};

// Dependency loader
function loadDependency(name, url, checkFn) {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (checkFn()) {
            console.log(`${name} already loaded`);
            dependenciesReady[name.toLowerCase()] = true;
            resolve();
            return;
        }
        
        console.log(`Loading ${name}...`);
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
            console.log(`${name} loaded successfully`);
            dependenciesReady[name.toLowerCase()] = true;
            resolve();
        };
        script.onerror = (error) => {
            console.error(`Error loading ${name}:`, error);
            reject(new Error(`Failed to load ${name}`));
        };
        document.head.appendChild(script);
    });
}

// Load app script after dependencies
function loadApp() {
    return new Promise((resolve, reject) => {
        // Ensure CryptoJS is actually available in the global scope
        if (typeof window.CryptoJS === 'undefined' || !window.CryptoJS.SHA256) {
            console.warn('CryptoJS not available before loading app, retrying load...');
            
            // Try to load CryptoJS again
            const cryptoScript = document.createElement('script');
            cryptoScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
            cryptoScript.onload = () => {
                console.log('CryptoJS reloaded successfully');
                dependenciesReady.cryptojs = true;
                
                // Now load the app script
                loadAppScript(resolve, reject);
            };
            cryptoScript.onerror = (error) => {
                console.error('Error reloading CryptoJS:', error);
                // Try to load app script anyway
                loadAppScript(resolve, reject);
            };
            document.head.appendChild(cryptoScript);
            return;
        }
        
        // Load app script normally
        loadAppScript(resolve, reject);
    });
}

// Helper function to load the app script
function loadAppScript(resolve, reject) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = './js/app.js';
    script.onload = () => {
        console.log('App script loaded successfully');
        
        // Hide loading indicator with fade-out effect
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.transition = 'opacity 0.5s ease-out';
            loadingIndicator.style.opacity = '0';
            setTimeout(() => {
                loadingIndicator.style.display = 'none';
            }, 500);
        }
        
        // Create direct access to auth debugging
        if (!window.authDebug) {
            window.authDebug = {
                loaderInitialized: true,
                timestamp: new Date().toISOString()
            };
        }
        
        // Create debugging console
        if (!window.debugConsole) {
            window.debugConsole = function() {
                console.log('%c===== APP DEBUG CONSOLE =====', 'color: purple; font-weight: bold;');
                console.log('App loaded at:', new Date().toISOString());
                console.log('Dependencies:', dependenciesReady);
                console.log('CryptoJS available:', typeof window.CryptoJS !== 'undefined' && typeof window.CryptoJS.SHA256 !== 'undefined');
                console.log('LocalForage available:', typeof window.localforage !== 'undefined');
                console.log('Auth module loaded:', !!window.authDebug);
                console.log('LocalStorage keys:', Object.keys(localStorage));
                console.log('%c===== END DEBUG CONSOLE =====', 'color: purple; font-weight: bold;');
            };
            
            // Auto-run debugging console after a delay
            setTimeout(window.debugConsole, 2000);
        }
        
        resolve();
    };
    script.onerror = (error) => {
        console.error('Error loading app script:', error);
        reject(new Error('Failed to load app script'));
    };
    document.body.appendChild(script);
}

// Load all dependencies and start the app
/**
 * Load all dependencies and start the app
 */
async function initializeApp() {
    try {
        console.log('Initializing application and loading dependencies...');
        
        // Check if dependencies are already loaded
        let missingDeps = [];
        
        if (typeof window.tailwind === 'undefined') missingDeps.push('tailwind');
        if (typeof window.Chart === 'undefined') missingDeps.push('chart');
        if (typeof window.localforage === 'undefined') missingDeps.push('localforage');
        if (typeof window.CryptoJS === 'undefined' || typeof window.CryptoJS.SHA256 === 'undefined') missingDeps.push('cryptojs');
        
        console.log(`Missing dependencies: ${missingDeps.length > 0 ? missingDeps.join(', ') : 'none'}`);
        
        // Load dependencies one by one to ensure proper order
        if (missingDeps.includes('tailwind')) {
            await loadDependency('Tailwind', 'https://cdn.tailwindcss.com', 
                () => typeof window.tailwind !== 'undefined');
        }
        
        if (missingDeps.includes('chart')) {
            await loadDependency('Chart.js', 'https://cdn.jsdelivr.net/npm/chart.js', 
                () => typeof window.Chart !== 'undefined');
        }
        
        if (missingDeps.includes('localforage')) {
            await loadDependency('LocalForage', 'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js', 
                () => typeof window.localforage !== 'undefined');
        }
        
        // CryptoJS is critical for authentication, ensure it's loaded
        if (missingDeps.includes('cryptojs')) {
            // Try multiple CDN sources for CryptoJS
            const cryptoJsUrls = [
                'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.js',
                'https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/crypto-js.min.js'
            ];
            
            let cryptoJsLoaded = false;
            for (const url of cryptoJsUrls) {
                try {
                    await loadDependency('CryptoJS', url, 
                        () => typeof window.CryptoJS !== 'undefined' && typeof window.CryptoJS.SHA256 !== 'undefined');
                    
                    if (typeof window.CryptoJS !== 'undefined' && typeof window.CryptoJS.SHA256 !== 'undefined') {
                        cryptoJsLoaded = true;
                        break;
                    }
                } catch (error) {
                    console.warn(`Failed to load CryptoJS from ${url}:`, error);
                }
            }
            
            if (!cryptoJsLoaded) {
                console.error('Failed to load CryptoJS from all sources - authentication will not work!');
                
                // Show a critical error to the user
                const errorDiv = document.createElement('div');
                errorDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                errorDiv.innerHTML = `
                    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md">
                        <h2 class="text-xl font-bold text-red-600 mb-4">Critical Error</h2>
                        <p class="text-gray-700 dark:text-gray-300 mb-4">
                            The application cannot load the required security components. 
                            Please try the following:
                        </p>
                        <ul class="list-disc list-inside mb-4 text-gray-700 dark:text-gray-300">
                            <li>Refresh the page</li>
                            <li>Check your internet connection</li>
                            <li>Try using a different browser</li>
                            <li>Clear your browser cache</li>
                        </ul>
                        <button onclick="window.location.reload()" 
                                class="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors">
                            Refresh Page
                        </button>
                    </div>
                `;
                document.body.appendChild(errorDiv);
                return; // Stop app initialization
            }
        }
        
        console.log('All dependencies loaded successfully');
        
        // Verify CryptoJS is loaded properly
        if (typeof window.CryptoJS !== 'undefined' && typeof window.CryptoJS.SHA256 !== 'undefined') {
            console.log('CryptoJS SHA-256 is properly available');
            
            // Test SHA-256 functionality
            const testHash = window.CryptoJS.SHA256('test').toString();
            console.log(`Test hash generated: ${testHash.substring(0, 20)}...`);
        } else {
            console.error('CryptoJS is still not available - authentication will not work!');
            
            // Show a warning to the user
            const warningDiv = document.createElement('div');
            warningDiv.className = 'p-4 bg-red-100 border-l-4 border-red-500 text-red-700 fixed top-4 right-4 z-50';
            warningDiv.innerHTML = `
                <p class="font-bold">Authentication Warning</p>
                <p>CryptoJS could not be loaded. Authentication may not work properly.</p>
                <p class="mt-2">Please try refreshing the page or check your internet connection.</p>
            `;
            document.body.appendChild(warningDiv);
        }
        
        // Load app script
        await loadApp();
        
        console.log('App initialization complete');
    } catch (error) {
        console.error('Error initializing app:', error);
        
        // Display error to user
        const errorMessage = document.createElement('div');
        errorMessage.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 max-w-md mx-auto mt-8';
        errorMessage.innerHTML = `
            <h3 class="font-bold">Application Error</h3>
            <p>There was an error loading the application: ${error.message}</p>
            <p class="mt-2">Please try refreshing the page or check your internet connection.</p>
        `;
        document.body.appendChild(errorMessage);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Expose loader globally for debugging
window.appLoader = {
    dependenciesReady,
    loadDependency,
    loadApp,
    initializeApp
};
