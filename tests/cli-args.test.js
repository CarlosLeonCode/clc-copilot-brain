import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/cli/args.js';

test('parseArgs collects a repeatable --draft flag into a list', () => {
  const { args, options } = parseArgs(['view', 'brain', '--draft', 'a.md', '--open', '--draft', 'b.md']);
  assert.deepEqual(args, ['view', 'brain']);
  assert.deepEqual(options.draft, ['a.md', 'b.md']);
  assert.equal(options.open, true);
});

test('parseArgs keeps single valued flags as strings and a dangling --draft as true', () => {
  assert.equal(parseArgs(['init', '--name', 'Acme']).options.name, 'Acme');
  assert.equal(parseArgs(['view', '--draft']).options.draft, true);
});
