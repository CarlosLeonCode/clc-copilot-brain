#!/usr/bin/env node
/**
 * Schema Usage Guard
 * Validates structured knowledge assets against the JSON Schemas in schemas/:
 *   templates/areas/** /battlecards/*.json -> schemas/sales-battlecard.schema.json
 *   templates/areas/** /objections/*.json  -> schemas/sales-objection.schema.json
 *   templates/areas/** /sops/*.json        -> schemas/sop.schema.json
 *   org-kernel.json (repo root)           -> schemas/org-kernel.schema.json
 * templates/base/org-kernel.json is excluded: it contains unquoted
 * {{PLACEHOLDERS}} (e.g. {{ACTIVE_AREAS_JSON}}) and is not valid JSON until
 * the CLI interpolates it at scaffold time.
 * Self-contained: uses only Node.js built-ins and a minimal validator that
 * covers the keywords those schemas use.
 *
 * @param {string} targetDir - Directory to scan (defaults to cwd)
 * @returns {{ exitCode: number, skipped: boolean, name: string, data: object }}
 */
const fs = require('fs');
const path = require('path');

const NAME = 'check_schema_usage';
const AREAS_DIR = 'templates/areas';
const DIR_SCHEMAS = {
  battlecards: 'schemas/sales-battlecard.schema.json',
  objections: 'schemas/sales-objection.schema.json',
  sops: 'schemas/sop.schema.json',
};
const KERNEL_FILES = ['org-kernel.json'];
const KERNEL_SCHEMA = 'schemas/org-kernel.schema.json';

// ── Minimal JSON Schema validator ───────────────────────────────────────────

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesType(value, type) {
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && !Number.isNaN(value);
  return typeOf(value) === type;
}

function checkFormat(value, format) {
  if (format === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
  if (format === 'date-time') return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
  return true;
}

function validate(value, schema, at = '$') {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some(t => matchesType(value, t))) {
      errors.push(`${at}: expected ${types.join('|')}, got ${typeOf(value)}`);
      return errors;
    }
  }
  if (schema.enum && !schema.enum.some(e => JSON.stringify(e) === JSON.stringify(value))) {
    errors.push(`${at}: ${JSON.stringify(value)} is not one of [${schema.enum.join(', ')}]`);
  }
  if (schema.const !== undefined && JSON.stringify(schema.const) !== JSON.stringify(value)) {
    errors.push(`${at}: must equal ${JSON.stringify(schema.const)}`);
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${at}: shorter than minLength ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${at}: longer than maxLength ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) errors.push(`${at}: "${value}" does not match ${schema.pattern}`);
    if (schema.format && !checkFormat(value, schema.format)) errors.push(`${at}: "${value}" is not a valid ${schema.format}`);
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${at}: ${value} < minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${at}: ${value} > maximum ${schema.maximum}`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${at}: fewer than minItems ${schema.minItems}`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${at}: more than maxItems ${schema.maxItems}`);
    if (schema.uniqueItems) {
      const seen = new Set(value.map(v => JSON.stringify(v)));
      if (seen.size !== value.length) errors.push(`${at}: items must be unique`);
    }
    if (schema.items) value.forEach((item, i) => errors.push(...validate(item, schema.items, `${at}[${i}]`)));
  }

  if (typeOf(value) === 'object') {
    const props = schema.properties || {};
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${at}.${key}: is required`);
    }
    for (const [key, child] of Object.entries(value)) {
      if (key in props) {
        errors.push(...validate(child, props[key], `${at}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${at}.${key}: additional property not allowed`);
      } else if (typeof schema.additionalProperties === 'object') {
        errors.push(...validate(child, schema.additionalProperties, `${at}.${key}`));
      }
    }
  }

  return errors;
}

// ── Asset discovery ─────────────────────────────────────────────────────────

function walk(absDir) {
  const out = [];
  if (!fs.existsSync(absDir)) return out;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

function toPosix(rel) {
  return rel.split(path.sep).join('/');
}

function discoverAssets(dir) {
  const assets = [];
  for (const abs of walk(path.join(dir, AREAS_DIR))) {
    if (!abs.endsWith('.json')) continue;
    const rel = toPosix(path.relative(dir, abs));
    const segments = rel.split('/').slice(0, -1);
    const kind = Object.keys(DIR_SCHEMAS).find(k => segments.includes(k));
    if (kind) assets.push({ rel, schema: DIR_SCHEMAS[kind] });
  }
  for (const rel of KERNEL_FILES) {
    if (fs.existsSync(path.join(dir, rel))) assets.push({ rel, schema: KERNEL_SCHEMA });
  }
  return assets;
}

const check = async function checkSchemaUsage(targetDir) {
  const dir = path.resolve(targetDir || process.cwd());
  const assets = discoverAssets(dir);

  if (assets.length === 0) {
    return { exitCode: 0, skipped: true, name: NAME, data: { violations: [], message: 'No schema-governed JSON assets found' } };
  }

  const violations = [];
  const schemaCache = new Map();

  for (const { rel, schema: schemaRel } of assets) {
    if (!schemaCache.has(schemaRel)) {
      try {
        schemaCache.set(schemaRel, JSON.parse(fs.readFileSync(path.join(dir, schemaRel), 'utf8')));
      } catch (err) {
        schemaCache.set(schemaRel, null);
        violations.push({ file: schemaRel, message: `Schema unavailable: ${err.message}` });
      }
    }
    const schema = schemaCache.get(schemaRel);
    if (!schema) continue;

    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));
    } catch (err) {
      violations.push({ file: rel, message: `Invalid JSON: ${err.message}` });
      continue;
    }
    for (const error of validate(data, schema)) {
      violations.push({ file: rel, message: `${error} (${schemaRel})` });
    }
  }

  return {
    exitCode: violations.length > 0 ? 1 : 0,
    skipped: false,
    name: NAME,
    data: {
      violations,
      message: violations.length > 0
        ? `${violations.length} schema violation(s) across ${assets.length} asset(s)`
        : `${assets.length} JSON asset(s) conform to their schemas`,
    },
  };
};

module.exports = check;
module.exports.validate = validate;

if (require.main === module) {
  check(process.argv[2]).then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.exitCode);
  });
}
