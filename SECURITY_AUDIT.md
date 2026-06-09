# Security & Bug Audit — Minimax XML Converter v2.21

Date: 2026-06-09
Scope: full application (client-side only, no backend). All JS/HTML files reviewed.

---

## Security issues

### S1. Vulnerable dependency: SheetJS (xlsx) 0.18.5 — HIGH

`index.html` loads `xlsx 0.18.5` from cdnjs. This version has two published CVEs:

- **CVE-2023-30533** — Prototype pollution when reading a crafted spreadsheet (fixed in 0.19.3).
- **CVE-2024-22363** — Regular-expression denial of service when parsing a crafted file (fixed in 0.20.2).

This app's core function is parsing spreadsheets, including files a user may have received
from someone else, so "malicious input file" is a realistic threat. Note that cdnjs stopped
receiving SheetJS updates at 0.18.5; the patched builds are distributed from
`https://cdn.sheetjs.com` (or as a vendored local copy, which is preferable — see S3).

**Fix:** upgrade to xlsx >= 0.20.2 and self-host the script.

### S2. XSS sink: unescaped `innerHTML` in MessageUI — MEDIUM

`assets/js/ui/MessageUI.js` (`showProcessing` line 13, `showMessage` line 44) interpolates the
message string into `innerHTML` without escaping. Callers pass through error text such as
`Error processing file: ${error.message}` (UIManager.js:84), and parser error messages can
incorporate content derived from a malicious uploaded file. Combined with S1 (a library known
to be exploitable via crafted files), this is a workable injection path.

The rest of the app escapes correctly (`PreviewUI` and `XMLActionsUI` use `escapeHtml`,
`XMLGenerator` uses `escapeXml` consistently) — only MessageUI is unsafe.

**Fix:** build the alert with `textContent` (or run the message through `escapeHtml`).

### S3. CDN scripts loaded without Subresource Integrity, and no CSP — MEDIUM

`index.html:10-11` loads PapaParse and xlsx from cdnjs with no `integrity`/`crossorigin`
attributes, and the page has no Content-Security-Policy. A compromised CDN (or a
man-in-the-middle on plain HTTP hosting) gets full script execution, and invoice data
(names, addresses, tax numbers) would be exposed.

**Fix:** add SRI hashes or self-host both libraries, and add a restrictive CSP
(`default-src 'self'` plus whatever the page needs; avoiding inline handlers — there is one
`onclick` in XMLActionsUI.js:169 — makes a strict CSP possible).

---

## Functional bugs — high impact (wrong accounting output)

### B1. EU / third-country receivables account is never used

`XMLGenerator.js:377` and `:499` post receivables to `row._receivablesAccount || '1200'`,
but **`_receivablesAccount` is never assigned anywhere in the codebase**. The correctly
computed `accounts.receivables` (1211 for EU, 1210 for third countries) is never referenced.
Every invoice posts receivables to the domestic account 1200, contradicting the account
mapping shown to the user in the UI preview.

**Fix:** use `accounts.receivables` in `generateReceivablesDebitEntry` /
`generateReceivablesCreditEntry`.

### B2. Manual account overrides are silently ignored in the generated XML

`XMLGenerator.js:214` calls `getAccountsByCountryType(countryType, settings.businessType)`
without the third `overrides` argument. The nine "Manual Account Overrides" fields only
affect the on-screen preview (`updateAccountPreview`), never the XML. A user who overrides
accounts gets defaults in the import file with no warning.

**Fix:** include `getManualOverrides()` in the settings collected by
`SettingsUI.getSettingsFromUI()` and pass them through to `getAccountsByCountryType`.

### B3. Unparseable or missing dates silently become *today's date*

`DateFormatter.js:16, 34, 137` — any date that is empty or fails to parse falls back to
`new Date()`. For an accounting import this silently corrupts `DatumTemeljnice`,
`DatumZapadlosti`, DDV dates, etc., with no error or warning to the user.

**Fix:** surface a row-level error (or at minimum a visible warning) instead of substituting
the current date.

### B4. Non-numeric amounts produce `NaN` in the XML

`XMLGenerator.js:186-191` — if `Total` / `Total w/ tax` is non-numeric, `parseFloat` yields
`NaN`; the zero-amount skip check (`Math.abs(NaN) < 0.001`) is false, so generation proceeds
and emits `<ZnesekVBremeVDenarniEnoti>NaN</...>`. Minimax will reject the file, or worse.

**Fix:** validate amounts per row and report bad rows.

### B5. Ambiguous dates default to the American MM/DD/YYYY format

