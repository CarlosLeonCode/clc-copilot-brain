import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { flowchartToSvg, layoutFlowchart, parseFlowchart, renderFlowchartSvg } from '../../src/core/flowchart.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MERMAID_FENCE = /```mermaid\r?\n([\s\S]*?)```/;
const countOf = (text, needle) => text.split(needle).length - 1;
const node = (graph, id) => graph.nodes.find((n) => n.id === id);

test('parseFlowchart reads the header direction (flowchart and graph keywords)', () => {
  assert.equal(parseFlowchart('flowchart TD\nA --> B').direction, 'TD');
  assert.equal(parseFlowchart('flowchart TB\nA --> B').direction, 'TD');
  assert.equal(parseFlowchart('graph LR\nA --> B').direction, 'LR');
  assert.equal(parseFlowchart('flowchart RL\nA --> B').direction, 'RL');
  assert.equal(parseFlowchart('graph BT\nA --> B').direction, 'BT');
  assert.equal(parseFlowchart('flowchart\nA --> B').direction, 'TD');
});

test('parseFlowchart understands every node shape', () => {
  const graph = parseFlowchart([
    'flowchart TD',
    'A[Box] --> B(Round)',
    'C([Pill]) --> D{Decide}',
    'E((Circle)) --> F',
    'G["Quoted, with (parens)"]'
  ].join('\n'));
  assert.deepEqual(node(graph, 'A'), { id: 'A', label: 'Box', shape: 'rect' });
  assert.deepEqual(node(graph, 'B'), { id: 'B', label: 'Round', shape: 'round' });
  assert.deepEqual(node(graph, 'C'), { id: 'C', label: 'Pill', shape: 'pill' });
  assert.deepEqual(node(graph, 'D'), { id: 'D', label: 'Decide', shape: 'diamond' });
  assert.deepEqual(node(graph, 'E'), { id: 'E', label: 'Circle', shape: 'circle' });
  assert.deepEqual(node(graph, 'F'), { id: 'F', label: 'F', shape: 'rect' });
  assert.deepEqual(node(graph, 'G'), { id: 'G', label: 'Quoted, with (parens)', shape: 'rect' });
});

test('parseFlowchart turns <br> into line breaks and keeps the first label of a node', () => {
  const graph = parseFlowchart('flowchart LR\nA["One<br>Two<br/>Three"] --> B\nA --> C');
  assert.equal(node(graph, 'A').label, 'One\nTwo\nThree');
  assert.equal(graph.nodes.length, 3);
});

test('parseFlowchart reads every edge form and label form', () => {
  const graph = parseFlowchart([
    'flowchart TD',
    'A --> B',
    'B --- C',
    'C -.-> D',
    'D ==> E',
    'E -->|"yes"| F',
    'F -->|no| G',
    'G -- maybe --> H',
    'H -. later .-> A'
  ].join('\n'));
  assert.deepEqual(graph.edges, [
    { from: 'A', to: 'B', label: '' },
    { from: 'B', to: 'C', label: '' },
    { from: 'C', to: 'D', label: '' },
    { from: 'D', to: 'E', label: '' },
    { from: 'E', to: 'F', label: 'yes' },
    { from: 'F', to: 'G', label: 'no' },
    { from: 'G', to: 'H', label: 'maybe' },
    { from: 'H', to: 'A', label: 'later' }
  ]);
});

test('parseFlowchart handles chained edges and & groups', () => {
  const graph = parseFlowchart('flowchart LR\nA[Start] --> B -->|ok| C{End}\nC --> D & E');
  assert.deepEqual(graph.edges, [
    { from: 'A', to: 'B', label: '' },
    { from: 'B', to: 'C', label: 'ok' },
    { from: 'C', to: 'D', label: '' },
    { from: 'C', to: 'E', label: '' }
  ]);
  assert.equal(node(graph, 'C').shape, 'diamond');
});

test('parseFlowchart ignores styling, comments, init directives and flattens subgraphs', () => {
  const graph = parseFlowchart([
    '%%{init: {"flowchart": {"useMaxWidth": false}}}%%',
    'flowchart TD',
    '%% a comment',
    'subgraph Team [The team]',
    '  A --> B',
    'end',
    'classDef hot fill:#f00',
    'class A hot',
    'style B fill:#0f0',
    'linkStyle 0 stroke:#00f',
    'click A "https://example.com"',
    'B --> C;'
  ].join('\n'));
  assert.deepEqual(graph.nodes.map((n) => n.id), ['A', 'B', 'C']);
  assert.equal(graph.edges.length, 2);
});

test('parseFlowchart rejects input that is not a flowchart', () => {
  assert.throws(() => parseFlowchart(''), /flowchart/i);
  assert.throws(() => parseFlowchart('sequenceDiagram\nA->>B: hi'), /flowchart/i);
  assert.throws(() => parseFlowchart('flowchart TD\nA[unclosed --> B'), /line 2/i);
  assert.throws(() => parseFlowchart('flowchart TD'), /no steps/i);
  assert.throws(() => parseFlowchart('flowchart TD\nA{"Open" --> B{"Next"}'), /line 2/i, 'a quoted label must close right after its quote');
});

