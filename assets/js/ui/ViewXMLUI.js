/**
 * View XML UI Module
 * Handles importing a Minimax XML file and rendering it cleanly:
 * summary stats, all invoice rows, and a per-country VAT breakdown.
 */

import { escapeHtml } from '../utils/xmlUtils.js';
import { parseMinimaxXML, breakdownFromInvoices } from '../services/XMLImporter.js';
import { renderVATBreakdown } from './PreviewUI.js';
import * as MessageUI from './MessageUI.js';

const MAX_PREVIEW_ROWS = 5000;
const MAX_FILE_SIZE = 60 * 1024 * 1024; // 60MB (generated XML is larger than the source)

const money = (n) => '€' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plain = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Initializes the View XML upload interface (click + drag-and-drop).
 */
export function init() {
    const fileInput = document.getElementById('xmlFile');
    const dropzone = document.getElementById('xmlUpload');
    if (!fileInput || !dropzone) return;

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleXMLFile(file);
    });

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragenter', (e) => e.preventDefault());
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleXMLFile(file);
    });
}

/**
 * Reads, parses, and renders an XML file.
 *
 * @param {File} file - The XML file
 */
function handleXMLFile(file) {
    if (!file.name.toLowerCase().endsWith('.xml')) {
        MessageUI.showError('Please upload an .xml file.');
        return;
    }
    if (file.size > MAX_FILE_SIZE) {
        MessageUI.showError('XML file is too large (max 60MB).');
        return;
    }

    MessageUI.showProcessing('Reading XML...');

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = parseMinimaxXML(e.target.result);
            MessageUI.hideProcessing();

            renderSummary(parsed.summary);
            renderInvoiceTable(parsed.invoices);
            renderVATBreakdown(
                document.getElementById('xmlVatBreakdown'),
                breakdownFromInvoices(parsed.invoices),
                {
                    title: '🌍 VAT Breakdown by Country (from XML)',
                    downloadName: 'xml_vat_breakdown_by_country',
                    note: 'Reconstructed from the XML: domestic from DDV entries, EU from OSS lines, ' +
                        'third countries from the customer country. Net/VAT/Gross are the booked amounts.'
                }
            );

            const warn = parsed.summary.unbalancedCount > 0
                ? ` ⚠️ ${parsed.summary.unbalancedCount} entr${parsed.summary.unbalancedCount === 1 ? 'y is' : 'ies are'} unbalanced.`
                : '';
            MessageUI.showSuccess(`✅ Loaded ${parsed.summary.invoiceCount} journal entries from ${escapeHtml(file.name)}.${warn}`);
        } catch (err) {
            MessageUI.hideProcessing();
            console.error('XML import error:', err);
            MessageUI.showError(`Could not read XML: ${err.message}`);
            hideResults();
        }
    };
    reader.onerror = () => {
        MessageUI.hideProcessing();
        MessageUI.showError('Error reading the XML file. Please try again.');
    };
    reader.readAsText(file);
}

/**
 * Renders the summary statistics grid + balance banner.
 */
function renderSummary(s) {
    const stats = document.getElementById('xmlStats');
    if (!stats) return;

    const balanceBadge = s.balanced
        ? '<span class="balance-ok">✓ Balanced</span>'
        : `<span class="balance-bad">✗ ${s.unbalancedCount} unbalanced</span>`;

    stats.innerHTML = `
        <div class="stat-item"><span class="stat-value">${s.invoiceCount}</span><div class="stat-label">Journal Entries</div></div>
        <div class="stat-item"><span class="stat-value">${s.customerCount}</span><div class="stat-label">Customers</div></div>
        <div class="stat-item"><span class="stat-value">${money(s.totalVat)}</span><div class="stat-label">Total VAT</div></div>
        <div class="stat-item"><span class="stat-value">${money(s.totalGross)}</span><div class="stat-label">Total Gross</div></div>
        <div class="stat-item"><span class="stat-value">${s.domesticCount} / ${s.euCount} / ${s.thirdCount}</span><div class="stat-label">Domestic / EU / Third</div></div>
        <div class="stat-item"><span class="stat-value">${balanceBadge}</span><div class="stat-label">Debit ${money(s.totalDebit)} · Credit ${money(s.totalCredit)}</div></div>
    `;
    stats.classList.remove('hidden');
}

/**
 * Renders the all-rows invoice table.
 */
function renderInvoiceTable(invoices) {
    const container = document.getElementById('xmlData');
    if (!container) return;

    const rowsToShow = Math.min(invoices.length, MAX_PREVIEW_ROWS);
    const capped = invoices.length > MAX_PREVIEW_ROWS;
    const heading = capped
        ? `📄 Invoices (showing first ${rowsToShow.toLocaleString()} of ${invoices.length.toLocaleString()})`
        : `📄 Invoices (all ${invoices.length.toLocaleString()})`;

    let html = `<h3>${escapeHtml(heading)}</h3>`;
    html += '<div class="table-container table-container--full"><table>';
    html += '<thead><tr>' +
        ['#', 'Invoice', 'Date', 'Doc', 'Customer', 'Country', 'VAT treatment', 'Rate', 'Net', 'VAT', 'Gross', 'Bal.']
            .map((h, i) => `<th class="${i >= 8 && i <= 10 ? 'num' : ''}">${h}</th>`).join('') +
        '</tr></thead><tbody>';

    const parts = [];
    for (let i = 0; i < rowsToShow; i++) {
        const inv = invoices[i];
        parts.push(`<tr class="${inv.balanced ? '' : 'row-unbalanced'}">`);
        parts.push(`<td class="row-idx">${inv.index}</td>`);
        parts.push(`<td>${escapeHtml(inv.number)}</td>`);
        parts.push(`<td>${escapeHtml(inv.date)}</td>`);
        parts.push(`<td>${escapeHtml(inv.docType)}</td>`);
        parts.push(`<td>${escapeHtml(inv.customerName || inv.customerCode)}</td>`);
        parts.push(`<td>${escapeHtml(inv.country)}${inv.iso ? ' (' + escapeHtml(inv.iso) + ')' : ''}</td>`);
        parts.push(`<td><span class="badge badge-${escapeHtml(inv.type)}">${escapeHtml(inv.typeLabel)}</span></td>`);
        parts.push(`<td>${escapeHtml(inv.rateLabel)}</td>`);
        parts.push(`<td class="num">${plain(inv.net)}</td>`);
        parts.push(`<td class="num">${plain(inv.vat)}</td>`);
        parts.push(`<td class="num">${plain(inv.gross)}</td>`);
        parts.push(`<td class="bal">${inv.balanced ? '✓' : '✗'}</td>`);
        parts.push('</tr>');
    }
    html += parts.join('');
    html += '</tbody></table></div>';

    if (capped) {
        html += `<p class="preview-note">⚠️ Table capped at ${MAX_PREVIEW_ROWS.toLocaleString()} rows for performance.</p>`;
    }

    container.innerHTML = html;
    container.classList.remove('hidden');
}

/**
 * Hides all View XML result panels.
 */
export function hideResults() {
    ['xmlStats', 'xmlData', 'xmlVatBreakdown'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
}
