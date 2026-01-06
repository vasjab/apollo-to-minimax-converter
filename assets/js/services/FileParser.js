/**
 * File Parser Service
 * Handles CSV and Excel file parsing with VAT rate detection
 */

import { detectVATRatesInHeaders, mapVATRatesToRows } from './VATDetector.js';
import { validateFile } from '../utils/validators.js';

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
                // Return data with empty vatRatesByColumn
                resolve({
                    data: results.data,
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
