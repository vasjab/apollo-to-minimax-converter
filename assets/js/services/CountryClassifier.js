/**
 * Country Classifier Service
 * Handles country extraction, classification (domestic/EU/third), and ISO code conversion
 */

import { EU_COUNTRIES, COUNTRY_CODES } from '../config/constants.js';

/**
 * Gets customer country from row data
 * Supports auto-detection or explicit column selection
 *
 * @param {Object} row - Invoice row data
 * @param {string} [countryColumnSetting='auto'] - Column setting ('auto' or specific column name)
 * @returns {string} Country name (trimmed)
 */
export function getCustomerCountry(row, countryColumnSetting = 'auto') {
    let country = '';

    // Auto-detect country column
    if (countryColumnSetting === 'auto') {
        // Prefer shipping country, then billing country, then generic country
        country = row['Shipping Country'] || row['Billing Country'] || row['Country'] || '';
    } else {
        // Use the explicitly selected column
        country = row[countryColumnSetting] || '';
    }

    // Coerce to string (cells may parse as numbers) and trim whitespace
    if (country) {
        country = String(country).trim();
    }

    return country || '';
}

/**
 * Classifies country as domestic, EU, or third country
 *
 * @param {string} country - Country name or ISO code
 * @param {string} homeCountry - Home country name (e.g., 'Slovenia')
 * @returns {string} Classification: 'domestic', 'eu', or 'third'
 */
export function classifyCountry(country, homeCountry) {
    if (!country) return 'domestic';

    // Normalize country names for comparison
    const normalizedCountry = country.trim();
    const normalizedHome = homeCountry.trim();

    // Check if it's the home country
    if (normalizedCountry.toLowerCase() === normalizedHome.toLowerCase()) {
        return 'domestic';
    }

    // If home country is Slovenia and country is SI (ISO code)
    if (normalizedHome.toLowerCase() === 'slovenia' && normalizedCountry.toUpperCase() === 'SI') {
        return 'domestic';
    }

    // Check if it's an EU country (check both full names and codes)
    const isEU = Object.keys(EU_COUNTRIES).some(euCountry =>
        euCountry.toLowerCase() === normalizedCountry.toLowerCase()
    ) || Object.values(EU_COUNTRIES).some(code =>
        code.toLowerCase() === normalizedCountry.toLowerCase()
    );

    if (isEU) {
        return 'eu';
    }

    // Everything else is third country
    return 'third';
}

/**
 * Converts country name to ISO code
 * If already a 2-letter code, returns uppercase version
 *
 * @param {string} countryName - Country name or code
 * @returns {string} ISO country code (2 letters, uppercase)
 */
export function getCountryISOCode(countryName) {
    if (!countryName) return '';

    const trimmed = countryName.trim();

    // Check if it's already a 2-letter code
    if (trimmed.length === 2) {
        return trimmed.toUpperCase();
    }

    // Lookup in COUNTRY_CODES mapping
    return COUNTRY_CODES[trimmed] || trimmed;
}

/**
 * Country columns the UI lets the user choose from (besides 'auto').
 * Kept in sync with the <select id="countryColumn"> options in index.html.
 */
export const SELECTABLE_COUNTRY_COLUMNS = ['Country', 'Shipping Country', 'Billing Country'];

/**
 * Columns 'auto' detection reads, in priority order.
 */
const AUTO_COUNTRY_COLUMNS = ['Shipping Country', 'Billing Country', 'Country'];

/**
 * Returns the subset of known country columns actually present in the data.
 * Scans a sample of rows (not just the first) so a sparse first row can't
 * hide a column that exists elsewhere.
 *
 * @param {Array} data - Parsed invoice rows
 * @returns {string[]} Selectable country columns present in the file
 */
export function getAvailableCountryColumns(data) {
    if (!Array.isArray(data) || data.length === 0) return [];

    const keys = new Set();
    const sample = data.slice(0, 25);
    sample.forEach(row => {
        if (row) Object.keys(row).forEach(k => keys.add(k));
    });

    return SELECTABLE_COUNTRY_COLUMNS.filter(col => keys.has(col));
}

/**
 * Resolves the effective country column for a setting against the uploaded file.
 *
 * If an explicit column is selected but isn't present in the file, falls back
 * to 'auto' and flags the fallback so callers can warn the user instead of
 * silently treating every customer as domestic.
 *
 * @param {string} countryColumn - Configured value ('auto' or a column name)
 * @param {Array} data - Parsed invoice rows
 * @returns {{column: string, fellBack: boolean, requested: string, available: string[], autoUsable: boolean}}
 */
export function resolveCountryColumn(countryColumn, data) {
    const requested = countryColumn || 'auto';
    const available = getAvailableCountryColumns(data);
    const autoUsable = AUTO_COUNTRY_COLUMNS.some(col => available.includes(col));

    if (requested !== 'auto' && !available.includes(requested)) {
        return { column: 'auto', fellBack: true, requested, available, autoUsable };
    }

    return { column: requested, fellBack: false, requested, available, autoUsable };
}

/**
 * Checks if a country is in the EU
 *
 * @param {string} country - Country name or ISO code
 * @returns {boolean} True if EU country
 */
export function isEUCountry(country) {
    if (!country) return false;

    const normalized = country.trim();

    return Object.keys(EU_COUNTRIES).some(euCountry =>
        euCountry.toLowerCase() === normalized.toLowerCase()
    ) || Object.values(EU_COUNTRIES).some(code =>
        code.toLowerCase() === normalized.toLowerCase()
    );
}
