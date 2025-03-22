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
            
            resolve();
        };
        script.onerror = (error) => {
            console.error('Error loading app script:', error);
            reject(new Error('Failed to load app script'));
        };
        document.body.appendChild(script);
    });
}

// Load all dependencies and start the app
async function initializeApp() {
    try {
        // Load dependencies in parallel
        await Promise.all([
            loadDependency('Tailwind', 'https://cdn.tailwindcss.com', 
                () => typeof window.tailwind !== 'undefined'),
            
            loadDependency('Chart.js', 'https://cdn.jsdelivr.net/npm/chart.js', 
                () => typeof window.Chart !== 'undefined'),
            
            loadDependency('LocalForage', 'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js', 
                () => typeof window.localforage !== 'undefined'),
            
            loadDependency('CryptoJS', 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js', 
                () => typeof window.CryptoJS !== 'undefined' && typeof window.CryptoJS.SHA256 !== 'undefined')
        ]);
        
        console.log('All dependencies loaded successfully');
        
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