/**
 * Customer Code Generator Service
 * Generates unique customer codes using various strategies
 */

import { simpleHash } from '../utils/hash.js';

/**
 * Generates a customer code based on the selected strategy
 *
 * @param {Object} customer - Customer object with name, taxNumber, etc.
 * @param {number} index - Customer index (for sequential numbering)
 * @param {Object} settings - Settings object with customerCodeLogic and customerCodePrefix
 * @returns {string} Generated customer code
 */
export function generateCustomerCode(customer, index, settings) {
    switch (settings.customerCodeLogic) {
        case 'hash':
            return generateHashCode(customer, settings);

        case 'taxnumber':
            return generateTaxNumberCode(customer, settings, index);

        case 'namebased':
            return generateNameBasedCode(customer, settings, index);

        case 'timestamp':
            return generateTimestampCode(settings, index);

        case 'manual':
        default:
            return generateManualCode(settings, index);
    }
}

/**
 * Generates code using hash of customer name
 * Falls through to timestamp if no name available
 *
 * @param {Object} customer - Customer object
 * @param {Object} settings - Settings object
 * @returns {string} Hash-based code
 */
function generateHashCode(customer, settings) {
    if (customer.name) {
        const hash = simpleHash(customer.name.trim().toUpperCase());
        // Add optional prefix
        return settings.customerCodePrefix ? settings.customerCodePrefix + hash : hash;
    }

    // Fallback to timestamp if no name
    const timestamp = new Date().getTime().toString(36).toUpperCase();
    return settings.customerCodePrefix + timestamp;
}

/**
 * Generates code from tax number
 * Removes country prefix (e.g., SI, AT, DE)
 * Falls through to name-based if no tax number
 *
 * @param {Object} customer - Customer object
 * @param {Object} settings - Settings object
 * @param {number} index - Customer index
 * @returns {string} Tax number code
 */
function generateTaxNumberCode(customer, settings, index) {
    // Use tax number if available
    if (customer.taxNumber && customer.taxNumber.trim()) {
        // Remove common country prefixes like SI, AT, DE etc.
        return customer.taxNumber.replace(/^[A-Z]{2}/i, '').trim();
    }

    // Fallback to name-based if no tax number
    return generateNameBasedCode(customer, settings, index);
}

/**
 * Generates code from customer name
 * Extracts alphanumeric characters, uppercase, max 20 chars
 * Falls through to timestamp if no valid name
 *
 * @param {Object} customer - Customer object
 * @param {Object} settings - Settings object
 * @param {number} index - Customer index
 * @returns {string} Name-based code
 */
function generateNameBasedCode(customer, settings, index) {
    // Create code from customer name (uppercase, no spaces, alphanumeric only)
    if (customer.name) {
        const nameCode = customer.name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '') // Remove non-alphanumeric
            .substring(0, 20); // Limit to 20 chars

        if (nameCode) {
            return nameCode;
        }
    }

    // Fallback to timestamp if no valid name code
    return generateTimestampCode(settings, index);
}

/**
 * Generates code with timestamp for uniqueness
 *
 * @param {Object} settings - Settings object
 * @param {number} index - Customer index
 * @returns {string} Timestamp-based code
 */
function generateTimestampCode(settings, index) {
    // Add timestamp to make unique
    const timestamp = new Date().getTime().toString(36).toUpperCase();
    return settings.customerCodePrefix + timestamp + '_' + (index + 1);
}

/**
 * Generates manual code with prefix and sequential number
 *
 * @param {Object} settings - Settings object
 * @param {number} index - Customer index
 * @returns {string} Manual code (e.g., C001, C002)
 */
function generateManualCode(settings, index) {
    // Use prefix with index (padded to 3 digits)
    return settings.customerCodePrefix + (index + 1).toString().padStart(3, '0');
}
