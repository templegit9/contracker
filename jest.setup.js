// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn()
};
global.localStorage = localStorageMock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock console methods
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};

// Mock document.createElement for script loading
document.createElement = jest.fn((tagName) => {
    const element = {
        tagName,
        src: '',
        async: false,
        onload: null,
        onerror: null,
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    };
    return element;
});

// Mock window.location
delete window.location;
window.location = {
    ...window.location,
    reload: jest.fn(),
    assign: jest.fn(),
    replace: jest.fn(),
    href: '',
    search: '',
    hash: '',
    host: '',
    hostname: '',
    pathname: '',
    port: '',
    protocol: '',
    origin: '',
}; 