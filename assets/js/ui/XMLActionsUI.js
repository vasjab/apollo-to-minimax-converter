/**
 * XML Actions UI Module
 * Handles XML download, copy to clipboard, and preview functionality
 */

import { escapeHtml } from '../utils/xmlUtils.js';
import { showMessage, showError, showSuccess } from './MessageUI.js';

/**
 * Downloads XML file
 *
 * @param {string} xmlContent - XML content to download
 */
export function downloadXML(xmlContent) {
    try {
        console.log('Download button clicked');

        if (!xmlContent || xmlContent.trim() === '') {
            showError('No XML to download. Please generate XML first.');
            return;
        }

        console.log('XML length:', xmlContent.length);

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `minimax_invoices_v2.21_${timestamp}.xml`;

        console.log('Attempting download with filename:', filename);

        // Method 1: Modern blob approach
        try {
            const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
            console.log('Blob created successfully');

            if (typeof URL !== 'undefined' && URL.createObjectURL) {
                const url = URL.createObjectURL(blob);
                console.log('Object URL created');

                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';

                document.body.appendChild(a);
                console.log('Triggering download');
                a.click();

                // Clean up
                setTimeout(() => {
                    if (document.body.contains(a)) {
                        document.body.removeChild(a);
                    }
                    URL.revokeObjectURL(url);
                    console.log('Download cleanup completed');
                }, 1000);

                showSuccess('🎉 XML file downloaded successfully!');
                return;
            }
        } catch (blobError) {
            console.error('Blob method failed:', blobError);
        }

        // Method 2: Data URI fallback
        console.log('Trying data URI fallback method');
        const dataStr = 'data:application/xml;charset=utf-8,' + encodeURIComponent(xmlContent);
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = filename;
        a.style.display = 'none';

        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            if (document.body.contains(a)) {
                document.body.removeChild(a);
            }
        }, 100);

        showSuccess('📁 XML file downloaded (data URI method)!');

    } catch (error) {
        console.error('Download failed:', error);
        showError('Download failed: ' + error.message + '. Please try the copy method.');

        // Auto-try copy method as fallback
        setTimeout(() => {
            copyToClipboard(xmlContent);
        }, 1000);
    }
}

/**
 * Copies XML to clipboard
 *
 * @param {string} xmlContent - XML content to copy
 */
export function copyToClipboard(xmlContent) {
    try {
        if (!xmlContent || xmlContent.trim() === '') {
            showError('No XML to copy. Please generate XML first.');
            return;
        }

        console.log('Attempting to copy XML to clipboard, length:', xmlContent.length);

        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(xmlContent).then(() => {
                showSuccess('✅ XML copied to clipboard successfully! Paste into text editor and save as .xml file.');
                console.log('Copy successful via Clipboard API');
            }).catch(err => {
                console.error('Clipboard API failed:', err);
                fallbackCopyToClipboard(xmlContent);
            });
        } else {
            console.log('Clipboard API not available, using fallback');
            fallbackCopyToClipboard(xmlContent);
        }

    } catch (error) {
        console.error('Copy error:', error);
        showError('Copy failed. Please use "Preview XML" to manually copy the content.');
        // Auto-show preview
        setTimeout(() => {
            togglePreview(xmlContent);
        }, 500);
    }
}

/**
 * Fallback method for copying to clipboard
 *
 * @param {string} xmlContent - XML content to copy
 */
function fallbackCopyToClipboard(xmlContent) {
    try {
        // Create a temporary textarea
        const textArea = document.createElement('textarea');
        textArea.value = xmlContent;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
            showSuccess('📋 XML copied to clipboard!');
        } else {
            showError('Copy failed. Please manually copy from the preview.');
            togglePreview(xmlContent); // Show preview for manual copy
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showError('Copy failed. Please manually copy from the preview.');
        togglePreview(xmlContent); // Show preview for manual copy
    }
}

/**
 * Toggles XML preview display
 *
 * @param {string} xmlContent - XML content to preview
 */
export function togglePreview(xmlContent) {
    const preview = document.getElementById('xmlPreview');
    const toggleBtn = document.getElementById('previewToggle');

    if (preview.classList.contains('hidden')) {
        if (!xmlContent || xmlContent.trim() === '') {
            showError('No XML to preview. Please generate XML first.');
            return;
        }

        const timestamp = new Date().toISOString().split('T')[0];
        preview.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3>📄 Generated XML Preview</h3>
                <button class="btn btn-success" onclick="window.selectAllXMLContent()" style="margin: 0;">
                    <span>📋</span> Select All
                </button>
            </div>
            <div style="background: #f0f0f0; padding: 10px; border-radius: 6px; margin-bottom: 10px; font-size: 0.9rem;">
                <strong>📁 Save as:</strong> minimax_invoices_v2.21_${timestamp}.xml
            </div>
            <pre id="xmlContent" style="user-select: all; cursor: text; background: #fff; border: 2px solid #667eea; max-height: 400px; overflow-y: auto;">${escapeHtml(xmlContent)}</pre>
        `;
        preview.classList.remove('hidden');
        toggleBtn.innerHTML = '<span>🙈</span> Hide Preview';
    } else {
        preview.classList.add('hidden');
        toggleBtn.innerHTML = '<span>👁️</span> Preview XML';
    }
}

/**
 * Selects all content in XML preview
 */
export function selectAllXMLContent() {
    const xmlContent = document.getElementById('xmlContent');
    if (xmlContent) {
        // Create a range and select the content
        const range = document.createRange();
        range.selectNodeContents(xmlContent);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        // Try to copy automatically
        try {
            document.execCommand('copy');
            showSuccess('📋 XML content selected and copied to clipboard!');
        } catch (err) {
            showMessage('📋 XML content selected. Press Ctrl+C to copy.', 'info');
        }
    }
}

/**
 * Shows XML action buttons (download, copy, preview)
 */
export function showActionButtons() {
    document.getElementById('downloadBtn')?.classList.remove('hidden');
    document.getElementById('copyBtn')?.classList.remove('hidden');
    document.getElementById('previewToggle')?.classList.remove('hidden');
    document.getElementById('downloadInfo')?.classList.remove('hidden');
}

/**
 * Hides XML action buttons
 */
export function hideActionButtons() {
    document.getElementById('downloadBtn')?.classList.add('hidden');
    document.getElementById('copyBtn')?.classList.add('hidden');
    document.getElementById('previewToggle')?.classList.add('hidden');
    document.getElementById('downloadInfo')?.classList.add('hidden');
}

// Make selectAllXMLContent available globally for onclick handler
if (typeof window !== 'undefined') {
    window.selectAllXMLContent = selectAllXMLContent;
}
