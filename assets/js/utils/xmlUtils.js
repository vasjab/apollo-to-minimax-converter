/**
 * XML/HTML Utility Functions
 * Escaping and encoding for XML and HTML content
 */

/**
 * Escapes HTML special characters
 * Uses DOM method for safe HTML escaping
 *
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escapes XML special characters
 * Replaces: & < > " '
 *
 * @param {string|null|undefined} text - Text to escape
 * @returns {string} XML-escaped text (empty string if null/undefined)
 */
export function escapeXml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
