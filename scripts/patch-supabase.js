/**
 * Patches @supabase/supabase-js to remove a dynamic import() call that hermesc
 * (Hermes AOT compiler) cannot parse. The call lazy-loads @opentelemetry/api,
 * which is an optional peer dep not used in this React Native app. The original
 * code already wraps the import in .catch(() => null), so returning
 * Promise.resolve(null) is functionally identical for our environment.
 *
 * This runs as a postinstall script so EAS cloud builds pick it up automatically.
 */

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'node_modules', '@supabase', 'supabase-js', 'dist');
const FILES = ['index.cjs', 'index.mjs'];

// Matches the multi-line dynamic import block across both cjs and mjs variants
const PATTERN = /otelModulePromise = import\([\s\S]*?\)\.catch\(\(\)\s*=>\s*null\)/;
const REPLACEMENT = 'otelModulePromise = Promise.resolve(null)';

let patched = 0;
for (const file of FILES) {
  const filePath = path.join(DIST, file);
  if (!fs.existsSync(filePath)) continue;

  const original = fs.readFileSync(filePath, 'utf8');
  const modified = original.replace(PATTERN, REPLACEMENT);

  if (modified !== original) {
    fs.writeFileSync(filePath, modified, 'utf8');
    console.log(`[postinstall] Patched OTel dynamic import in @supabase/supabase-js/dist/${file}`);
    patched++;
  }
}

if (patched === 0) {
  console.log('[postinstall] @supabase/supabase-js: already patched or pattern not found — no changes made');
}
