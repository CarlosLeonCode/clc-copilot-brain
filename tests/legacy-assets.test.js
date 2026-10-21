import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { LEGACY_STARTER_SCRIPT_HASHES, isLegacyStarterScript } from '../src/core/legacy-assets.js';

const STARTER_COMMIT = 'f79648adb1d232846bdf2e3d0b9cca6ab5894b42';
const names = ['cold-outreach-email.md', 'discovery-call-framework.md'];
const shipped = (name) => {
  try {
    return execFileSync('git', ['show', `${STARTER_COMMIT}:templates/areas/sales/scripts/${name}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null; // shallow clone without history: the byte checks are skipped
  }
};

test('both removed starters have listed hashes', () => {
  for (const name of names) assert.ok(LEGACY_STARTER_SCRIPT_HASHES[name]?.length >= 1, name);
});

test('shipped starter bytes (and a CRLF variant) are detected; an edited copy is not flagged', (t) => {
  for (const name of names) {
    const text = shipped(name);
    if (text === null) return t.skip('git history unavailable');
    assert.equal(isLegacyStarterScript(name, text), true, name);
    assert.equal(isLegacyStarterScript(name, text.replace(/\n/g, '\r\n')), true, `${name} CRLF`);
    assert.equal(isLegacyStarterScript(name, `${text}\nMy own line.\n`), false, `${name} edited`);
  }
});

test('other file names are never flagged', () => {
  assert.equal(isLegacyStarterScript('restaurants.md', 'anything'), false);
});
