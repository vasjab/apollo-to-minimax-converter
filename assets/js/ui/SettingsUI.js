/**
 * Settings UI Module
 * Handles settings panel display and interactions
 */

import { updateAccountPreview, getManualOverrides } from '../services/AccountMapper.js';
import { getAvailableCountryColumns, SELECTABLE_COUNTRY_COLUMNS } from '../services/CountryClassifier.js';
import Settings from '../models/Settings.js';

/**
 * Shows the settings panel
 * Sets up event listeners for settings changes
 */
export function showSettings() {
    document.getElementById('settingsStep').classList.remove('hidden');
    document.getElementById('xmlStep').classList.remove('hidden');

    // Restore persisted settings into the form
    populateSettings(Settings.getAll());

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
 * Reflects the uploaded file's available country columns in the Country Column
 * dropdown: disables/annotates options that aren't present, and if the current
 * selection is missing from the file, switches to Auto-detect. Then refreshes
 * the inline warning. Call after a file is loaded (data available).
 *
 * @param {Array} data - Parsed invoice rows
 */
export function updateCountryColumnUI(data) {
    const select = document.getElementById('countryColumn');
    if (!select) return;

    const available = getAvailableCountryColumns(data);

    SELECTABLE_COUNTRY_COLUMNS.forEach(col => {
        const option = Array.from(select.options).find(o => o.value === col);
        if (!option) return;

        const present = available.includes(col);
        option.disabled = !present;
        option.textContent = present ? col : `${col} (not in file)`;
    });

    // If the persisted/selected column isn't in this file, fall back to auto.
    if (select.value !== 'auto' && !available.includes(select.value)) {
        select.value = 'auto';
        Settings.update('countryColumn', 'auto');
    }

    updateCountryColumnWarning(data);
}

/**
 * Shows or hides the inline warning under the Country Column dropdown based on
 * whether the current selection can actually be read from the uploaded file.
 *
 * @param {Array} data - Parsed invoice rows
 */
export function updateCountryColumnWarning(data) {
    const warning = document.getElementById('countryColumnWarning');
    const select = document.getElementById('countryColumn');
    if (!warning || !select) return;

    const available = getAvailableCountryColumns(data);
    const selected = select.value;

    let message = '';

    if (selected !== 'auto' && !available.includes(selected)) {
        // Should be rare (option is disabled), but guards manual/persisted values.
        message = `⚠️ Column "${selected}" is not in this file. Conversion will fall back to ` +
            `Auto-detect so foreign customers aren't mis-booked as domestic.`;
    } else if (selected === 'auto' && available.length === 0) {
        message = '⚠️ No country column (Country / Shipping Country / Billing Country) was found in this file. ' +
            'Every customer will be treated as domestic — VAT may be wrong. Add a country column to the export.';
    } else if (available.length > 0) {
        message = `ℹ️ Country columns found in file: ${available.join(', ')}.`;
    }

    if (message) {
        warning.textContent = message;
        const isError = message.startsWith('⚠️');
        warning.classList.toggle('inline-warning--error', isError);
        warning.classList.toggle('inline-warning--info', !isError);
        warning.classList.remove('hidden');
    } else {
        warning.classList.add('hidden');
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
        clearingAccount: document.getElementById('clearingAccount')?.value.trim() || '1652',
        accountOverrides: getManualOverrides()
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
        toggleCustomerOptions(settings.includeCustomers === true || settings.includeCustomers === 'true');
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

    // Restore manual account override fields
    if (settings.accountOverrides) {
        Object.entries(settings.accountOverrides).forEach(([fieldId, value]) => {
            const elem = document.getElementById(fieldId);
            if (elem && value) elem.value = value;
        });
    }

    // Update account preview after populating
    updateAccountPreview();
}
