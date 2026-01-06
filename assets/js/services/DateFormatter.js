/**
 * Date Formatter Service
 * Handles date parsing and formatting for various input formats
 * Supports Excel serial dates, string dates (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
 */

/**
 * Formats a date value to YYYY-MM-DD format
 * Handles Excel serial numbers, string dates with various formats
 *
 * @param {number|string|Date} dateValue - Date to format (Excel serial, string, or Date object)
 * @param {string} [dateFormat='auto'] - Date format hint ('auto', 'dmy', 'mdy', 'ymd')
 * @returns {string} Date in YYYY-MM-DD format
 */
export function formatDate(dateValue, dateFormat = 'auto') {
    if (!dateValue) return new Date().toISOString().split('T')[0];

    // Handle Excel date serial numbers
    if (typeof dateValue === 'number') {
        return parseExcelSerialDate(dateValue);
    }

    // Handle string dates
    if (typeof dateValue === 'string') {
        return parseStringDate(dateValue, dateFormat);
    }

    // Handle Date objects
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        return formatDateToISO(dateValue);
    }

    // Fallback to current date
    return new Date().toISOString().split('T')[0];
}

/**
 * Parses Excel serial date number to YYYY-MM-DD format
 * Excel epoch is December 30, 1899
 *
 * @param {number} serialDate - Excel serial date number
 * @returns {string} Date in YYYY-MM-DD format
 */
export function parseExcelSerialDate(serialDate) {
    // Excel epoch is December 30, 1899
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serialDate * 24 * 60 * 60 * 1000);

    // Get the date components to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Parses string date to YYYY-MM-DD format
 * Supports formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY
 *
 * @param {string} dateString - Date string to parse
 * @param {string} [dateFormat='auto'] - Format hint ('auto', 'dmy', 'mdy', 'ymd')
 * @returns {string} Date in YYYY-MM-DD format
 */
export function parseStringDate(dateString, dateFormat = 'auto') {
    let date;

    // Handle dates with slashes (e.g., "7/1/25", "31/12/2025")
    if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
            let firstNum = parseInt(parts[0]);
            let secondNum = parseInt(parts[1]);
            let thirdNum = parseInt(parts[2]);

            let day, month, year;

            // Determine the format
            if (dateFormat === 'dmy') {
                // DD/MM/YYYY format
                day = firstNum;
                month = secondNum;
                year = thirdNum;
            } else if (dateFormat === 'mdy') {
                // MM/DD/YYYY format
                month = firstNum;
                day = secondNum;
                year = thirdNum;
            } else if (dateFormat === 'ymd') {
                // YYYY/MM/DD format
                year = firstNum;
                month = secondNum;
                day = thirdNum;
            } else {
                // Auto-detect format
                const detected = autoDetectFormat(firstNum, secondNum, thirdNum);
                day = detected.day;
                month = detected.month;
                year = detected.year;
            }

            // Handle 2-digit years
            if (year < 100) {
                year += 2000;
            }

            // Create date (month is 0-indexed in JavaScript)
            date = new Date(year, month - 1, day);
        }
    }
    // Handle dates with dashes (e.g., "2025-12-31", "31-12-2025")
    else if (dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            let firstNum = parseInt(parts[0]);
            let secondNum = parseInt(parts[1]);
            let thirdNum = parseInt(parts[2]);

            // Check if it's ISO format (YYYY-MM-DD)
            if (firstNum > 1000) {
                date = new Date(firstNum, secondNum - 1, thirdNum);
            } else {
                // Assume DD-MM-YYYY
                date = new Date(thirdNum, secondNum - 1, firstNum);
            }
        }
    } else {
        // Try parsing as standard date string
        date = new Date(dateString);
    }

    if (date && !isNaN(date.getTime())) {
        return formatDateToISO(date);
    }

    // Fallback to current date
    return new Date().toISOString().split('T')[0];
}

/**
 * Auto-detects date format from three numbers
 * Uses heuristics: year > 1000, day > 12, month > 12
 *
 * @param {number} firstNum - First number
 * @param {number} secondNum - Second number
 * @param {number} thirdNum - Third number
 * @returns {{day: number, month: number, year: number}} Detected date components
 */
export function autoDetectFormat(firstNum, secondNum, thirdNum) {
    let day, month, year;

    if (firstNum > 1000) {
        // YYYY/MM/DD format
        year = firstNum;
        month = secondNum;
        day = thirdNum;
    } else if (firstNum > 12) {
        // DD/MM/YYYY format (day can't be > 31, but month can't be > 12)
        day = firstNum;
        month = secondNum;
        year = thirdNum;
    } else if (secondNum > 12) {
        // MM/DD/YYYY format
        month = firstNum;
        day = secondNum;
        year = thirdNum;
    } else {
        // Ambiguous - default to MM/DD/YYYY for compatibility
        month = firstNum;
        day = secondNum;
        year = thirdNum;
    }

    return { day, month, year };
}

/**
 * Formats a Date object to YYYY-MM-DD string
 * Avoids timezone issues by using local date components
 *
 * @param {Date} date - Date object to format
 * @returns {string} Date in YYYY-MM-DD format
 */
export function formatDateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}