`DateFormatter.js:167-171` — in auto-detect mode, a date like `05/03/2025` is interpreted as
May 3 rather than March 5. The tool targets Slovenian/European exports (Apollo), where
DD/MM/YYYY is the norm, so auto-detect (the recommended default in the UI) misparses every
ambiguous date.

**Fix:** default the ambiguous case to DMY, or force users to choose a format when ambiguity
is detected.

### B6. `validateInvoiceData()` is never called

`utils/validators.js:49` implements required-column and data-quality validation, but the
upload workflow (`UIManager.handleFileSelect`) never invokes it (it is referenced only by
`test-utils.html`). Files missing `Date`, `Total`, etc. flow straight into generation and
trigger B3/B4 silently.

---

## Functional bugs — medium / low

### B7. Settings persistence is dead code

`app.js:17` calls `Settings.enablePersistence()` ("✓ Settings persistence enabled"), but the
Settings model is never connected to the UI: `populateSettings()` is never called, and
`getSettingsFromUI()` reads the DOM directly without ever writing into the Settings
singleton. Nothing is actually saved or restored between sessions.

### B8. Success-message statistics use broken country logic

`UIManager.js:247-257` has its own `getCustomerCountry` that compares the setting against
`'country'` / `'countrycode'`, while the real option values are `'Country'`,
`'Shipping Country'`, `'Billing Country'` (index.html:152-157). Its auto-detect order also
differs from `CountryClassifier.getCustomerCountry` (which prefers Shipping/Billing Country).
The DDV/OSS counts shown after generation can therefore disagree with the actual XML content.

**Fix:** delete the duplicate and import the one from `CountryClassifier.js`.

### B9. Crashes on numeric cells due to `dynamicTyping: true`

PapaParse is configured with `dynamicTyping: true` (FileParser.js:100), so numeric-looking
cells arrive as numbers, and:

- `country.trim()` throws `TypeError` in `CountryClassifier.js:30` if the country column is numeric;
- `customer.taxNumber.trim()` / `.replace()` throw in `CustomerCodeGenerator.js:68-70` when
  tax numbers are purely numeric (very common) and the "taxnumber" code strategy is selected.

Side effects even when it doesn't crash: invoice numbers lose leading zeros, long tax/reference
numbers can be rendered in scientific notation.

**Fix:** coerce with `String(...)` at the boundaries, or disable `dynamicTyping` and parse
amounts explicitly.

### B10. DDV section ignores the detected VAT rate

`XMLGenerator.js:297` always writes `settings.defaultVATRate` as `SifraStopnjeDDV`, even when
a rate was detected from the file headers (`_vatRateFromHeader`). Domestic invoices at a
reduced rate are booked under the default (standard) rate code.

### B11. Customer-code hash collisions merge different customers

`utils/hash.js` produces a ~32-bit, 6-8 character code from the customer name. Distinct names
can collide, silently attributing invoices to the wrong customer in Minimax. The UI labels
this method "prevents duplicates", which is only true in the same-name direction. Consider
appending a disambiguating suffix when a generated code is already taken by a different name
(the customer map is available at generation time, so this is cheap to detect).

### B12. One bad CSV row rejects the whole file

`FileParser.js:103` aborts on `results.errors.length > 0`, but PapaParse reports non-fatal,
row-level issues (e.g. a single row with too many fields) in that same array.

**Fix:** distinguish fatal errors from row-level warnings; skip/report bad rows instead.

### B13. Excel serial date conversion can be off by one day across DST

`DateFormatter.js:46-47` converts serials with millisecond arithmetic from a *local-time*
epoch. When a DST transition falls between the epoch and the target date, the result lands at
23:00 the previous day, shifting the date. Use UTC arithmetic
(`Date.UTC(1899, 11, 30) + serial * 86400000` + `getUTC*` accessors) instead.

### B14. Vestigial column-header plumbing

`parseFile()` never returns `columnHeaders`, but `UIManager.handleFileSelect` passes
`result.columnHeaders` (always `undefined`) into `InvoiceData.setData`; the
`getVATRateFromData(row, columnHeaders)` call also passes a second argument the function
doesn't accept. Harmless today (header rates ride on `row._vatRateFromHeader`), but dead
parameters invite future bugs — either remove the plumbing or wire it up.

---

## What was checked and found OK

- XML escaping: all user-derived values in the generated XML go through `escapeXml` (no XML
  injection found); amounts/dates are program-generated.
- HTML escaping in data preview and XML preview (`escapeHtml`) — correct.
- File validation limits type and size (30 MB) before parsing.
- No secrets, tokens, or PII checked into the repository.
- No use of `eval`, `Function`, `document.write`, or `javascript:` URLs.
- Data never leaves the browser (no network calls with invoice data).
