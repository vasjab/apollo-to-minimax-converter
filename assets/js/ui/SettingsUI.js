/**
 * Settings UI Module
 * Handles settings panel display and interactions
 */

import { updateAccountPreview } from '../services/AccountMapper.js';

/**
 * Shows the settings panel
 * Sets up event listeners for settings changes
 */
export function showSettings() {
    document.getElementById('settingsStep').classList.remove('hidden');
    document.getElementById('xmlStep').classList.remove('hidden');

    // Add event listeners for preview updates
    document.getElementById('businessType').addEventListener('change', updateAccountPreview);

    // Add event listener for customer inclusion toggle
    document.getElementById('includeCustomers').addEventListener('change', handleCustomerInclusionChange);

    // Add event listeners for manual override fields
    const overrideFields = [
        'domesticReceivables', 'domesticRevenue', 'domesticVAT',
        'euReceivables', 'euRevenue', 'euVAT',
        'thirdReceivables', 'thirdRevenue', 'thirdVAT'
    ];

    overrideFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateAccountPreview);
        }
    });

    // Add event listener for clearing account changes
    const clearingAccountField = document.getElementById('clearingAccount');
    if (clearingAccountField) {
        clearingAccountField.addEventListener('input', updateAccountPreview);
    }

    // Initial preview update
    updateAccountPreview();
}

/**
 * Handles customer inclusion toggle
 *
 * @param {Event} e - Change event
 */
function handleCustomerInclusionChange(e) {
    const showCustomerOptions = e.target.value === 'true';
    toggleCustomerOptions(showCustomerOptions);
}

/**
 * Toggles visibility of customer-related options
 *
 * @param {boolean} show - True to show customer options
 */
export function toggleCustomerOptions(show) {
    const display = show ? 'block' : 'none';

    const customerCodeLogicContainer = document.getElementById('customerCodeLogicContainer');
    const customerCodePrefixContainer = document.getElementById('customerCodePrefixContainer');
    const customerWarning = document.getElementById('customerWarning');

    if (customerCodeLogicContainer) {
        customerCodeLogicContainer.style.display = display;
    }

    if (customerCodePrefixContainer) {
        customerCodePrefixContainer.style.display = display;
    }

    if (customerWarning) {
        customerWarning.style.display = display;
    }
}

/**
 * Hides the settings panel
 */
export function hideSettings() {
    document.getElementById('settingsStep').classList.add('hidden');
    document.getElementById('xmlStep').classList.add('hidden');
}

/**
 * Gets current settings from the UI
 *
 * @returns {Object} Settings object
 */
export function getSettingsFromUI() {
    return {
        invoiceType: document.getElementById('defaultInvoiceType')?.value || 'IR',
        businessType: document.getElementById('businessType')?.value || 'products',
        includeCustomers: document.getElementById('includeCustomers')?.value === 'true',
        customerCodePrefix: document.getElementById('customerCodePrefix')?.value || 'C',
        customerCodeLogic: document.getElementById('customerCodeLogic')?.value || 'hash',
        homeCountry: document.getElementById('homeCountry')?.value || 'Slovenia',
        countryColumn: document.getElementById('countryColumn')?.value || 'auto',
        defaultVATRate: document.getElementById('defaultVATRate')?.value || 'S',
        dateFormat: document.getElementById('dateFormat')?.value || 'auto',
        clearingAccount: document.getElementById('clearingAccount')?.value.trim() || '1652'
    };
}

/**
 * Populates settings UI with values
 *
 * @param {Object} settings - Settings object
 */
export function populateSettings(settings) {
    if (!settings) return;

    if (settings.invoiceType) {
        const elem = document.getElementById('defaultInvoiceType');
        if (elem) elem.value = settings.invoiceType;
    }

    if (settings.businessType) {
        const elem = document.getElementById('businessType');
        if (elem) elem.value = settings.businessType;
    }

    if (settings.includeCustomers !== undefined) {
        const elem = document.getElementById('includeCustomers');
        if (elem) elem.value = settings.includeCustomers.toString();
    }

    if (settings.customerCodePrefix) {
        const elem = document.getElementById('customerCodePrefix');
        if (elem) elem.value = settings.customerCodePrefix;
    }

    if (settings.customerCodeLogic) {
        const elem = document.getElementById('customerCodeLogic');
        if (elem) elem.value = settings.customerCodeLogic;
    }

    if (settings.homeCountry) {
        const elem = document.getElementById('homeCountry');
        if (elem) elem.value = settings.homeCountry;
    }

    if (settings.countryColumn) {
        const elem = document.getElementById('countryColumn');
        if (elem) elem.value = settings.countryColumn;
    }

    if (settings.defaultVATRate) {
        const elem = document.getElementById('defaultVATRate');
        if (elem) elem.value = settings.defaultVATRate;
    }

    if (settings.dateFormat) {
        const elem = document.getElementById('dateFormat');
        if (elem) elem.value = settings.dateFormat;
    }

    if (settings.clearingAccount) {
        const elem = document.getElementById('clearingAccount');
        if (elem) elem.value = settings.clearingAccount;
    }

    // Update account preview after populating
    updateAccountPreview();
}
