import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// Guards live in tools/ as CommonJS (tools/package.json sets "type": "commonjs").
const require = createRequire(import.meta.url);
const checkPackageFiles = require('../tools/check_package_files.js');
const checkTemplateSync = require('../tools/check_template_sync.js');
const checkCleanArchitecture = require('../tools/check_clean_architecture.js');
const checkSchemaUsage = require('../tools/check_schema_usage.js');

function makeFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-guard-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }
  return dir;
}

async function runOn(guard, files) {
  const dir = makeFixture(files);
  try {
    return await guard(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const violationFiles = result => result.data.violations.map(v => v.file);

test('check_package_files', async (t) => {
  const sources = {
    'bin/cli.js': "import { run } from '../src/app.js';\nrun();\n",
    'src/app.js': "export async function run() { await import('./lazy.js'); }\n",
    'src/lazy.js': 'export const lazy = true;\n',
  };

  await t.test('passes when every file reachable from bin is in "files"', async () => {
    const result = await runOn(checkPackageFiles, {
      ...sources,
      'package.json': { name: 'x', bin: { x: './bin/cli.js' }, files: ['bin/', 'src/'] },
    });
    assert.strictEqual(result.exitCode, 0, result.data.message);
    assert.strictEqual(result.skipped, false);
  });

  await t.test('fails listing static and dynamic imports missing from "files"', async () => {
    const result = await runOn(checkPackageFiles, {
      ...sources,
      'package.json': { name: 'x', bin: { x: './bin/cli.js' }, files: ['bin/'] },
    });
    assert.strictEqual(result.exitCode, 1);
    assert.deepStrictEqual(violationFiles(result).sort(), ['src/app.js', 'src/lazy.js']);
  });
});

test('check_template_sync', async (t) => {
  const synced = {
    '.agents/skills/brain/SKILL.md': '# brain\n',
    'skills/skill_a.md': '# a\n',
    'skills/integrations/x.md': '# x\n',
  };
  const mirrored = Object.fromEntries(Object.entries(synced).map(([k, v]) => [`templates/base/${k}`, v]));

  await t.test('passes when root and templates/base are identical (ignoring AGENTS.md)', async () => {
    const result = await runOn(checkTemplateSync, {
      ...synced,
      ...mirrored,
      'AGENTS.md': 'filled-in root',
      'templates/base/AGENTS.md': '{{COMPANY_NAME}}',
    });
    assert.strictEqual(result.exitCode, 0, result.data.message);
  });

  await t.test('fails on content drift and on files missing from either side', async () => {
    const result = await runOn(checkTemplateSync, {
      ...synced,
      ...mirrored,
      'skills/integrations/x.md': '# x changed\n',
      '.agents/skills/root-only/SKILL.md': '# root only\n',
      'templates/base/skills/template-only.md': '# template only\n',
    });
    assert.strictEqual(result.exitCode, 1);
    assert.deepStrictEqual(violationFiles(result).sort(), [
      '.agents/skills/root-only/SKILL.md',
      'skills/integrations/x.md',
      'templates/base/skills/template-only.md',
    ]);
  });
});

test('check_template_sync: managed sales skills', async (t) => {
  const base = { '.agents/skills/brain/SKILL.md': '# brain\n', 'templates/base/.agents/skills/brain/SKILL.md': '# brain\n' };

  await t.test('passes when every sales skill matches its root counterpart', async () => {
    const result = await runOn(checkTemplateSync, {
      ...base,
      'skills/skill_x.md': '# x\n',
      'templates/base/skills/skill_x.md': '# x\n',
      'templates/areas/sales/skills/skill_x.md': '# x\n',
    });
    assert.strictEqual(result.exitCode, 0, result.data.message);
  });

  await t.test('fails on drift and on a sales skill with no root counterpart', async () => {
    const result = await runOn(checkTemplateSync, {
      ...base,
      'skills/skill_x.md': '# x\n',
      'templates/base/skills/skill_x.md': '# x\n',
      'templates/areas/sales/skills/skill_x.md': '# x drifted\n',
      'templates/areas/sales/skills/skill_orphan.md': '# orphan\n',
    });
    assert.strictEqual(result.exitCode, 1);
    assert.deepStrictEqual(violationFiles(result).sort(), [
      'templates/areas/sales/skills/skill_orphan.md',
      'templates/areas/sales/skills/skill_x.md',
    ]);
  });
});

test('check_clean_architecture', async (t) => {
  const { MAX_BIN_LINES } = checkCleanArchitecture;

  await t.test('passes with a thin bin and an isolated core', async () => {
    const result = await runOn(checkCleanArchitecture, {
      'bin/cli.js': "import { main } from '../src/cli/main.js';\nmain();\n",
      'src/cli/main.js': "import pc from 'picocolors';\nimport { plan } from '../core/plan.js';\n",
      'src/core/plan.js': "import fs from 'node:fs';\nimport { util } from './util.js';\n",
      'src/core/util.js': 'export const util = 1;\n',
    });
    assert.strictEqual(result.exitCode, 0, result.data.message);
  });

  await t.test('fails on an oversized bin and on core importing UI or interface layers', async () => {
    const result = await runOn(checkCleanArchitecture, {
      'bin/cli.js': 'console.log(1);\n'.repeat(MAX_BIN_LINES + 1),
      'src/core/a.js': "import * as p from '@clack/prompts';\n",
      'src/core/b.js': "import { McpServer } from '../mcp/server.js';\n",
      'src/core/c.js': "const cli = require('../../bin/cli.js');\n",
    });
    assert.strictEqual(result.exitCode, 1);
    assert.deepStrictEqual(violationFiles(result).sort(), ['bin/cli.js', 'src/core/a.js', 'src/core/b.js', 'src/core/c.js']);
  });
});

test('check_schema_usage', async (t) => {
  const schema = {
    type: 'object',
    required: ['id', 'severity'],
    properties: {
      id: { type: 'string', pattern: '^[a-z0-9-]+$' },
      severity: { type: 'string', enum: ['low', 'high'] },
      triggerPhrases: { type: 'array', items: { type: 'string' }, minItems: 1 },
    },
  };

  await t.test('skips when there are no schema-governed assets', async () => {
    const result = await runOn(checkSchemaUsage, { 'README.md': '# x\n' });
    assert.strictEqual(result.skipped, true);
  });

  await t.test('passes when assets conform to their schemas', async () => {
    const result = await runOn(checkSchemaUsage, {
      'schemas/sales-objection.schema.json': schema,
      'templates/areas/sales/objections/price.json': { id: 'price', severity: 'high', triggerPhrases: ['too expensive'] },
      'templates/areas/sales/objections/price.md': 'not json, ignored',
    });
    assert.strictEqual(result.exitCode, 0, result.data.message);
    assert.strictEqual(result.skipped, false);
  });

  await t.test('fails on schema violations and invalid JSON', async () => {
    const result = await runOn(checkSchemaUsage, {
      'schemas/sales-objection.schema.json': schema,
      'templates/areas/sales/objections/bad.json': { id: 'Bad ID', severity: 'extreme', triggerPhrases: [] },
      'templates/areas/sales/objections/broken.json': '{ not json',
    });
    assert.strictEqual(result.exitCode, 1);
    const messages = result.data.violations.map(v => `${v.file}: ${v.message}`).join('\n');
    assert.match(messages, /bad\.json: \$\.id: .* does not match/);
    assert.match(messages, /bad\.json: \$\.severity: .* is not one of/);
    assert.match(messages, /bad\.json: \$\.triggerPhrases: fewer than minItems/);
    assert.match(messages, /broken\.json: Invalid JSON/);
  });
});

test('audit.runGuard', async (t) => {
  const { runGuard } = require('../tools/audit.js');

  await t.test('a guard that throws is a crash FAILURE, not a skip', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-audit-'));
    const guardPath = path.join(dir, 'check_boom.js');
    fs.writeFileSync(guardPath, "module.exports = async () => { throw new Error('kaboom'); };\n");
    try {
      const result = await runGuard(guardPath, dir);
      assert.strictEqual(result.exitCode, 1);
      assert.strictEqual(result.skipped, false);
      assert.strictEqual(result.crashed, true);
      assert.match(result.data.message, /crashed/i);
      assert.match(result.data.message, /kaboom/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
