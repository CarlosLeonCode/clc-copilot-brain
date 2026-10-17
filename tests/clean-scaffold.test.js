import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, '../bin/cli.js');

test('Scaffold Integrity: Clean Mode vs Demo Mode & Clean-Demo Command', async (t) => {
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-test-'));

  await t.test('init in default clean mode does not pollute with demo assets', () => {
    const cleanDir = path.join(tmpBase, 'clean-project');
    fs.mkdirSync(cleanDir);

    // Run init in clean mode
    execSync(`"${process.execPath}" "${CLI_PATH}" init "${cleanDir}" --clean --name "CleanCorp" --industry "tech" --tagline "Clean" --areas "sales"`, {
      encoding: 'utf-8'
    });

    // Check directory structure exists
    assert.ok(fs.existsSync(path.join(cleanDir, 'sales', 'objections')));
    assert.ok(fs.existsSync(path.join(cleanDir, 'sales', 'battlecards')));

    // Assert that mock demo assets do NOT exist
    const demoObjection = path.join(cleanDir, 'sales', 'objections', 'pricing-too-high.json');
    const demoBattlecard = path.join(cleanDir, 'sales', 'battlecards', 'competitor-alpha.json');
    assert.equal(fs.existsSync(demoObjection), false, 'pricing-too-high.json should not exist in clean mode');
    assert.equal(fs.existsSync(demoBattlecard), false, 'competitor-alpha.json should not exist in clean mode');
  });

  await t.test('clean-demo command removes demo assets from an existing project', () => {
    const dirtyDir = path.join(tmpBase, 'dirty-project');
    fs.mkdirSync(dirtyDir);

    // Run init with demo mode
    execSync(`"${process.execPath}" "${CLI_PATH}" init "${dirtyDir}" --demo --name "DemoCorp" --industry "tech" --tagline "Demo" --areas "sales"`, {
      encoding: 'utf-8'
    });

    const demoObjection = path.join(dirtyDir, 'sales', 'objections', 'pricing-too-high.json');
    assert.ok(fs.existsSync(demoObjection), 'pricing-too-high.json must exist in demo mode');

    // Run clean-demo
    const cleanOutput = execSync(`"${process.execPath}" "${CLI_PATH}" clean-demo "${dirtyDir}"`, {
      encoding: 'utf-8'
    });

    assert.ok(cleanOutput.includes('Cleaned') || cleanOutput.includes('removed'));
    assert.equal(fs.existsSync(demoObjection), false, 'clean-demo must have removed pricing-too-high.json');
  });

  // Clean up
  try {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  } catch {}
});
