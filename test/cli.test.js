import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PKG_DIR = path.resolve('.');
const TEST_DIR = path.resolve('./test-scaffold');

test('CLI Suite: Copilot Brain', async (t) => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }

  await t.test('--help outputs usage and commands', () => {
    const output = execSync('node ./bin/cli.js --help', { cwd: PKG_DIR }).toString();
    assert.match(output, /Open Source Second Brain Engine/);
    assert.match(output, /init \[dir\]/);
    assert.match(output, /doctor \[dir\]/);
    assert.match(output, /add-area \[dir\]/);
    assert.match(output, /list-areas \[dir\]/);
  });

  await t.test('--version outputs version', () => {
    const output = execSync('node ./bin/cli.js --version', { cwd: PKG_DIR }).toString();
    assert.match(output, /copilot-brain v1\.0\.0/);
  });

  await t.test('init command scaffolds target directory', () => {
    const initCmd = 'node ./bin/cli.js init ./test-scaffold --yes --name "TestOrg" --industry "Software" --tagline "Test Tagline" --areas "sales,marketing,product"';
    const output = execSync(initCmd, { cwd: PKG_DIR }).toString();
    assert.match(output, /Second Brain initialized successfully/);

    assert.ok(fs.existsSync(path.join(TEST_DIR, 'org-kernel.json')), 'org-kernel.json must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'company-profile.md')), 'company-profile.md must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'AGENTS.md')), 'AGENTS.md must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.cursorrules')), '.cursorrules must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'CLAUDE.md')), 'CLAUDE.md must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.windsurfrules')), '.windsurfrules must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'GEMINI.md')), 'GEMINI.md must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.agents', 'skills', 'brain-search.md')), 'brain-search skill must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'battlecards', 'competitor-alpha.json')), 'battlecard json must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'marketing', 'brand', 'brand-guidelines.md')), 'brand guidelines must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'product', 'roadmap', 'q3-q4-product-themes.md')), 'roadmap must exist');
  });

  await t.test('doctor command audits healthy scaffold', () => {
    const output = execSync('node ./bin/cli.js doctor ./test-scaffold', { cwd: PKG_DIR }).toString();
    assert.match(output, /All Second Brain health checks passed with zero errors or warnings/);
    assert.match(output, /Errors: 0/);
  });

  await t.test('list-areas displays installed vs uninstalled', () => {
    const output = execSync('node ./bin/cli.js list-areas ./test-scaffold', { cwd: PKG_DIR }).toString();
    assert.match(output, /Sales \(sales\)/);
    assert.match(output, /Marketing \(marketing\)/);
    assert.match(output, /Product \(product\)/);
    assert.match(output, /Available Preset Areas/);
    assert.match(output, /Operations \(operations\)/);
  });

  await t.test('add-area preset adds operations', () => {
    const output = execSync('node ./bin/cli.js add-area ./test-scaffold --preset operations', { cwd: PKG_DIR }).toString();
    assert.match(output, /installed successfully/);
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'operations', 'sops', 'incident-management.json')));
  });

  await t.test('add-area custom creates domain boilerplate', () => {
    const output = execSync('node ./bin/cli.js add-area ./test-scaffold --custom devops_infra', { cwd: PKG_DIR }).toString();
    assert.match(output, /Custom area "devops_infra" created/);
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'devops_infra', 'README.md')));
  });

  await t.test('doctor passes on updated brain', () => {
    const output = execSync('node ./bin/cli.js doctor ./test-scaffold', { cwd: PKG_DIR }).toString();
    assert.match(output, /Errors: 0/);
  });

  // Cleanup
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});
