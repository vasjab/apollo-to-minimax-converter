/**
 * UI Manager Module
 * Master coordinator for all UI components and application workflow
 */

import * as FileUploadUI from './FileUploadUI.js';
import * as SettingsUI from './SettingsUI.js';
import * as PreviewUI from './PreviewUI.js';
import * as XMLActionsUI from './XMLActionsUI.js';
import * as MessageUI from './MessageUI.js';

import { parseFile } from '../services/FileParser.js';
import { generateXML } from '../services/XMLGenerator.js';
import { classifyCountry } from '../services/CountryClassifier.js';
import InvoiceData from '../models/InvoiceData.js';
import Settings from '../models/Settings.js';

/**
 * Stores the generated XML content
 */
let generatedXML = '';

/**
 * Initializes the UI Manager and all UI modules
 * Sets up event handlers and workflow coordination
 */
export function init() {
    console.log('Initializing UI Manager...');

    // Initialize file upload UI
    FileUploadUI.init(handleFileSelect);

    // Initialize XML action button handlers
    setupXMLActionHandlers();

    // Initialize settings event handlers
    setupSettingsHandlers();

    // Initialize generate button handler
    setupGenerateButtonHandler();

    console.log('UI Manager initialized successfully');
}

/**
 * Handles file selection from upload interface
 *
 * @param {File} file - Selected file object
 */
async function handleFileSelect(file) {
    try {
        // Validate file size
        if (file.size > 30 * 1024 * 1024) {
            MessageUI.showError('File size exceeds 30MB limit. Please use a smaller file.');
            return;
        }

        MessageUI.showProcessing('Reading file...');

        // Parse the file
        const result = await parseFile(file);

        MessageUI.hideProcessing();

        // Store parsed data
        InvoiceData.setData(result.data, result.vatRatesByColumn, result.columnHeaders);

        // Display preview and statistics
        const data = InvoiceData.getData();
        PreviewUI.displayDataPreview(data);

        // Show settings panel
        SettingsUI.showSettings();

        // Show success message
        MessageUI.showSuccess(`✅ File loaded successfully! Found ${data.length} records.`);

        // Reset XML generation state
        resetXMLState();

    } catch (error) {
        MessageUI.hideProcessing();
        console.error('File processing error:', error);
        MessageUI.showError(`Error processing file: ${error.message}`);
    }
}

/**
 * Sets up XML action button handlers (download, copy, preview)
 */
function setupXMLActionHandlers() {
    const downloadBtn = document.getElementById('downloadBtn');
    const copyBtn = document.getElementById('copyBtn');
    const previewToggle = document.getElementById('previewToggle');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            XMLActionsUI.downloadXML(generatedXML);
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            XMLActionsUI.copyToClipboard(generatedXML);
        });
    }

    if (previewToggle) {
        previewToggle.addEventListener('click', () => {
            XMLActionsUI.togglePreview(generatedXML);
        });
    }
}

/**
 * Sets up settings panel event handlers
 */
function setupSettingsHandlers() {
    // Settings are initialized by SettingsUI.showSettings()
    // which is called after successful file load
}

/**
 * Sets up generate XML button handler
 */
function setupGenerateButtonHandler() {
    const generateBtn = document.getElementById('generateBtn');

    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateXML);
    }
}

/**
 * Handles XML generation workflow
 */
function handleGenerateXML() {
    try {
        const data = InvoiceData.getData();

        if (!data || data.length === 0) {
            MessageUI.showError('No data to process. Please upload a file first.');
            return;
        }

        MessageUI.showProcessing('Generating XML...');

        // Small delay to show processing indicator
        setTimeout(() => {
            try {
                // Get current settings from UI
                const settings = SettingsUI.getSettingsFromUI();

                // Get column headers from InvoiceData
                const columnHeaders = InvoiceData.getColumnHeaders();

                // Generate XML
                generatedXML = generateXML(data, settings, columnHeaders);

                if (!generatedXML || generatedXML.trim() === '') {
                    throw new Error('Generated XML is empty');
                }

                MessageUI.hideProcessing();

                // Show XML action buttons
                XMLActionsUI.showActionButtons();

                // Generate success message with statistics
                const message = buildSuccessMessage(data, settings);
                MessageUI.showSuccess(message);

            } catch (error) {
                MessageUI.hideProcessing();
                console.error('XML generation error:', error);
                MessageUI.showError(`Failed to generate XML: ${error.message}`);
            }
        }, 100);

    } catch (error) {
        console.error('Generate XML handler error:', error);
        MessageUI.showError(`Error: ${error.message}`);
    }
}

/**
 * Builds success message with statistics
 *
 * @param {Array} data - Invoice data
 * @param {Object} settings - Current settings
 * @returns {string} Success message
 */
function buildSuccessMessage(data, settings) {
    // Count DDV and OSS entries
    let ddvCount = 0;
    let ossCount = 0;

    data.forEach(row => {
        const netAmount = parseFloat(row['Total'] || 0);
        const grossAmount = parseFloat(row['Total w/ tax'] || netAmount);
        const taxAmount = grossAmount - netAmount;

        // Get customer country using the same logic as XMLGenerator
        const customerCountry = getCustomerCountry(row, settings.countryColumn);
        const countryType = classifyCountry(customerCountry, settings.homeCountry);

        if (Math.abs(taxAmount) > 0.001) {
            if (countryType === 'domestic' && settings.invoiceType === 'IR') {
                ddvCount++;
            }
            if (countryType === 'eu') {
                ossCount++;
            }
        }
    });

    // Build message
    let message = `🎉 XML generated successfully! Created ${data.length} ${settings.invoiceType} records with clearing entries`;

    if (settings.includeCustomers) {
        const stats = InvoiceData.getStats();
        message += ` with ${stats.uniqueCustomers} unique customers`;
    } else {
        message += ` (customers not included)`;
    }

    if (settings.invoiceType === 'IR') {
        message += ` | DDV entries: ${ddvCount} domestic`;
        if (ossCount > 0) {
            message += ` | OSS entries: ${ossCount} EU`;
        }
    }

    message += ` (${(generatedXML.length / 1024).toFixed(1)} KB)`;

    return message;
}

/**
 * Gets customer country from row data
 * Helper function matching XMLGenerator logic
 *
 * @param {Object} row - Invoice row data
 * @param {string} countryColumn - Country column setting
 * @returns {string} Customer country
 */
function getCustomerCountry(row, countryColumn) {
    if (countryColumn === 'auto') {
        // Auto-detect: prefer "Country" column, fallback to "Country code"
        return row['Country'] || row['Country code'] || 'Slovenia';
    } else if (countryColumn === 'country') {
        return row['Country'] || 'Slovenia';
    } else if (countryColumn === 'countrycode') {
        return row['Country code'] || 'SI';
    }
    return 'Slovenia'; // Default fallback
}

/**
 * Resets XML generation state
 * Hides action buttons and clears generated XML
 */
function resetXMLState() {
    generatedXML = '';
    XMLActionsUI.hideActionButtons();
}

/**
 * Resets the entire UI to initial state
 */
export function reset() {
    // Clear data
    InvoiceData.setData([], {}, {});
    generatedXML = '';

    // Hide all panels
    PreviewUI.hideDataPreview();
    SettingsUI.hideSettings();
    XMLActionsUI.hideActionButtons();

    // Clear messages
    MessageUI.clearMessages();

    // Reset file input
    FileUploadUI.resetFileInput();

    // Show file upload area
    FileUploadUI.show();
}

/**
 * Gets the currently generated XML content
 *
 * @returns {string} Generated XML content
 */
export function getGeneratedXML() {
    return generatedXML;
}
