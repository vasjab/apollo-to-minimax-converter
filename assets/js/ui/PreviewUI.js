/**
 * Preview UI Module
 * Handles data preview, full-row table, statistics, and per-country VAT breakdown
 */

import { escapeHtml } from '../utils/xmlUtils.js';
import { computeVATBreakdown, breakdownToCSV } from '../services/VATSummary.js';

// Safety cap so a very large file can't lock the browser rendering one huge table.
const MAX_PREVIEW_ROWS = 5000;

/**
 * Displays statistics and the full data table.
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

    const totalInvoices = data.length;
    const totalAmount = data.reduce((sum, row) => {
        const amount = parseFloat(row['Total w/ tax'] || row['Total'] || 0);
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Net (excl. VAT) = sum of the "Total" column; VAT = gross − net
    const totalNet = data.reduce((sum, row) => {
        const amount = parseFloat(row['Total']);
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    const totalVat = totalAmount - totalNet;

    const uniqueCustomers = new Set();
    data.forEach(row => {
        if (row['Name']) uniqueCustomers.add(row['Name']);
    });

    const paidInvoices = data.filter(row =>
        row['Paid'] && row['Paid'].toString().toLowerCase() === 'yes'
    ).length;

    // EUR, with thousands separators (all converter amounts are booked in EUR)
    const eur = (n) => '€' + Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

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
            <span class="stat-value">${eur(totalNet)}</span>
            <div class="stat-label">Total Net (excl. VAT)</div>
        </div>
        <div class="stat-item">
            <span class="stat-value">${eur(totalVat)}</span>
            <div class="stat-label">Total VAT</div>
        </div>
        <div class="stat-item">
            <span class="stat-value">${eur(totalAmount)}</span>
            <div class="stat-label">Total Amount (incl. VAT)</div>
        </div>
    `;

    stats.classList.remove('hidden');
}

/**
 * Displays the full table preview (all rows, capped for very large files).
 *
 * @param {Array} data - Invoice data
 */
function displayTablePreview(data) {
    const preview = document.getElementById('dataPreview');
    const headers = Object.keys(data[0]);
    const rowsToShow = Math.min(data.length, MAX_PREVIEW_ROWS);
    const capped = data.length > MAX_PREVIEW_ROWS;

    const heading = capped
        ? `📊 Data Preview (showing first ${rowsToShow.toLocaleString()} of ${data.length.toLocaleString()} rows)`
        : `📊 Data Preview (all ${data.length.toLocaleString()} rows)`;

    let html = `<h3>${escapeHtml(heading)}</h3>`;
    html += '<div class="table-container table-container--full"><table>';
    html += '<thead><tr><th class="row-idx">#</th>' +
        headers.map(h => '<th>' + escapeHtml(h) + '</th>').join('') + '</tr></thead>';
    html += '<tbody>';

    // Build with an array join — far cheaper than string concatenation for thousands of rows.
    const parts = [];
    for (let i = 0; i < rowsToShow; i++) {
        parts.push('<tr><td class="row-idx">' + (i + 1) + '</td>');
        for (const header of headers) {
            parts.push('<td>' + escapeHtml(String(data[i][header] ?? '')) + '</td>');
        }
        parts.push('</tr>');
    }
    html += parts.join('');
    html += '</tbody></table></div>';

    if (capped) {
        html += `<p class="preview-note">⚠️ Table capped at ${MAX_PREVIEW_ROWS.toLocaleString()} rows for performance. ` +
            `All ${data.length.toLocaleString()} rows are still processed and converted.</p>`;
    }

    preview.innerHTML = html;
    preview.classList.remove('hidden');
}

/**
 * Computes and renders the per-country VAT breakdown.
 * Uses the same country detection/classification as XML generation, so it
 * previews exactly what will be booked.
 *
 * @param {Array} data - Invoice data
 * @param {Object} settings - { countryColumn (already resolved), homeCountry }
 */
export function displayVATBreakdown(data, settings) {
    const container = document.getElementById('vatBreakdown');
    if (!container) return;

    if (!data || data.length === 0) {
        container.classList.add('hidden');
        return;
    }

    const breakdown = computeVATBreakdown(data, settings);
    renderVATBreakdown(container, breakdown, {
        note: 'Net = "Total", VAT = "Total w/ tax" − "Total". Effective rate is the blended VAT rate ' +
            'per country. Country grouping matches the selected Country Column and Home Country.'
    });
}

