import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from '../../src/core/plays.js';

const nested = '---\nrep: "Ana"\ndetected_objections:\n  price: high\n  - note: x\nmotion: referral\n---\n';

test('topLevelOnly ignores nested keys, default mode keeps them', () => {
  assert.deepEqual(parseFrontmatter(nested, { topLevelOnly: true }), { rep: 'Ana', detected_objections: '', motion: 'referral' });
  assert.equal(parseFrontmatter(nested).price, 'high');
});

test('a leading BOM is stripped so frontmatter still parses', () => {
  assert.equal(parseFrontmatter('﻿---\nplay: x\n---\n').play, 'x');
  assert.equal(parseFrontmatter('﻿---\nplay: x\n---\n', { topLevelOnly: true }).play, 'x');
});
