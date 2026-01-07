/**
 * Account Mapper Service
 * Maps accounts based on country type and business type
 * Supports manual overrides for custom account numbers
 */

import { ACCOUNT_MAPPINGS } from '../config/constants.js';

/**
 * Gets account numbers for a given country type and business type
 * Applies manual overrides if provided
 *
 * @param {string} countryType - 'domestic', 'eu', or 'third'
 * @param {string} businessType - 'products', 'services', 'goods', or 'materials'
 * @param {Object} [overrides=null] - Manual account overrides
 * @returns {Object} Account numbers {receivables, revenue, vat}
 */
export function getAccountsByCountryType(countryType, businessType, overrides = null) {
    const accounts = {
        receivables: '1200',  // Default
        revenue: '7620',      // Default
        vat: '26000'          // Default
    };

    // Get base accounts from config
    const baseAccounts = ACCOUNT_MAPPINGS[countryType];

    if (!baseAccounts) {
        return accounts; // Return defaults if invalid country type
    }

    // Apply overrides if provided
    const manualOverrides = overrides || {};

    if (countryType === 'domestic') {
        // Slovenia - domestic accounts
        accounts.receivables = manualOverrides.domesticReceivables || baseAccounts.receivables;
        accounts.vat = manualOverrides.domesticVAT || baseAccounts.vat;

        if (manualOverrides.domesticRevenue) {
            accounts.revenue = manualOverrides.domesticRevenue;
        } else {
            accounts.revenue = baseAccounts.revenue[businessType] || baseAccounts.revenue.products;
        }
    } else if (countryType === 'eu') {
        // EU countries
        accounts.receivables = manualOverrides.euReceivables || baseAccounts.receivables;
        accounts.vat = manualOverrides.euVAT || baseAccounts.vat; // OSS VAT account (26002)

        if (manualOverrides.euRevenue) {
            accounts.revenue = manualOverrides.euRevenue;
        } else {
            accounts.revenue = baseAccounts.revenue[businessType] || baseAccounts.revenue.products;
        }
    } else {
        // Third countries
        accounts.receivables = manualOverrides.thirdReceivables || baseAccounts.receivables;
        accounts.vat = manualOverrides.thirdVAT || baseAccounts.vat; // No VAT by default

        if (manualOverrides.thirdRevenue) {
            accounts.revenue = manualOverrides.thirdRevenue;
        } else {
            accounts.revenue = baseAccounts.revenue[businessType] || baseAccounts.revenue.products;
        }
    }

    return accounts;
}

/**
 * Gets manual account overrides from DOM elements
 * Used by SettingsUI to retrieve user-configured account numbers
 *
 * @returns {Object} Manual overrides object
 */
export function getManualOverrides() {
    return {
        domesticReceivables: document.getElementById('domesticReceivables')?.value.trim() || '',
        domesticRevenue: document.getElementById('domesticRevenue')?.value.trim() || '',
        domesticVAT: document.getElementById('domesticVAT')?.value.trim() || '',
        euReceivables: document.getElementById('euReceivables')?.value.trim() || '',
        euRevenue: document.getElementById('euRevenue')?.value.trim() || '',
        euVAT: document.getElementById('euVAT')?.value.trim() || '',
        thirdReceivables: document.getElementById('thirdReceivables')?.value.trim() || '',
        thirdRevenue: document.getElementById('thirdRevenue')?.value.trim() || '',
        thirdVAT: document.getElementById('thirdVAT')?.value.trim() || ''
    };
}

/**
 * Updates the account preview in the UI
 * Shows example accounts for domestic, EU, and third country transactions
 * Used by SettingsUI to display account mappings to users
 */
export function updateAccountPreview() {
    const businessType = document.getElementById('businessType')?.value || 'products';
    const overrides = getManualOverrides();

    // Get accounts for each market type
    const domesticAccounts = getAccountsByCountryType('domestic', businessType, overrides);
    const euAccounts = getAccountsByCountryType('eu', businessType, overrides);
    const thirdAccounts = getAccountsByCountryType('third', businessType, overrides);

    // Update preview displays
    const domesticPreview = document.getElementById('domesticPreview');
    if (domesticPreview) {
        domesticPreview.textContent =
            `Receivables: ${domesticAccounts.receivables} | Revenue: ${domesticAccounts.revenue} | VAT: ${domesticAccounts.vat} | DDV: YES`;
    }

    const euPreview = document.getElementById('euPreview');
    if (euPreview) {
        euPreview.textContent =
            `Receivables: ${euAccounts.receivables} | Revenue: ${euAccounts.revenue} | VAT: ${euAccounts.vat} (OSS) | DDV: NO`;
    }

    const thirdPreview = document.getElementById('thirdPreview');
    if (thirdPreview) {
        thirdPreview.textContent =
            `Receivables: ${thirdAccounts.receivables} | Revenue: ${thirdAccounts.revenue} | VAT: ${thirdAccounts.vat || 'No VAT'} | DDV: NO`;
    }

    // Update clearing account preview
    const clearingAccount = document.getElementById('clearingAccount')?.value.trim() || '1652';
    const clearingPreview = document.getElementById('clearingPreview');
    if (clearingPreview) {
        clearingPreview.textContent = clearingAccount;
    }
}