/**
 * Renders a per-country VAT breakdown into a container, with a CSV download.
 * Reusable for both the CSV/Excel preview and the imported-XML view.
 *
 * @param {HTMLElement} container - Target element
 * @param {{rows: Array, totals: Object}} breakdown - Output of computeVATBreakdown / breakdownFromInvoices
 * @param {Object} [opts]
 * @param {string} [opts.title] - Heading text
 * @param {string} [opts.note] - Explanatory note under the table
 * @param {string} [opts.downloadName] - CSV filename stem
 */
export function renderVATBreakdown(container, breakdown, opts = {}) {
    if (!container || !breakdown) return;

    const title = opts.title || '🌍 VAT Breakdown by Country';
    const downloadName = opts.downloadName || 'vat_breakdown_by_country';
    const fmt = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let html = `
        <div class="vat-breakdown-head">
            <h3>${escapeHtml(title)}</h3>
            <button class="btn btn-secondary" id="downloadBreakdownBtn" type="button">
                <span>⬇️</span> Download CSV
            </button>
        </div>
        <div class="table-container">
        <table class="breakdown-table">
            <thead><tr>
                <th>Country</th><th>ISO</th><th>Type</th>
                <th class="num">Invoices</th><th class="num">Net</th>
                <th class="num">VAT</th><th class="num">Gross</th><th class="num">Eff. rate</th>
            </tr></thead>
            <tbody>`;

    breakdown.rows.forEach(r => {
        html += `<tr>
            <td>${escapeHtml(r.country)}</td>
            <td>${escapeHtml(r.iso)}</td>
            <td><span class="badge badge-${escapeHtml(r.type)}">${escapeHtml(r.typeLabel)}</span></td>
            <td class="num">${r.count}</td>
            <td class="num">${fmt(r.net)}</td>
            <td class="num">${fmt(r.vat)}</td>
            <td class="num">${fmt(r.gross)}</td>
            <td class="num">${r.rate.toFixed(2)}%</td>
        </tr>`;
    });

    const t = breakdown.totals;
    html += `<tr class="breakdown-total">
            <td>TOTAL</td><td></td><td></td>
            <td class="num">${t.count}</td>
            <td class="num">${fmt(t.net)}</td>
            <td class="num">${fmt(t.vat)}</td>
            <td class="num">${fmt(t.gross)}</td>
            <td class="num">${t.rate.toFixed(2)}%</td>
        </tr>`;

    html += '</tbody></table></div>';
    if (opts.note) html += `<p class="preview-note">${escapeHtml(opts.note)}</p>`;

    container.innerHTML = html;
    container.classList.remove('hidden');

    const dlBtn = container.querySelector('#downloadBreakdownBtn');
    if (dlBtn) dlBtn.addEventListener('click', () => downloadBreakdownCSV(breakdown, downloadName));
}

/**
 * Downloads a breakdown as a CSV file.
 *
 * @param {{rows: Array, totals: Object}} breakdown - Breakdown to export
 * @param {string} nameStem - Filename stem (date is appended)
 */
function downloadBreakdownCSV(breakdown, nameStem) {
    if (!breakdown) return;

    const csv = breakdownToCSV(breakdown);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${nameStem}_${timestamp}.csv`;

    try {
        // BOM so Excel opens UTF-8 country names correctly.
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1000);
    } catch (err) {
        console.error('Breakdown CSV download failed:', err);
    }
}

/**
 * Hides data preview, statistics, and breakdown
 */
export function hideDataPreview() {
    document.getElementById('dataPreview')?.classList.add('hidden');
    document.getElementById('dataStats')?.classList.add('hidden');
    document.getElementById('vatBreakdown')?.classList.add('hidden');
}

/**
 * Clears preview content
 */
export function clearPreview() {
    const preview = document.getElementById('dataPreview');
    const stats = document.getElementById('dataStats');
    const breakdown = document.getElementById('vatBreakdown');

    if (preview) preview.innerHTML = '';
    if (stats) stats.innerHTML = '';
    if (breakdown) breakdown.innerHTML = '';
}
