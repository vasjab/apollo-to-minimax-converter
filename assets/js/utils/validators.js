/**
 * Validation Utilities
 * Functions for validating files, settings, and data
 */

/**
 * Validates uploaded file
 * Checks file type, size, and existence
 *
 * @param {File} file - File to validate
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateFile(file) {
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // Check file extension
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
        return {
            valid: false,
            error: 'Invalid file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls)'
        };
    }

    // Check file size (30MB limit)
    const maxSize = 30 * 1024 * 1024; // 30MB in bytes
    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'File is too large. Maximum size is 30MB.'
        };
    }

    return { valid: true, error: null };
}

/**
 * Validates invoice data array
 * Checks for required fields and data integrity
 *
 * @param {Array} data - Invoice data to validate
 * @returns {{valid: boolean, errors: Array<string>}} Validation result with list of errors
 */
export function validateInvoiceData(data) {
    const errors = [];

    if (!Array.isArray(data)) {
        errors.push('Data must be an array');
        return { valid: false, errors };
    }

    if (data.length === 0) {
        errors.push('No invoice data found');
        return { valid: false, errors };
    }

    // Check for required columns in first row (as sample)
    const requiredColumns = ['Name', 'Number', 'Date', 'Date due', 'Total', 'Total w/ tax'];
    const firstRow = data[0];

    requiredColumns.forEach(col => {
        if (!(col in firstRow)) {
            errors.push(`Missing required column: "${col}"`);
        }
    });

    // Check for data quality issues (sampling first 10 rows)
    const sampleSize = Math.min(10, data.length);
    for (let i = 0; i < sampleSize; i++) {
        const row = data[i];
        if (!row['Name'] || String(row['Name']).trim() === '') {
            errors.push(`Row ${i + 1}: Missing customer name`);
        }
        if (!row['Number'] || String(row['Number']).trim() === '') {
            errors.push(`Row ${i + 1}: Missing invoice number`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validates settings object
 * Ensures all required settings are present and valid
 *
 * @param {Object} settings - Settings object to validate
 * @returns {{valid: boolean, errors: Array<string>}} Validation result
 */
export function validateSettings(settings) {
    const errors = [];

    // Required settings
    const requiredSettings = [
        'invoiceType',
        'businessType',
        'homeCountry',
        'dateFormat'
    ];

    requiredSettings.forEach(setting => {
        if (!settings[setting]) {
            errors.push(`Missing required setting: ${setting}`);
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

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validates account number format
 * Checks if account number is numeric and reasonable length
 *
 * @param {string} accountNumber - Account number to validate
 * @returns {boolean} True if valid
 */
export function validateAccountNumber(accountNumber) {
    if (!accountNumber || accountNumber.trim() === '') {
        return true; // Empty is valid (will use default)
    }

    const trimmed = accountNumber.trim();

    // Should be numeric and between 3-6 digits
    return /^\d{3,6}$/.test(trimmed);
}
