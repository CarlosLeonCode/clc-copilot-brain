// Single JSON Schema (Draft 2020-12) validation entry point for the CLI and the MCP server.
// Pure domain module: no UI, CLI, or MCP imports.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const SCHEMAS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'schemas');

export const SCHEMA_NAMES = Object.freeze(['org-kernel', 'sales-battlecard', 'sales-objection', 'sop']);

let ajv = null;
const compiled = new Map();

function getAjv() {
  if (!ajv) {
    ajv = new Ajv2020({ allErrors: true, verbose: true, strict: false });
    addFormats(ajv);
  }
  return ajv;
}

function getValidator(schemaName) {
  if (!SCHEMA_NAMES.includes(schemaName)) {
    throw new Error(`Unknown schema "${schemaName}". Expected one of: ${SCHEMA_NAMES.join(', ')}`);
  }
  if (!compiled.has(schemaName)) {
    const schemaPath = path.join(SCHEMAS_DIR, `${schemaName}.schema.json`);
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    compiled.set(schemaName, getAjv().compile(schema));
  }
  return compiled.get(schemaName);
}

// "/steps/0/title" -> "steps[0].title"
function toDottedPath(instancePath) {
  return instancePath
    .split('/')
    .slice(1)
    .map((seg) => seg.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((acc, seg) => (/^\d+$/.test(seg) ? `${acc}[${seg}]` : acc ? `${acc}.${seg}` : seg), '');
}

function formatError(err) {
  const at = toDottedPath(err.instancePath);
  const label = at || 'root';
  const { params, data } = err;
  switch (err.keyword) {
    case 'required':
      return `${at ? `${at}.` : ''}${params.missingProperty} is required`;
    case 'enum':
      return `${label}: value ${JSON.stringify(data)} not in enum [${params.allowedValues.join(', ')}]`;
    case 'pattern':
      return `${label}: string ${JSON.stringify(data)} does not match pattern ${params.pattern}`;
    case 'minLength':
      return `${label}: string length ${data.length} < minLength ${params.limit}`;
    case 'maxLength':
      return `${label}: string length ${data.length} > maxLength ${params.limit}`;
    case 'minItems':
      return `${label}: array items count ${data.length} < minItems ${params.limit}`;
    case 'maxItems':
      return `${label}: array items count ${data.length} > maxItems ${params.limit}`;
    case 'format':
      return `${label}: ${JSON.stringify(data)} is not a valid ${params.format} format`;
    case 'type':
      return `${label}: expected type ${params.type}, got ${Array.isArray(data) ? 'array' : typeof data}`;
    default:
      return `${label}: ${err.message}`;
  }
}

/**
 * Validate `data` against `schemas/<schemaName>.schema.json`.
 * @param {string} schemaName - One of SCHEMA_NAMES
 * @param {unknown} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAgainstSchema(schemaName, data) {
  const validate = getValidator(schemaName);
  const valid = validate(data);
  return { valid, errors: valid ? [] : validate.errors.map(formatError) };
}
