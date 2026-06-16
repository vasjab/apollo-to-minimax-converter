/**
 * XML Importer Service
 * Parses a Minimax import XML (as produced by this converter) back into a
 * structured, human-readable model: per-invoice rows, a VAT breakdown, and a
 * balance check. Lets the user re-open a generated file and see what's in it.
 */

import { COUNTRY_CODES } from '../config/constants.js';

const TYPE_LABELS = { domestic: 'Domestic', eu: 'EU (OSS)', third: 'Third' };
const TYPE_RANK = { domestic: 0, eu: 1, third: 2 };

// ISO code → country name (inverse of COUNTRY_CODES), e.g. 'IE' → 'Ireland'.
const ISO_TO_NAME = Object.entries(COUNTRY_CODES).reduce((map, [name, iso]) => {
    if (!map[iso]) map[iso] = name; // keep the first (canonical) name per code
    return map;
}, {});

// Minimax domestic VAT rate codes → human label.
const DDV_RATE_LABELS = { S: 'S · 22%', Z: 'Z · 9.5%', P: 'P · 5%', '0': '0 · 0%', OP: 'OP · exempt', NE: 'NE · n/a' };

/** First descendant element with the given local name, namespace-agnostic. */
function el1(root, localName) {
    return root.getElementsByTagNameNS('*', localName)[0] || null;
}

/** All descendant elements with the given local name. */
function els(root, localName) {
    return Array.from(root.getElementsByTagNameNS('*', localName));
}

/** Trimmed text of the first descendant with the given local name (''). */
function txt(root, localName) {
    const node = el1(root, localName);
    return node ? node.textContent.trim() : '';
}

/** parseFloat helper that treats blanks/garbage as 0. */
function num(value) {
    const n = parseFloat(value);
    return isNaN(n) ? 0 : n;
}

function isoToName(iso) {
    if (!iso) return '';
    return ISO_TO_NAME[iso.toUpperCase()] || iso.toUpperCase();
}

/**
 * Parses a Minimax import XML string.
 *
 * @param {string} xmlString - The XML file contents
 * @returns {{invoices: Array, customers: Map, summary: Object}}
 * @throws {Error} If the XML is empty, malformed, or has no journal entries
 */
export function parseMinimaxXML(xmlString) {
    if (!xmlString || !xmlString.trim()) {
        throw new Error('The XML file is empty.');
    }

    const doc = new DOMParser().parseFromString(xmlString, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        const detail = (parseError.textContent || 'parse error').trim().split('\n')[0];
        throw new Error('Could not parse XML: ' + detail);
    }

    if (!el1(doc, 'miniMAXUvozKnjigovodstvo') && els(doc, 'Temeljnica').length === 0) {
        throw new Error('This does not look like a Minimax import XML (no <Temeljnica> entries found).');
    }

    // --- Customers (Stranke) ---
    const customers = new Map();
    els(doc, 'Stranka').forEach(s => {
        const code = txt(s, 'Sifra');
        if (!code) return;
        const iso = (txt(s, 'KraticaDrzave') || '').toUpperCase();
        customers.set(code, {
            code,
            name: txt(s, 'Naziv'),
            iso,
            country: isoToName(iso),
            taxNumber: txt(s, 'IdentifikacijskaStevilka')
        });
    });

    // --- Invoices (Temeljnice) ---
    const invoices = els(doc, 'Temeljnica').map((t, index) => parseInvoice(t, index, customers));

    if (invoices.length === 0) {
        throw new Error('No journal entries (<Temeljnica>) found in this XML.');
    }

    const summary = buildSummary(invoices, customers);

    return { invoices, customers, summary };
}

/**
 * Parses one <Temeljnica> into an invoice row.
 */
