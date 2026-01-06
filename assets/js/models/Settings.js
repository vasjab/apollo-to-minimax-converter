/**
 * Settings Model
 * Manages application settings with optional localStorage persistence
 * Singleton pattern for application-wide settings access
 */

import { DEFAULT_SETTINGS } from '../config/defaults.js';

/**
 * Settings class - manages settings state
 */
class Settings {
    constructor() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.storageKey = 'minimax-converter-settings';
        this.persistEnabled = false; // Disabled by default
    }

    /**
     * Initializes settings
     * Loads from localStorage if persistence is enabled
     */
    init() {
        if (this.persistEnabled) {
            this.load();
        }
    }

    /**
     * Enables localStorage persistence
     * Settings will be automatically saved and loaded
     */
    enablePersistence() {
        this.persistEnabled = true;
        this.load();
    }

    /**
     * Disables localStorage persistence
     */
    disablePersistence() {
        this.persistEnabled = false;
    }

    /**
     * Gets a setting value
     *
     * @param {string} key - Setting key
     * @returns {*} Setting value or undefined
     */
    get(key) {
        return this.settings[key];
    }

    /**
     * Gets all settings
     *
     * @returns {Object} All settings
     */
    getAll() {
        return { ...this.settings };
    }

    /**
     * Updates a setting value
     *
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    update(key, value) {
        this.settings[key] = value;

        if (this.persistEnabled) {
            this.save();
        }
    }

    /**
     * Updates multiple settings at once
     *
     * @param {Object} updates - Object with key-value pairs to update
     */
    updateMultiple(updates) {
        Object.assign(this.settings, updates);

        if (this.persistEnabled) {
            this.save();
        }
    }

    /**
     * Resets settings to defaults
     */
    reset() {
        this.settings = { ...DEFAULT_SETTINGS };

        if (this.persistEnabled) {
            this.save();
        }
    }

    /**
     * Resets a specific setting to its default value
     *
     * @param {string} key - Setting key
     */
    resetKey(key) {
        if (key in DEFAULT_SETTINGS) {
            this.settings[key] = DEFAULT_SETTINGS[key];

            if (this.persistEnabled) {
                this.save();
            }
        }
    }

    /**
     * Checks if a setting exists
     *
     * @param {string} key - Setting key
     * @returns {boolean} True if setting exists
     */
    has(key) {
        return key in this.settings;
    }

    /**
     * Saves settings to localStorage
     */
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
        } catch (error) {
            console.error('Error saving settings to localStorage:', error);
        }
    }

    /**
     * Loads settings from localStorage
     * Merges with defaults to ensure all keys exist
     */
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to ensure all keys exist
                this.settings = { ...DEFAULT_SETTINGS, ...parsed };
            }
        } catch (error) {
            console.error('Error loading settings from localStorage:', error);
            // Fallback to defaults on error
            this.settings = { ...DEFAULT_SETTINGS };
        }
    }

    /**
     * Clears settings from localStorage
     */
    clearStorage() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Error clearing settings from localStorage:', error);
        }
    }

    /**
     * Validates settings object
     * Checks for required keys and valid values
     *
     * @param {Object} [settings=this.settings] - Settings to validate
     * @returns {{valid: boolean, errors: Array<string>}} Validation result
     */
    validate(settings = this.settings) {
        const errors = [];

        // Required settings
        const requiredKeys = ['invoiceType', 'businessType', 'homeCountry', 'dateFormat'];

        requiredKeys.forEach(key => {
            if (!settings[key]) {
                errors.push(`Missing required setting: ${key}`);
            }
        });

        // Validate invoice type
        const validInvoiceTypes = ['IR', 'PR', 'DI', 'FT'];
        if (settings.invoiceType && !validInvoiceTypes.includes(settings.invoiceType)) {
            errors.push(`Invalid invoice type: ${settings.invoiceType}`);
        }

        // Validate business type
        const validBusinessTypes = ['products', 'services', 'goods', 'materials'];
        if (settings.businessType && !validBusinessTypes.includes(settings.businessType)) {
            errors.push(`Invalid business type: ${settings.businessType}`);
        }

        // Validate date format
        const validDateFormats = ['auto', 'dmy', 'mdy', 'ymd'];
        if (settings.dateFormat && !validDateFormats.includes(settings.dateFormat)) {
            errors.push(`Invalid date format: ${settings.dateFormat}`);
        }

        // Validate customer code logic
        const validCodeLogic = ['hash', 'taxnumber', 'namebased', 'timestamp', 'manual'];
        if (settings.customerCodeLogic && !validCodeLogic.includes(settings.customerCodeLogic)) {
            errors.push(`Invalid customer code logic: ${settings.customerCodeLogic}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Exports settings to JSON string
     *
     * @returns {string} JSON representation
     */
    toJSON() {
        return JSON.stringify(this.settings, null, 2);
    }

    /**
     * Imports settings from JSON string
     * Validates before importing
     *
     * @param {string} json - JSON string
     * @returns {boolean} True if import successful
     */
    fromJSON(json) {
        try {
            const parsed = JSON.parse(json);
            const validation = this.validate(parsed);

            if (validation.valid) {
                this.settings = { ...DEFAULT_SETTINGS, ...parsed };

                if (this.persistEnabled) {
                    this.save();
                }

                return true;
            } else {
                console.error('Settings validation failed:', validation.errors);
                return false;
            }
        } catch (error) {
            console.error('Error importing settings from JSON:', error);
            return false;
        }
    }

    /**
     * Gets settings formatted for XML generation
     * Ensures all required fields are present
     *
     * @returns {Object} Settings object ready for XML generation
     */
    getForXMLGeneration() {
        return {
            invoiceType: this.get('invoiceType'),
            businessType: this.get('businessType'),
            includeCustomers: this.get('includeCustomers'),
            customerCodePrefix: this.get('customerCodePrefix'),
            customerCodeLogic: this.get('customerCodeLogic'),
            homeCountry: this.get('homeCountry'),
            countryColumn: this.get('countryColumn'),
            defaultVATRate: this.get('defaultVATRate'),
            dateFormat: this.get('dateFormat'),
            clearingAccount: this.get('clearingAccount')
        };
    }

    /**
     * Prints current settings to console (for debugging)
     */
    debug() {
        console.log('=== Current Settings ===');
        console.table(this.settings);
        console.log('Persistence:', this.persistEnabled ? 'Enabled' : 'Disabled');
        console.log('=======================');
    }
}

// Export singleton instance
export default new Settings();
