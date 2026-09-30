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
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'calls', 'README.md')), 'calls README must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'calls', '2026-09', '2026-09-15_carlos_acme-corp.md')), 'historical call log must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'win-loss', 'README.md')), 'win-loss README must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'win-loss', 'post-mortem-template.md')), 'post-mortem template must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'win-loss', 'sample-closed-won-fintech.md')), 'closed-won sample must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'win-loss', 'sample-closed-lost-legacy.md')), 'closed-lost sample must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'qualification', 'qualification-matrix.md')), 'qualification matrix must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'stages', 'pipeline-stages.md')), 'pipeline stages must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'skills', 'skill_call_analyzer.md')), 'area call analyzer skill must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'sales', 'skills', 'skill_monthly_retrospective.md')), 'area monthly retro skill must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'marketing', 'brand', 'brand-guidelines.md')), 'brand guidelines must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'product', 'roadmap', 'q3-q4-product-themes.md')), 'roadmap must exist');

    // Assert ecosystemTools in org-kernel.json
    const kernelData = JSON.parse(fs.readFileSync(path.join(TEST_DIR, 'org-kernel.json'), 'utf8'));
    assert.ok(kernelData.ecosystemTools, 'ecosystemTools must exist in org-kernel.json');
    assert.strictEqual(kernelData.ecosystemTools.salesFlowDiagrams.tool, 'Archify');

    // Assert .claude/commands/ are scaffolded
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.claude', 'commands', 'brain.md')), 'brain.md command must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.claude', 'commands', 'brain:onboarding.md')), 'brain:onboarding.md command must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.claude', 'commands', 'brain:sales.md')), 'brain:sales.md command must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.claude', 'commands', 'brain:doctor.md')), 'brain:doctor.md command must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, '.claude', 'commands', 'brain:add-area.md')), 'brain:add-area.md command must exist');

    // Assert skills/ are scaffolded
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'skills', 'skill_brain_onboarding.md')), 'skill_brain_onboarding.md must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'skills', 'skill_sales_copilot.md')), 'skill_sales_copilot.md must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'skills', 'skill_call_analyzer.md')), 'skill_call_analyzer.md must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'skills', 'skill_monthly_retrospective.md')), 'skill_monthly_retrospective.md must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'skills', 'skill_brain_doctor.md')), 'skill_brain_doctor.md must exist');
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'skills', 'skill_area_scaffolder.md')), 'skill_area_scaffolder.md must exist');
  });

  await t.test('doctor command audits healthy scaffold', () => {
    const output = execSync('node ./bin/cli.js doctor ./test-scaffold', { cwd: PKG_DIR }).toString();
    assert.match(output, /All Second Brain health checks passed with zero errors or warnings/);
    assert.match(output, /Errors: 0/);
    assert.match(output, /Warnings: 0/);
  });

  await t.test('doctor detects and repairs missing claude commands and skills', () => {
    // Intentionally remove command and skill
    const cmdToRemove = path.join(TEST_DIR, '.claude', 'commands', 'brain:sales.md');
    const skillToRemove = path.join(TEST_DIR, 'skills', 'skill_sales_copilot.md');
    fs.unlinkSync(cmdToRemove);
    fs.unlinkSync(skillToRemove);

    // Doctor without fix should detect warnings
    const checkOutput = execSync('node ./bin/cli.js doctor ./test-scaffold', { cwd: PKG_DIR }).toString();
    assert.match(checkOutput, /Missing Claude slash command/);
    assert.match(checkOutput, /Missing LLM operating skill/);
    assert.match(checkOutput, /Warnings: 2/);

    // Doctor with --fix should repair them
    const fixOutput = execSync('node ./bin/cli.js doctor ./test-scaffold --fix', { cwd: PKG_DIR }).toString();
    assert.match(fixOutput, /Repaired missing and misconfigured IDE adapters, slash commands, and skills/);

    // Assert restored
    assert.ok(fs.existsSync(cmdToRemove), 'brain:sales.md should be repaired');
    assert.ok(fs.existsSync(skillToRemove), 'skill_sales_copilot.md should be repaired');

    // Re-run doctor: should be clean
    const cleanOutput = execSync('node ./bin/cli.js doctor ./test-scaffold', { cwd: PKG_DIR }).toString();
    assert.match(cleanOutput, /All Second Brain health checks passed with zero errors or warnings/);
    assert.match(cleanOutput, /Errors: 0/);
    assert.match(cleanOutput, /Warnings: 0/);
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
    assert.match(output, /Warnings: 0/);
  });

  // Cleanup
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});
