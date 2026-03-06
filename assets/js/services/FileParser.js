/**
 * File Parser Service
 * Handles CSV and Excel file parsing with VAT rate detection
 * Supports both English and Slovenian export formats
 */

import { detectVATRatesInHeaders, mapVATRatesToRows } from './VATDetector.js';
import { validateFile } from '../utils/validators.js';

/**
 * Slovenian → English column name mapping
 * Maps Slovenian export headers to the English equivalents used throughout the codebase
 */
const SLOVENIAN_TO_ENGLISH = {
    'Enota': 'Unit',
    'Tip': 'Type',
    'Številka': 'Number',
    '# naročila': 'Order #',
    'Datum': 'Date',
    'Datum storitve': 'Date service',
    'do': 'to',
    'Rok plačila': 'Date due',
    'Plačan': 'Paid',
    'Način plačila': 'Paid using',
    'Referenca': 'Reference',
    'Storniran': 'Canceled',
    'Skupaj': 'Total',
    'Skupaj z davkom': 'Total w/ tax',
    'od osnove': 'of base',
    'Naziv': 'Name',
    'Naslov': 'Address',
    'Poštna št.': 'Postal code',
    'Mesto': 'City',
    'Država': 'Country',
    'Davčna št.': 'Tax number',
};

/**
 * Slovenian → English value mappings for specific columns
 */
const VALUE_MAPPINGS = {
    'Type': {
        'račun': 'invoice',
        'dobropis': 'credit note',
        'predračun': 'proforma',
        'avansni račun': 'advance invoice',
    },
    'Paid': {
        'DA': 'YES',
        'NE': 'NO',
    },
    'Canceled': {
        'STORNIRAN': 'CANCELED',
        'Storniran': 'CANCELED',
    },
};

/**
 * Parses a file (CSV or Excel) and returns invoice data
 * Main entry point for file parsing
 *
 * @param {File} file - File to parse
 * @returns {Promise<{data: Array, vatRatesByColumn: Object}>} Parsed invoice data and VAT rates
 * @throws {Error} If file is invalid or parsing fails
 */
export async function parseFile(file) {
    // Validate file first
    const validation = validateFile(file);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
        return await parseCSV(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        return await parseExcel(file);
    } else {
        throw new Error('Unsupported file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
    }
}

/**
 * Parses a CSV file using PapaParse
 *
 * @param {File} file - CSV file to parse
 * @returns {Promise<{data: Array, vatRatesByColumn: Object}>} Parsed data
 */
export function parseCSV(file) {
    return new Promise((resolve, reject) => {
        // Access Papa from global scope (loaded from CDN)
        if (typeof Papa === 'undefined') {
            reject(new Error('PapaParse library not loaded'));
            return;
        }

        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function (results) {
                if (results.errors.length > 0) {
                    reject(new Error('Error parsing CSV: ' + results.errors[0].message));
                    return;
                }

                // CSV files don't have VAT rates in headers like Excel
                // Normalize column names and values (handles Slovenian exports)
                const normalizedData = normalizeData(results.data);

                resolve({
                    data: normalizedData,
                    vatRatesByColumn: {}
                });
            },
            error: function (error) {
                reject(new Error('Error reading CSV file: ' + error.message));
            }
        });
    });
}

/**
 * Parses an Excel file using XLSX
 * Detects VAT rates from column headers and maps them to rows
 *
 * @param {File} file - Excel file to parse
 * @returns {Promise<{data: Array, vatRatesByColumn: Object}>} Parsed data with VAT rates
 */
