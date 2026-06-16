/**
 * CI smoke test: import every front-end ES module (except the DOM-driven entry
 * point app.js) under a minimal browser-global stub. Catches syntax errors,
 * broken import paths, and import-time crashes without needing a browser.
 *
 * Run: node scripts/ci-check.mjs
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// --- Minimal browser-global stubs (modules only define functions at import) ---
const noop = () => {};
const fakeEl = () => ({
    textContent: '', innerHTML: '', value: '', style: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop, appendChild: noop, removeChild: noop,
    querySelector: () => null, querySelectorAll: () => [], options: []
});
globalThis.document = {
    getElementById: () => null,
    createElement: fakeEl,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: noop,
    body: { appendChild: noop, removeChild: noop, contains: () => false }
};
globalThis.window = {};
globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
globalThis.DOMParser = class { parseFromString() { return { querySelector: () => null, getElementsByTagNameNS: () => [] }; } };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS_DIR = join(ROOT, 'assets', 'js');
const SKIP = new Set(['app.js']); // app.js runs init() against the real DOM on import

function collect(dir) {
    const out = [];
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            if (name === 'vendor') continue;
            out.push(...collect(full));
        } else if (name.endsWith('.js') && !SKIP.has(name)) {
            out.push(full);
        }
    }
    return out;
}

const files = collect(JS_DIR).sort();
let failures = 0;

for (const file of files) {
    const rel = relative(ROOT, file);
    try {
        await import(pathToFileURL(file).href);
        console.log(`ok   ${rel}`);
    } catch (err) {
        failures++;
        console.error(`FAIL ${rel}\n     ${err.message}`);
    }
}

console.log(`\n${files.length - failures}/${files.length} modules loaded.`);
if (failures > 0) {
    console.error(`❌ ${failures} module(s) failed to load.`);
    process.exit(1);
}
console.log('✅ All modules loaded cleanly.');
