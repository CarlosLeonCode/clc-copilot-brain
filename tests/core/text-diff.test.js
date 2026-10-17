import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffLines } from '../../src/core/text-diff.js';

test('diffLines marks identical text as all same', () => {
  assert.deepEqual(diffLines('a\nb', 'a\nb'), [{ type: 'same', line: 'a' }, { type: 'same', line: 'b' }]);
});

test('diffLines reports removed and added lines in order', () => {
  assert.deepEqual(diffLines('a\nb\nc', 'a\nx\nc'), [
    { type: 'same', line: 'a' },
    { type: 'remove', line: 'b' },
    { type: 'add', line: 'x' },
    { type: 'same', line: 'c' }
  ]);
});

test('diffLines handles empty inputs and CRLF', () => {
  assert.deepEqual(diffLines('', 'a'), [{ type: 'add', line: 'a' }]);
  assert.deepEqual(diffLines('a', ''), [{ type: 'remove', line: 'a' }]);
  assert.deepEqual(diffLines('a\r\nb', 'a\nb').every((d) => d.type === 'same'), true);
});
