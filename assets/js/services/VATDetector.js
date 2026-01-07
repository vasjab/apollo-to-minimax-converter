/**
 * VAT Detector Service
 * Detects VAT rates from Excel headers and calculates from invoice amounts
 */

import { EU_VAT_RATES } from '../config/constants.js';

/**
 * Detects VAT rates from Excel worksheet headers
 * Searches for patterns like "20%", "VAT 21%", "Tax 19%", etc.
 *
 * @param {Object} worksheet - XLSX worksheet object
 * @returns {Object} Map of column letters to VAT rates (e.g., {'A': 20, 'C': 21})
 */
export function detectVATRatesInHeaders(worksheet) {
    const vatRatesByColumn = {};

    if (!worksheet || !worksheet['!ref']) {
        return vatRatesByColumn;
    }

    const XLSX = window.XLSX; // Access global XLSX from CDN
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    // Scan header row (row 0)
    for (let col = range.s.c; col <= range.e.c; col++) {
        const headerCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];

        if (headerCell && headerCell.v) {
            const headerText = String(headerCell.v);

            // Check if header contains VAT percentage info
            // Support various formats: "20%", "VAT 20%", "Tax 21%", "19% VAT", etc.
            const vatMatch = headerText.match(/(\d+(?:\.\d+)?)\s*%/);

            if (vatMatch) {
                const colLetter = XLSX.utils.encode_col(col);
                const rate = parseFloat(vatMatch[1]);
                vatRatesByColumn[colLetter] = rate;
            }
        }
    }

    return vatRatesByColumn;
}

/**
 * Maps VAT rates from headers to invoice data rows
 * Matches VAT amounts in cells to calculated VAT to find the correct rate
 *
 * @param {Array} invoiceData - Array of invoice rows
 * @param {Object} worksheet - XLSX worksheet object
 * @param {Object} vatRatesByColumn - Map of column letters to VAT rates
 * @returns {Array} Enhanced invoice data with _vatRateFromHeader property
 */
export function mapVATRatesToRows(invoiceData, worksheet, vatRatesByColumn) {
    if (!worksheet || !worksheet['!ref'] || Object.keys(vatRatesByColumn).length === 0) {
        return invoiceData;
    }

    const XLSX = window.XLSX;
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    return invoiceData.map((row, rowIndex) => {
        // Skip rows without essential data
        if (!row['Name'] && !row['Total'] && !row['Total w/ tax']) {
            return row;
        }

        // Calculate expected VAT from gross and net amounts
        const grossAmount = parseFloat(row['Total w/ tax'] || 0);
        const netAmount = parseFloat(row['Total'] || 0);
        const calculatedVAT = grossAmount - netAmount;

        // Store all found VAT rates for this row
        const vatRatesFound = [];

        // Look for columns that contain values close to the calculated VAT
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: col }); // +1 for header row
            const cell = worksheet[cellAddress];

            if (cell && cell.v) {
                const cellValue = parseFloat(cell.v);

                // Check if this cell value matches the calculated VAT (within small tolerance)
                // Use Math.abs to handle both positive and negative VAT (credit notes)
                if (!isNaN(cellValue) && !isNaN(calculatedVAT) &&
                    Math.abs(Math.abs(cellValue) - Math.abs(calculatedVAT)) < 0.01) {

                    const colLetter = XLSX.utils.encode_col(col);

                    if (vatRatesByColumn[colLetter]) {
                        vatRatesFound.push({
                            column: colLetter,
                            rate: vatRatesByColumn[colLetter],
                            amount: cellValue
                        });
                    }
                }
            }
        }

        // If we found VAT rates, use the first one
        if (vatRatesFound.length > 0) {
            row._vatRateFromHeader = vatRatesFound[0].rate;
        }

        return row;
    });
}

/**
 * Gets VAT rate from row data (uses pre-detected header rate)
 *
 * @param {Object} row - Invoice row data
 * @returns {number|null} VAT rate percentage or null if not found
 */
export function getVATRateFromData(row) {
    // Check if we found a VAT rate from the header during Excel processing
    if (row._vatRateFromHeader) {
        return row._vatRateFromHeader;
    }

    // If no VAT rate was found from Excel headers, return null
    return null;
}

/**
 * Calculates VAT rate from net and gross amounts
 *
 * @param {number} netAmount - Net amount (without VAT)
 * @param {number} grossAmount - Gross amount (with VAT)
 * @returns {number|null} Calculated VAT rate percentage or null if invalid
 */
export function calculateVATRate(netAmount, grossAmount) {
    if (!netAmount || netAmount === 0) return null;

    const vatAmount = grossAmount - netAmount;
    const rate = (vatAmount / netAmount) * 100;

    return isNaN(rate) ? null : rate;
}

/**
 * Rounds calculated VAT rate to nearest standard EU rate
 * If within 0.5% of a standard rate, uses the standard rate
 * Otherwise rounds to nearest 0.5%
 *
 * @param {number} calculatedRate - Calculated VAT rate percentage
 * @param {string} [countryCode] - ISO country code (optional, for future use)
 * @returns {number} Rounded VAT rate
 */
export function roundToStandardVATRate(calculatedRate, countryCode) {
    // All EU standard VAT rates for rounding
    const allStandardRates = [...new Set(Object.values(EU_VAT_RATES))].sort((a, b) => a - b);

    // Find the closest standard rate
    let closestRate = allStandardRates[0];
    let minDiff = Math.abs(calculatedRate - closestRate);

    for (const rate of allStandardRates) {
        const diff = Math.abs(calculatedRate - rate);
        if (diff < minDiff) {
            minDiff = diff;
            closestRate = rate;
        }
    }

    // If the difference is less than 0.5%, use the standard rate
    if (minDiff < 0.5) {
        return closestRate;
    }

    // Otherwise, round to nearest 0.5%
    return Math.round(calculatedRate * 2) / 2;
}