function parseInvoice(t, index, customers) {
    const number = txt(t, 'OpisGlaveTemeljnice');
    const date = txt(t, 'DatumTemeljnice');
    const docType = txt(t, 'SifraVrsteTemeljnice');

    const lines = els(t, 'VrsticaTemeljnice').map(le => ({
        konto: txt(le, 'SifraKonta'),
        debit: num(txt(le, 'ZnesekVBremeVDenarniEnoti')),
        credit: num(txt(le, 'ZnesekVDobroVDenarniEnoti')),
        stranka: txt(le, 'SifraStranke'),
        oss: txt(le, 'PredlozitevObracunaOSS'),
        drzava: (txt(le, 'Drzava') || '').toUpperCase(),
        odstotek: txt(le, 'Odstotek'),
        osnova: num(txt(le, 'ZnesekOsnoveVDenarniEnoti'))
    }));

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    const balanced = Math.abs(totalDebit - totalCredit) < 0.005;

    const customerCode = (lines.find(l => l.stranka) || {}).stranka || '';
    const customer = customers.get(customerCode);

    // Receivables debit (first journal line in this converter's output) = gross.
    const gross = lines.length ? lines[0].debit : 0;

    const hasDDV = !!el1(t, 'DDVGlava');
    const ossLine = lines.find(l => l.oss === 'D');

    const accounts = [...new Set(lines.map(l => l.konto).filter(Boolean))];

    let type, iso, country, vat, net, rateLabel;

    if (hasDDV) {
        const stopnja = el1(t, 'DDVStopnja');
        const ddvBase = num(txt(stopnja, 'Osnova') || txt(stopnja, 'StoritevOsnova'));
        const ddvAmt = num(txt(stopnja, 'DDV') || txt(stopnja, 'StoritevDDV'));
        const rateCode = txt(stopnja, 'SifraStopnjeDDV');
        type = 'domestic';
        vat = ddvAmt;
        net = ddvBase || (gross - vat);
        iso = customer?.iso || 'SI';
        country = customer?.country || isoToName(iso) || 'Slovenia';
        rateLabel = DDV_RATE_LABELS[rateCode] || rateCode || '';
    } else if (ossLine) {
        type = 'eu';
        vat = ossLine.credit;
        net = ossLine.osnova || (gross - vat);
        iso = ossLine.drzava;
        country = isoToName(iso) || iso;
        rateLabel = ossLine.odstotek ? parseFloat(ossLine.odstotek).toFixed(2) + '%' : '';
    } else {
        type = 'third';
        vat = 0;
        net = gross;
        iso = customer?.iso || '';
        country = customer?.country || '(unknown)';
        rateLabel = '—';
    }

    return {
        index: index + 1,
        number,
        date,
        docType,
        customerCode,
        customerName: customer?.name || '',
        type,
        typeLabel: TYPE_LABELS[type] || type,
        iso,
        country,
        rateLabel,
        net,
        vat,
        gross,
        totalDebit,
        totalCredit,
        balanced,
        lineCount: lines.length,
        accounts,
        hasDDV,
        hasOSS: !!ossLine
    };
}

/**
 * Builds top-level summary stats across all invoices.
 */
function buildSummary(invoices, customers) {
    const summary = {
        invoiceCount: invoices.length,
        customerCount: customers.size,
        totalDebit: 0,
        totalCredit: 0,
        totalNet: 0,
        totalVat: 0,
        totalGross: 0,
        domesticCount: 0,
        euCount: 0,
        thirdCount: 0,
        ddvCount: 0,
        ossCount: 0,
        unbalancedCount: 0
    };

    invoices.forEach(inv => {
        summary.totalDebit += inv.totalDebit;
        summary.totalCredit += inv.totalCredit;
        summary.totalNet += inv.net;
        summary.totalVat += inv.vat;
        summary.totalGross += inv.gross;
        if (inv.type === 'domestic') summary.domesticCount++;
        if (inv.type === 'eu') summary.euCount++;
        if (inv.type === 'third') summary.thirdCount++;
        if (inv.hasDDV) summary.ddvCount++;
        if (inv.hasOSS) summary.ossCount++;
        if (!inv.balanced) summary.unbalancedCount++;
    });

    summary.balanced = Math.abs(summary.totalDebit - summary.totalCredit) < 0.005;

    return summary;
}

/**
 * Aggregates parsed invoices into a per-country VAT breakdown, in the same
 * shape as VATSummary.computeVATBreakdown so it can reuse the same renderer.
 *
 * @param {Array} invoices - Output of parseMinimaxXML().invoices
 * @returns {{rows: Array, totals: Object}}
 */
export function breakdownFromInvoices(invoices) {
    const groups = new Map();

    (invoices || []).forEach(inv => {
        const key = `${inv.type}|${(inv.country || '').toLowerCase()}`;
        if (!groups.has(key)) {
            groups.set(key, {
                country: inv.country, iso: inv.iso, type: inv.type,
                typeLabel: inv.typeLabel, count: 0, net: 0, vat: 0, gross: 0
            });
        }
        const g = groups.get(key);
        g.count += 1;
        g.net += inv.net;
        g.vat += inv.vat;
        g.gross += inv.gross;
    });

    const rows = Array.from(groups.values())
        .map(g => ({ ...g, rate: g.net !== 0 ? (g.vat / g.net) * 100 : 0 }))
        .sort((a, b) => {
            const ra = TYPE_RANK[a.type] ?? 9;
            const rb = TYPE_RANK[b.type] ?? 9;
            if (ra !== rb) return ra - rb;
            return Math.abs(b.gross) - Math.abs(a.gross);
        });

    const totals = rows.reduce((t, r) => {
        t.count += r.count; t.net += r.net; t.vat += r.vat; t.gross += r.gross;
        return t;
    }, { count: 0, net: 0, vat: 0, gross: 0 });
    totals.rate = totals.net !== 0 ? (totals.vat / totals.net) * 100 : 0;

    return { rows, totals };
}