export function parseExcel(file) {
    return new Promise((resolve, reject) => {
        // Access XLSX from global scope (loaded from CDN)
        if (typeof XLSX === 'undefined') {
            reject(new Error('XLSX library not loaded'));
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Detect VAT rates from headers
                const vatRatesByColumn = detectVATRatesInHeaders(worksheet);

                // Convert to JSON with proper date handling
                let invoiceData = XLSX.utils.sheet_to_json(worksheet, {
                    raw: false,
                    dateNF: 'yyyy-mm-dd',
                    defval: '' // Include empty cells
                });

                // Map VAT rates to rows based on matching amounts
                invoiceData = mapVATRatesToRows(invoiceData, worksheet, vatRatesByColumn);

                // Clean up data - remove empty rows and keys
                invoiceData = cleanData(invoiceData);

                // Normalize column names and values (handles Slovenian exports)
                invoiceData = normalizeData(invoiceData);

                resolve({
                    data: invoiceData,
                    vatRatesByColumn: vatRatesByColumn
                });

            } catch (error) {
                reject(new Error('Error reading Excel file: ' + error.message));
            }
        };

        reader.onerror = function () {
            reject(new Error('Error reading file. Please try again.'));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Detects if data uses Slovenian column names
 * Checks for presence of known Slovenian-only headers
 *
 * @param {Array} data - Parsed invoice data
 * @returns {boolean} True if Slovenian format detected
 */
function isSlovenianFormat(data) {
    if (!data || data.length === 0) return false;

    const firstRow = data[0];
    const keys = Object.keys(firstRow);

    // Check for Slovenian-specific column names
    const slovenianKeys = ['Tip', 'Številka', 'Naziv', 'Skupaj', 'Skupaj z davkom', 'Datum', 'Rok plačila'];
    return slovenianKeys.some(key => keys.includes(key));
}

/**
 * Normalizes invoice data from Slovenian to English format
 * Remaps column names and translates known values
 * If data is already in English format, returns it unchanged
 *
 * @param {Array} data - Parsed invoice data (may be Slovenian or English)
 * @returns {Array} Normalized data with English column names and values
 */
function normalizeData(data) {
    if (!data || data.length === 0) return data;

    // Only normalize if Slovenian format is detected
    if (!isSlovenianFormat(data)) return data;

    return data.map(row => {
        const normalizedRow = {};

        Object.keys(row).forEach(key => {
            // Map Slovenian column name to English, or keep original
            const englishKey = SLOVENIAN_TO_ENGLISH[key] || key;

            // Handle duplicate "of base" columns by checking if key already exists
            // VAT columns like "0.22" get renamed by VATDetector, "od osnove" → "of base"
            if (normalizedRow[englishKey] !== undefined && englishKey === 'of base') {
                // Append column index to make unique
                normalizedRow[key] = row[key];
            } else {
                normalizedRow[englishKey] = row[key];
            }
        });

        // Normalize values for specific columns
        for (const [column, mappings] of Object.entries(VALUE_MAPPINGS)) {
            if (normalizedRow[column]) {
                const value = String(normalizedRow[column]).trim();
                const lowerValue = value.toLowerCase();

                for (const [slovenian, english] of Object.entries(mappings)) {
                    if (lowerValue === slovenian.toLowerCase()) {
                        normalizedRow[column] = english;
                        break;
                    }
                }
            }
        }

        return normalizedRow;
    });
}

/**
 * Cleans invoice data by removing empty rows and invalid keys
 *
 * @param {Array} data - Raw invoice data
 * @returns {Array} Cleaned invoice data
 */
function cleanData(data) {
    return data.map(row => {
        const cleanRow = {};

        // Only include keys with non-empty names
        Object.keys(row).forEach(key => {
            if (key && key.trim() !== '') {
                cleanRow[key] = row[key];
            }
        });

        return cleanRow;
    }).filter(row => {
        // Filter out completely empty rows
        return Object.keys(row).length > 0;
    });
}

/**
 * Gets column headers from Excel worksheet
 * Returns a mapping of header names to column letters
 *
 * @param {Object} worksheet - XLSX worksheet object
 * @returns {Object} Map of header names to column letters (e.g., {'Name': 'A', 'Total': 'B'})
 */
export function getColumnHeaders(worksheet) {
    const columnHeaders = {};

    if (!worksheet || !worksheet['!ref']) {
        return columnHeaders;
    }

    const XLSX = window.XLSX;
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    // Scan header row (row 0)
    for (let col = range.s.c; col <= range.e.c; col++) {
        const headerCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];

        if (headerCell && headerCell.v) {
            const headerText = String(headerCell.v);
            const colLetter = XLSX.utils.encode_col(col);
            columnHeaders[headerText] = colLetter;
        }
    }

    return columnHeaders;
}
