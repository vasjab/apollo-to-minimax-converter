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

    // Trim whitespace to ensure clean country names
    if (country) {
        country = country.trim();
    }

    return country;
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
