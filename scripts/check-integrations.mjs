#!/usr/bin/env node
/**
 * Integration registry / catalog alignment check.
 *
 * Why this exists:
 *   The registry (lib/integrations/registry.ts) is the source of truth
 *   for what shows up in /integrations as available providers. The
 *   catalog (lib/integrations/catalog.ts) is the dispatch table Nova
 *   uses to actually call adapter clients.
 *
 *   When the two drift — a provider listed in registry as implemented:
 *   true with no corresponding catalog entry — the connect UI shows
 *   it, the user clicks, and Nova's catalog.call returns
 *   `unknown_provider:<id>`. Silent failure that looks like a bug to
 *   the user.
 *
 *   This script catches drift before it ships:
 *     - Every implemented:true provider must have a catalog entry
 *       (directly OR through an alias in REGISTRY_TO_CATALOG_ALIASES)
 *     - Every catalog entry should be reachable from at least one
 *       registry ID
 *
 * Run manually: `node scripts/check-integrations.mjs`
 * Run in CI: add to .github/workflows/ci.yml lint-test-build job.
 *
 * Exits non-zero on drift so CI can fail the PR.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');

function readSrc(rel) {
  return readFileSync(join(REPO, rel), 'utf-8');
}

// Pull every `id: 'xxx'` from registry — these are what the connect
// UI shows users.
function parseRegistry() {
  const src = readSrc('lib/integrations/registry.ts');
  const lines = src.split('\n');
  const providers = [];
  for (let i = 0; i < lines.length; i++) {
    const idMatch = lines[i].match(/id:\s*'([a-z0-9_-]+)'/);
    if (!idMatch) continue;
    // Find the matching `implemented:` within the next 25 lines.
    let implemented = null;
    for (let j = i + 1; j < Math.min(i + 26, lines.length); j++) {
      const m = lines[j].match(/implemented:\s*(true|false)/);
      if (m) { implemented = m[1] === 'true'; break; }
    }
    if (implemented !== null) {
      providers.push({ id: idMatch[1], implemented });
    }
  }
  return providers;
}

// Pull every catalog key and the alias map.
function parseCatalog() {
  const src = readSrc('lib/integrations/catalog.ts');
  const keys = new Set();
  const re = /^\s*'([a-z0-9_-]+)':\s*\{/gm;
  let m;
  while ((m = re.exec(src))) keys.add(m[1]);

  // Parse the REGISTRY_TO_CATALOG_ALIASES block.
  const aliases = {};
  const aliasBlock = src.match(/REGISTRY_TO_CATALOG_ALIASES[^=]*=\s*\{([^}]+)\}/);
  if (aliasBlock) {
    const aliasRe = /'([a-z0-9_-]+)':\s*'([a-z0-9_-]+)'/g;
    let am;
    while ((am = aliasRe.exec(aliasBlock[1]))) {
      aliases[am[1]] = am[2];
    }
  }
  return { keys, aliases };
}

const registry = parseRegistry();
const { keys: catalogKeys, aliases } = parseCatalog();

const errors = [];
const warnings = [];

// Each implemented:true provider must dispatch to a catalog entry.
for (const p of registry) {
  if (!p.implemented) continue;
  const canonical = aliases[p.id] ?? p.id;
  if (!catalogKeys.has(canonical)) {
    errors.push(
      `registry id "${p.id}" is implemented:true but has no catalog entry ` +
      `(would resolve to "${canonical}"). Either add a catalog entry, ` +
      `add an alias in REGISTRY_TO_CATALOG_ALIASES, or set implemented:false.`,
    );
  }
}

// Each catalog entry should be reachable from at least one registry ID.
const reachable = new Set();
for (const p of registry) {
  reachable.add(aliases[p.id] ?? p.id);
}
for (const k of catalogKeys) {
  if (!reachable.has(k)) {
    warnings.push(
      `catalog entry "${k}" has no registry ID pointing at it. ` +
      `Likely orphaned — either add to registry or remove from catalog.`,
    );
  }
}

const total = registry.length;
const impl = registry.filter(p => p.implemented).length;
const missing = total - impl;

console.log(`registry: ${total} providers (${impl} implemented, ${missing} marked not-yet)`);
console.log(`catalog:  ${catalogKeys.size} entries`);
console.log(`aliases:  ${Object.keys(aliases).length} mapped`);
console.log('');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✓ registry ↔ catalog alignment is clean');
  process.exit(0);
}

if (warnings.length) {
  console.log(`⚠ ${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`);
  for (const w of warnings) console.log(`  ${w}`);
  console.log('');
}

if (errors.length) {
  console.log(`✗ ${errors.length} error${errors.length === 1 ? '' : 's'}:`);
  for (const e of errors) console.log(`  ${e}`);
  process.exit(1);
}
