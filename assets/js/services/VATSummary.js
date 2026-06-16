/**
 * VAT Summary Service
 * Aggregates invoice rows into a per-country VAT breakdown that mirrors how
 * the XML generator books each row (same country detection + classification).
 */

import { getCustomerCountry, classifyCountry, getCountryISOCode } from './CountryClassifier.js';

const NO_COUNTRY_LABEL = '(no country)';
const TYPE_RANK = { domestic: 0, eu: 1, third: 2 };
const TYPE_LABELS = { domestic: 'Domestic', eu: 'EU (OSS)', third: 'Third' };

/**
 * Computes a per-country VAT breakdown.
 * Net = "Total", Gross = "Total w/ tax", VAT = Gross − Net.
 * Country detection and classification use the SAME logic as XML generation,
 * so the breakdown is an accurate preview of what will be booked.
 *
 * @param {Array} data - Parsed invoice rows
 * @param {Object} settings - { countryColumn, homeCountry } (countryColumn should already be resolved)
 * @returns {{rows: Array<{country, iso, type, typeLabel, count, net, vat, gross, rate}>, totals: Object}}
 */
export function computeVATBreakdown(data, settings) {
    const groups = new Map();

    (data || []).forEach(row => {
        const net = parseFloat(row['Total']);
        const grossParsed = parseFloat(row['Total w/ tax']);
        if (isNaN(net) && isNaN(grossParsed)) return; // skip rows with no usable amounts

        const safeNet = isNaN(net) ? 0 : net;
        const safeGross = isNaN(grossParsed) ? safeNet : grossParsed;
        const vat = safeGross - safeNet;

        const rawCountry = getCustomerCountry(row, settings.countryColumn);
        const type = classifyCountry(rawCountry, settings.homeCountry);
        const country = rawCountry || NO_COUNTRY_LABEL;
        const iso = rawCountry ? (getCountryISOCode(rawCountry) || '') : '';

        const key = `${type}|${country.toLowerCase()}`;
        if (!groups.has(key)) {
            groups.set(key, {
                country, iso, type, typeLabel: TYPE_LABELS[type] || type,
                count: 0, net: 0, vat: 0, gross: 0
            });
        }

        const g = groups.get(key);
        g.count += 1;
        g.net += safeNet;
        g.vat += vat;
        g.gross += safeGross;
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
        t.count += r.count;
        t.net += r.net;
        t.vat += r.vat;
        t.gross += r.gross;
        return t;
    }, { count: 0, net: 0, vat: 0, gross: 0 });
    totals.rate = totals.net !== 0 ? (totals.vat / totals.net) * 100 : 0;

    return { rows, totals };
}

/**
 * Serializes a breakdown to CSV text (one row per country + a TOTAL row).
 *
 * @param {{rows: Array, totals: Object}} breakdown - Output of computeVATBreakdown
 * @returns {string} CSV content
 */
export function breakdownToCSV(breakdown) {
    const header = ['Country', 'ISO', 'Type', 'Invoices', 'Net', 'VAT', 'Gross', 'Effective rate %'];

    const escape = (val) => {
        const s = String(val ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [header.join(',')];

    breakdown.rows.forEach(r => {
        lines.push([
            escape(r.country), escape(r.iso), escape(r.typeLabel),
            r.count, r.net.toFixed(2), r.vat.toFixed(2), r.gross.toFixed(2), r.rate.toFixed(2)
        ].join(','));
    });

    const t = breakdown.totals;
    lines.push([
        'TOTAL', '', '', t.count, t.net.toFixed(2), t.vat.toFixed(2), t.gross.toFixed(2), t.rate.toFixed(2)
    ].join(','));

    return lines.join('\n');
}
