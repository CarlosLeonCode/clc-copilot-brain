// Small dependency-free line diff (LCS) for upgrade previews. No colors: rendering is the CLI's job.

function splitLines(text) {
  return text === '' ? [] : text.replace(/\r\n/g, '\n').split('\n');
}

/**
 * Line diff between two texts.
 * @returns {Array<{ type: 'same' | 'add' | 'remove', line: string }>}
 */
export function diffLines(before, after) {
  const a = splitLines(before);
  const b = splitLines(after);
  const lcs = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', line: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: 'remove', line: a[i++] });
    } else {
      out.push({ type: 'add', line: b[j++] });
    }
  }
  while (i < a.length) out.push({ type: 'remove', line: a[i++] });
  while (j < b.length) out.push({ type: 'add', line: b[j++] });
  return out;
}