test('layoutFlowchart gives every node distinct coordinates and ranks follow edges (TD)', () => {
  const graph = parseFlowchart('flowchart TD\nA --> B\nA --> C\nB --> D\nC --> D\nA --> D');
  const layout = layoutFlowchart(graph);
  const boxes = graph.nodes.map((n) => layout.nodes.get(n.id));
  const keys = new Set(boxes.map((b) => `${b.x},${b.y}`));
  assert.equal(keys.size, graph.nodes.length);
  for (const e of graph.edges) {
    assert.ok(layout.nodes.get(e.from).rank < layout.nodes.get(e.to).rank, `${e.from} should rank before ${e.to}`);
    assert.ok(layout.nodes.get(e.from).y < layout.nodes.get(e.to).y, `${e.from} should sit above ${e.to}`);
  }
  assert.equal(layout.nodes.get('D').rank, 2, 'longest path ranking');
  for (const b of boxes) {
    assert.ok(b.x - b.w / 2 >= 0 && b.x + b.w / 2 <= layout.width);
    assert.ok(b.y - b.h / 2 >= 0 && b.y + b.h / 2 <= layout.height);
  }
});

test('layoutFlowchart lays LR graphs left to right', () => {
  const graph = parseFlowchart('flowchart LR\nA --> B --> C');
  const layout = layoutFlowchart(graph);
  assert.ok(layout.nodes.get('A').x < layout.nodes.get('B').x);
  assert.ok(layout.nodes.get('B').x < layout.nodes.get('C').x);
  assert.equal(layout.nodes.get('A').y, layout.nodes.get('C').y);
});

test('layoutFlowchart terminates on cycles and marks back edges', () => {
  const graph = parseFlowchart('flowchart TD\nA --> B --> C --> A\nC --> C\nB --> A');
  const layout = layoutFlowchart(graph);
  assert.equal(layout.nodes.size, 3);
  assert.ok(layout.edges.some((e) => e.back), 'a cycle needs at least one back edge');
  assert.ok(layout.edges.every((e) => typeof e.path === 'string' && e.path.startsWith('M')));
});

test('layoutFlowchart wraps long labels into several lines', () => {
  const graph = parseFlowchart('flowchart TD\nA["Ask your contact to bring the budget owner to the next meeting"] --> B');
  const box = layoutFlowchart(graph).nodes.get('A');
  assert.ok(box.lines.length >= 2);
  assert.ok(box.lines.every((l) => l.length <= 24));
});

test('renderFlowchartSvg draws one shape per node, one path per edge, accessible and themeable', () => {
  const graph = parseFlowchart('flowchart TD\nA[Start] --> B{Choose}\nB -->|yes| C(Done)\nB -->|no| A');
  const svg = renderFlowchartSvg(graph, layoutFlowchart(graph), { title: 'My flow' });
  assert.match(svg, /^<svg [^>]*viewBox="0 0 [\d.]+ [\d.]+"/);
  assert.match(svg, /role="img"/);
  assert.match(svg, /<title[^>]*>My flow<\/title>/);
  assert.doesNotMatch(svg, /https?:/, "no URLs, not even the xmlns (inline SVG in HTML does not need it)");
  assert.equal(countOf(svg, 'data-fc="node"'), 3);
  assert.equal(countOf(svg, 'class="fc-edge'), 3);
  assert.equal(countOf(svg, '<polygon class="fc-shape'), 1, 'decision is a diamond');
  assert.match(svg, /<marker /);
  assert.match(svg, />yes</);
  assert.doesNotMatch(svg, /fill="#|stroke="#/, 'colors come from CSS classes, not hardcoded');
});

test('renderFlowchartSvg escapes labels coming from user files', () => {
  const svg = flowchartToSvg('flowchart TD\nA["<script>alert(1)</script>"] -->|"<b>x</b>"| B["a & b"]', { title: '<i>t</i>' });
  assert.ok(!svg.includes('<script>'));
  assert.ok(!svg.includes('<b>'));
  assert.ok(!svg.includes('<i>'));
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(svg.includes('a &amp; b'));
});

test('every shipped template diagram parses and renders', () => {
  const files = [
    'templates/areas/sales/stages/pipeline-stages.md',
    ...fs.readdirSync(path.join(ROOT, 'templates/areas/sales/plays')).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => `templates/areas/sales/plays/${f}`)
  ];
  for (const rel of files) {
    const source = MERMAID_FENCE.exec(fs.readFileSync(path.join(ROOT, rel), 'utf8'))?.[1];
    assert.ok(source, `${rel} has a mermaid diagram`);
    const graph = parseFlowchart(source);
    const svg = renderFlowchartSvg(graph, layoutFlowchart(graph), { title: rel });
    assert.equal(countOf(svg, 'data-fc="node"'), graph.nodes.length, rel);
    assert.equal(countOf(svg, 'class="fc-edge'), graph.edges.length, rel);
  }
});
