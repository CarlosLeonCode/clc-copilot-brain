import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Scaffolds go to an isolated temp dir so tests never write into the repository.
const SANDBOX = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-cli-'));
const TEST_DIR = path.join(SANDBOX, 'test-scaffold-flags');
const TEST_DIR_DEFAULTS = path.join(SANDBOX, 'test-scaffold-defaults');

test('CLI Suite: Copilot Brain', async (t) => {
  t.after(() => fs.rmSync(SANDBOX, { recursive: true, force: true }));

  await t.test('CLI help & version output', async (sub) => {
    await sub.test('--help and -h outputs usage and available commands', () => {
      const helpOutput = execSync(`"${process.execPath}" ./bin/cli.js --help`, { cwd: PKG_DIR }).toString();
      assert.match(helpOutput, /Open Source Second Brain Engine/);
      assert.match(helpOutput, /init \[dir\]/);
      assert.match(helpOutput, /doctor \[dir\]/);
      assert.match(helpOutput, /add-area \[dir\]/);
      assert.match(helpOutput, /list-areas \[dir\]/);

      const hOutput = execSync(`"${process.execPath}" ./bin/cli.js -h`, { cwd: PKG_DIR }).toString();
      assert.match(hOutput, /Open Source Second Brain Engine/);

      const helpCmdOutput = execSync(`"${process.execPath}" ./bin/cli.js help`, { cwd: PKG_DIR }).toString();
      assert.match(helpCmdOutput, /Open Source Second Brain Engine/);
    });

    await sub.test('--version and -v outputs version matching package.json', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(PKG_DIR, 'package.json'), 'utf8'));
      const versionOutput = execSync(`"${process.execPath}" ./bin/cli.js --version`, { cwd: PKG_DIR }).toString();
      assert.match(versionOutput, new RegExp(`copilot-brain v${pkg.version.replace('.', '\\.')}`));

      const vOutput = execSync(`"${process.execPath}" ./bin/cli.js -v`, { cwd: PKG_DIR }).toString();
      assert.match(vOutput, new RegExp(`copilot-brain v${pkg.version.replace('.', '\\.')}`));
    });
  });

  await t.test('Scaffolding a new second brain via init with interactive defaults and flags', async (sub) => {
    await sub.test('init scaffolds target with explicit flags', () => {
      const initCmd = `"${process.execPath}" ./bin/cli.js init "${TEST_DIR}" --yes --demo --name "TestOrg" --industry "Developer Tools" --tagline "Test Tagline" --areas "sales,marketing,product"`;
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
      assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'calls', 'README.md')), 'calls README must exist');
      assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'win-loss', 'README.md')), 'win-loss README must exist');
      assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'qualification', 'qualification-matrix.md')), 'qualification matrix must exist');
      assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'stages', 'pipeline-stages.md')), 'pipeline stages must exist');
      assert.ok(fs.existsSync(path.join(TEST_DIR, 'marketing', 'brand', 'brand-guidelines.md')), 'brand guidelines must exist');
      assert.ok(fs.existsSync(path.join(TEST_DIR, 'product', 'roadmap', 'q3-q4-product-themes.md')), 'product roadmap must exist');

      const kernelData = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'org-kernel.json'), 'utf8'));
      assert.strictEqual(kernelData.organization.name, 'TestOrg');
      assert.strictEqual(kernelData.organization.industry, 'Developer Tools');
      assert.strictEqual(kernelData.organization.tagline, 'Test Tagline');
      assert.deepStrictEqual(kernelData.activeAreas, ['sales', 'marketing', 'product']);
    });

    await sub.test('init scaffolds with default yes parameters when flags are omitted', () => {
      const initDefaultCmd = `"${process.execPath}" ./bin/cli.js init "${TEST_DIR_DEFAULTS}" --yes`;
      const output = execSync(initDefaultCmd, { cwd: PKG_DIR }).toString();
      assert.match(output, /Second Brain initialized successfully/);

      const kernelData = JSON.parse(fs.readFileSync(path.join(TEST_DIR_DEFAULTS, 'org-kernel.json'), 'utf8'));
      assert.strictEqual(kernelData.organization.name, 'Acme Corp');
      assert.ok(kernelData.activeAreas.length >= 6, 'Default init should install all 6 preset areas');
      assert.ok(fs.existsSync(path.join(TEST_DIR_DEFAULTS, 'finance_legal')), 'finance_legal area should exist');
      assert.ok(fs.existsSync(path.join(TEST_DIR_DEFAULTS, 'hr_people')), 'hr_people area should exist');
      assert.ok(!fs.existsSync(path.join(TEST_DIR_DEFAULTS, 'sales', 'battlecards', 'competitor-alpha.json')), '--yes must default to a clean brain (no demo samples)');
    });
  });

  await t.test('Doctor audit on fresh scaffold and reporting healthy', () => {
    const output = execSync(`"${process.execPath}" ./bin/cli.js doctor "${TEST_DIR}"`, { cwd: PKG_DIR }).toString();
    assert.match(output, /All Second Brain health checks passed with zero errors or warnings/);
    assert.match(output, /Errors: 0/);
    assert.match(output, /Warnings: 0/);
  });

  await t.test('Doctor automatic repair (--fix) for missing symlinks, missing skills, missing commands', () => {
    // 1. Remove a symlink (.cursorrules)
    const symlinkToRemove = path.join(TEST_DIR, '.cursorrules');
    fs.unlinkSync(symlinkToRemove);

    // 2. Remove a Claude command (brain:sales.md)
    const cmdToRemove = path.join(TEST_DIR, '.claude', 'commands', 'brain:sales.md');
    fs.unlinkSync(cmdToRemove);

    // 3. Remove a root skill (skill_sales_copilot.md)
    const skillToRemove = path.join(TEST_DIR, 'skills', 'skill_sales_copilot.md');
    fs.unlinkSync(skillToRemove);

    // Doctor audit without --fix must detect all 3 missing items as warnings
    const checkOutput = execSync(`"${process.execPath}" ./bin/cli.js doctor "${TEST_DIR}"`, { cwd: PKG_DIR }).toString();
    assert.match(checkOutput, /Missing IDE adapter: \.cursorrules/);
    assert.match(checkOutput, /Missing Claude slash command: \.claude\/commands\/brain:sales\.md/);
    assert.match(checkOutput, /Missing LLM operating skill: skills\/skill_sales_copilot\.md/);
    assert.match(checkOutput, /Warnings: 3/);

    // Run doctor with --fix
    const fixOutput = execSync(`"${process.execPath}" ./bin/cli.js doctor "${TEST_DIR}" --fix`, { cwd: PKG_DIR }).toString();
    assert.match(fixOutput, /Repaired missing and misconfigured IDE adapters, slash commands, and skills/);

    // Verify all 3 were restored
    assert.ok(fs.existsSync(symlinkToRemove), '.cursorrules symlink should be repaired');
    assert.ok(fs.existsSync(cmdToRemove), 'brain:sales.md command should be repaired');
    assert.ok(fs.existsSync(skillToRemove), 'skill_sales_copilot.md skill should be repaired');

    // Doctor audit again: must now report 100% healthy
    const cleanOutput = execSync(`"${process.execPath}" ./bin/cli.js doctor "${TEST_DIR}"`, { cwd: PKG_DIR }).toString();
    assert.match(cleanOutput, /All Second Brain health checks passed with zero errors or warnings/);
    assert.match(cleanOutput, /Errors: 0/);
    assert.match(cleanOutput, /Warnings: 0/);
  });

  await t.test('Listing installed vs uninstalled areas (list-areas)', () => {
    const output = execSync(`"${process.execPath}" ./bin/cli.js list-areas "${TEST_DIR}"`, { cwd: PKG_DIR }).toString();
    assert.match(output, /Installed Areas:/);
    assert.match(output, /Sales \(sales\)/);
    assert.match(output, /Marketing \(marketing\)/);
    assert.match(output, /Product \(product\)/);
    assert.match(output, /Available Preset Areas \(Not Installed\):/);
    assert.match(output, /Operations \(operations\)/);
  });

  await t.test('Adding preset areas (add-area)', () => {
    const output = execSync(`"${process.execPath}" ./bin/cli.js add-area "${TEST_DIR}" --preset operations`, { cwd: PKG_DIR }).toString();
    assert.match(output, /installed successfully/);

    // Operations area content & playbook should be copied
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'operations', 'sops', 'incident-management.json')));
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'playbooks', '04-OPERATIONS-PLAYBOOK.md')));

    // org-kernel.json updated
    const kernel = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'org-kernel.json'), 'utf8'));
    assert.ok(kernel.activeAreas.includes('operations'));
  });

  await t.test('Adding custom areas with boilerplate (add-area)', () => {
    const output = execSync(`"${process.execPath}" ./bin/cli.js add-area "${TEST_DIR}" --custom devops_infra`, { cwd: PKG_DIR }).toString();
    assert.match(output, /Custom area "devops_infra" created/);

    // Boilerplate directories & README created
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'devops_infra', 'README.md')));
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'devops_infra', 'docs')));
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'devops_infra', 'policies')));

    // org-kernel.json updated
    const kernel = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'org-kernel.json'), 'utf8'));
    assert.ok(kernel.activeAreas.includes('devops_infra'));
  });

  await t.test('Doctor stays healthy after adding a custom area', () => {
    const output = execSync(`"${process.execPath}" ./bin/cli.js doctor "${TEST_DIR}"`, { cwd: PKG_DIR }).toString();
    assert.match(output, /Errors: 0/);
    assert.match(output, /Active area "devops_infra" verified on disk/);
  });
});
