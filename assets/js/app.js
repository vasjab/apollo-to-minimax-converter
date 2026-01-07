/**
 * Main Application Entry Point
 * Initializes and coordinates all modules
 */

import * as UIManager from './ui/UIManager.js';
import Settings from './models/Settings.js';

/**
 * Application initialization
 */
function initApp() {
    console.log('🚀 Initializing Minimax Invoice Converter...');

    try {
        // Enable settings persistence (localStorage)
        Settings.enablePersistence();
        console.log('✓ Settings persistence enabled');

        // Initialize UI Manager (coordinates all UI modules)
        UIManager.init();
        console.log('✓ UI Manager initialized');

        console.log('✅ Application initialized successfully');

        // Log version info
        console.log('Version: 2.21 (Modular Architecture)');

    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        alert('Failed to initialize application. Please refresh the page.');
    }
}

/**
 * Entry point - runs when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded
    initApp();
}

/**
 * Export UIManager functions for potential debugging/testing
 */
if (typeof window !== 'undefined') {
    window.MinimaxConverter = {
        reset: UIManager.reset,
        getGeneratedXML: UIManager.getGeneratedXML,
        version: '2.21'
    };
}
