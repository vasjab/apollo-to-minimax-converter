/**
 * Preview UI Module
 * Handles data preview and statistics display
 */

import { escapeHtml } from '../utils/xmlUtils.js';

/**
 * Displays data preview and statistics
 *
 * @param {Array} data - Invoice data array
 */
export function displayDataPreview(data) {
    if (!data || data.length === 0) return;

    displayStatistics(data);
    displayTablePreview(data);
}

/**
 * Displays statistics
 *
 * @param {Array} data - Invoice data
 */
function displayStatistics(data) {
    const stats = document.getElementById('dataStats');

    // Calculate statistics
    const totalInvoices = data.length;
    const totalAmount = data.reduce((sum, row) => {
        const amount = parseFloat(row['Total w/ tax'] || row['Total'] || 0);
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const uniqueCustomers = new Set();
    data.forEach(row => {
        if (row['Name']) uniqueCustomers.add(row['Name']);
    });

    const paidInvoices = data.filter(row =>
        row['Paid'] && row['Paid'].toString().toLowerCase() === 'yes'
    ).length;

    // Display statistics
    stats.innerHTML = `
        <div class="stat-item">
            <span class="stat-value">${totalInvoices}</span>
            <div class="stat-label">Total Invoices</div>
        </div>
        <div class="stat-item">
            <span class="stat-value">${uniqueCustomers.size}</span>
            <div class="stat-label">Unique Customers</div>
        </div>
        <div class="stat-item">
            <span class="stat-value">${paidInvoices}</span>
            <div class="stat-label">Paid Invoices</div>
        </div>
        <div class="stat-item">
            <span class="stat-value">${totalAmount.toFixed(2)}</span>
            <div class="stat-label">Total Amount</div>
        </div>
    `;

    stats.classList.remove('hidden');
}

/**
 * Displays table preview
 *
 * @param {Array} data - Invoice data
 */
function displayTablePreview(data) {
    const preview = document.getElementById('dataPreview');
    const headers = Object.keys(data[0]);
    const maxRows = 5;

    let html = '<h3>📊 Data Preview (first ' + maxRows + ' rows)</h3>';
    html += '<div class="table-container"><table>';
    html += '<thead><tr>' + headers.map(h => '<th>' + escapeHtml(h) + '</th>').join('') + '</tr></thead>';
    html += '<tbody>';

    for (let i = 0; i < Math.min(maxRows, data.length); i++) {
        html += '<tr>';
        headers.forEach(header => {
            const value = data[i][header];
            html += '<td>' + escapeHtml(String(value || '')) + '</td>';
        });
        html += '</tr>';
    }
    html += '</tbody></table></div>';

    preview.innerHTML = html;
    preview.classList.remove('hidden');
}

/**
 * Hides data preview and statistics
 */
export function hideDataPreview() {
    const preview = document.getElementById('dataPreview');
    const stats = document.getElementById('dataStats');

    preview.classList.add('hidden');
    stats.classList.add('hidden');
}

/**
 * Clears preview content
 */
export function clearPreview() {
    const preview = document.getElementById('dataPreview');
    const stats = document.getElementById('dataStats');

    preview.innerHTML = '';
    stats.innerHTML = '';
}
