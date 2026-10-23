// Offline flowchart renderer: a small Mermaid flowchart subset -> layered layout -> inline SVG.
// Pure functions, no dependencies, no network. Every label is escaped before it reaches the SVG.

const DIRECTIONS = Object.freeze({ TD: 'TD', TB: 'TD', LR: 'LR', RL: 'RL', BT: 'BT' });
const HEADER = /^(?:flowchart|graph)(?:\s+([A-Za-z]{2}))?\s*;?\s*$/i;
const IGNORED = /^(?:classDef|class|style|linkStyle|click|subgraph|end|direction|accTitle|accDescr)\b/;

// Opening token -> closing token and shape. Longer openers first so `([` wins over `(`.
const SHAPES = Object.freeze([
  ['([', '])', 'pill'],
  ['((', '))', 'circle'],
  ['[[', ']]', 'rect'],
  ['[(', ')]', 'rect'],
  ['{{', '}}', 'diamond'],
  ['[', ']', 'rect'],
  ['(', ')', 'round'],
  ['{', '}', 'diamond'],
  ['>', ']', 'rect']
]);

const ARROW = /(?:<)?(?:-{2,}>|-{3,}|-\.+-?>|-\.+-|={2,}>|={3,})/y;
const TEXT_ARROW = /(--|==|-\.)\s+(.+?)\s+(?:-{2,}>|-{3,}|\.-+>|\.-+|={2,}>|={3,})/y;
const PIPE_LABEL = /\s*\|([^|]*)\|/y;
const ID = /[A-Za-z0-9_]+/y;
const CLASS_SUFFIX = /:::[\w-]+/y;

function cleanLabel(raw) {
  let text = String(raw).trim();
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/#quot;/g, '"')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .join('\n')
    .trim();
}

/** Split a line into statements on `;` outside quotes and brackets. */
function statements(line) {
  const out = [];
  let depth = 0;
  let quoted = false;
  let current = '';
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && '[({'.includes(ch)) depth += 1;
    else if (!quoted && '])}'.includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === ';' && !quoted && depth === 0) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.map((s) => s.trim()).filter(Boolean);
}

class Scanner {
  constructor(text) {
    this.text = text;
    this.pos = 0;
  }

  skipSpace() {
    while (this.pos < this.text.length && /\s/.test(this.text[this.pos])) this.pos += 1;
  }

  match(regex) {
    regex.lastIndex = this.pos;
    const m = regex.exec(this.text);
    if (m) this.pos = regex.lastIndex;
    return m;
  }

  startsWith(token) {
    return this.text.startsWith(token, this.pos);
  }

  done() {
    this.skipSpace();
    return this.pos >= this.text.length;
  }
}

function parseNode(scanner) {
  scanner.skipSpace();
  const id = scanner.match(ID);
  if (!id) throw new Error(`expected a step name at "${scanner.text.slice(scanner.pos, scanner.pos + 20)}"`);
  for (const [open, close, shape] of SHAPES) {
    if (!scanner.startsWith(open)) continue;
    scanner.pos += open.length;
    let label;
    const rest = scanner.text.slice(scanner.pos);
    const quoted = /^\s*"([^"]*)"\s*/.exec(rest);
    if (quoted) {
      if (!rest.slice(quoted[0].length).startsWith(close)) throw new Error(`missing "${close}" after the label of step "${id[0]}"`);
      label = quoted[1];
      scanner.pos += quoted[0].length + close.length;
    } else if (/^\s*"/.test(rest)) {
      throw new Error(`unclosed quote in the label of step "${id[0]}"`);
    } else {
      const end = rest.indexOf(close);
      if (end === -1) throw new Error(`missing "${close}" after step "${id[0]}"`);
      label = rest.slice(0, end);
      scanner.pos += end + close.length;
    }
    scanner.match(CLASS_SUFFIX);
    return { id: id[0], label: cleanLabel(label), shape, explicit: true };
  }
  scanner.match(CLASS_SUFFIX);
  return { id: id[0], label: id[0], shape: 'rect', explicit: false };
}

function parseGroup(scanner) {
  const group = [parseNode(scanner)];
  for (;;) {
    const save = scanner.pos;
    scanner.skipSpace();
    if (!scanner.startsWith('&')) {
      scanner.pos = save;
      return group;
    }
    scanner.pos += 1;
    group.push(parseNode(scanner));
  }
}

function parseArrow(scanner) {
  scanner.skipSpace();
  if (scanner.match(ARROW)) {
    const pipe = scanner.match(PIPE_LABEL);
    return { label: pipe ? cleanLabel(pipe[1]) : '' };
  }
  const text = scanner.match(TEXT_ARROW);
  if (text) return { label: cleanLabel(text[2]) };
  return null;
}

function parseStatement(text, graph) {
  const scanner = new Scanner(text);
  let previous = parseGroup(scanner);
  previous.forEach((n) => addNode(graph, n));
  while (!scanner.done()) {
    const arrow = parseArrow(scanner);
    if (!arrow) throw new Error(`unexpected "${scanner.text.slice(scanner.pos, scanner.pos + 20)}"`);
    const next = parseGroup(scanner);
    next.forEach((n) => addNode(graph, n));
    for (const from of previous) for (const to of next) graph.edges.push({ from: from.id, to: to.id, label: arrow.label });
    previous = next;
  }
}

function addNode(graph, node) {
  const existing = graph.index.get(node.id);
  if (!existing) {
    const entry = { id: node.id, label: node.label, shape: node.shape, explicit: node.explicit };
    graph.index.set(node.id, entry);
    graph.nodes.push(entry);
  } else if (node.explicit && !existing.explicit) {
    Object.assign(existing, { label: node.label, shape: node.shape, explicit: true });
  }
}

/**
 * Parse a Mermaid flowchart (the subset sales diagrams use).
 * Strict mode throws on any problem; `lenient: true` skips bad lines and reports them in `errors`.
 * @returns {{ direction: string, nodes: {id,label,shape}[], edges: {from,to,label}[], errors?: string[] }}
 */
export function parseFlowchart(source, { lenient = false } = {}) {
  const lines = String(source ?? '').split(/\r?\n/);
  const graph = { direction: 'TD', nodes: [], edges: [], index: new Map() };
  const errors = [];
  let headerSeen = false;
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('%%')) return;
    if (!headerSeen) {
      const header = HEADER.exec(line);
      if (header) {
        headerSeen = true;
        const dir = DIRECTIONS[(header[1] || 'TD').toUpperCase()];
        if (!dir) errors.push(`line ${i + 1}: unknown direction "${header[1]}"`);
        graph.direction = dir || 'TD';
        return;
      }
      if (!lenient) throw new Error('Not a flowchart: the diagram must start with "flowchart TD" or "flowchart LR".');
      headerSeen = true;
    }
    if (IGNORED.test(line)) return;
    for (const statement of statements(line)) {
      if (IGNORED.test(statement)) continue;
      try {
        parseStatement(statement, graph);
      } catch (err) {
        if (!lenient) throw new Error(`Flowchart line ${i + 1}: ${err.message}`);
        errors.push(`line ${i + 1}: ${err.message}`);
      }
    }
  });
  if (!headerSeen && !lenient) throw new Error('Not a flowchart: the diagram is empty.');
  if (graph.nodes.length === 0 && !lenient) throw new Error('Flowchart has no steps.');
  if (errors.length > 0 && !lenient) throw new Error(`Flowchart ${errors[0]}`);
  const result = {
    direction: graph.direction,
    nodes: graph.nodes.map(({ id, label, shape }) => ({ id, label, shape })),
    edges: graph.edges
  };
  if (lenient) result.errors = errors;
  return result;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const CHAR_W = 7.2; // ~14px sans-serif
const LINE_H = 18;
const LABEL_CHAR_W = 6.6; // ~13px edge labels
const LABEL_LINE_H = 16;
const NODE_WRAP = 22;
const DIAMOND_WRAP = 20;
const LABEL_WRAP = 24;
const LAYER_GAP = 22;
const NODE_SEP = 40;
const DUMMY_SEP = 16;
const LABEL_SEP = 12;
const MARGIN = 16;

export function wrapText(text, max) {
  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    for (let word of paragraph.split(' ').filter(Boolean)) {
      while (word.length > max) {
        if (line) {
          lines.push(line);
          line = '';
        }
        lines.push(word.slice(0, max));
        word = word.slice(max);
      }
      if (!line) line = word;
      else if (line.length + 1 + word.length <= max) line += ` ${word}`;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines.length > 0 ? lines : [''];
}

function nodeBox(node) {
  const lines = wrapText(node.label, node.shape === 'diamond' ? DIAMOND_WRAP : NODE_WRAP);
  const textW = Math.max(...lines.map((l) => l.length)) * CHAR_W;
  const textH = lines.length * LINE_H;
  if (node.shape === 'diamond') {
    const h = textH * 1.7 + 26;
    return { lines, w: Math.round(textW / (1 - textH / h) + 16), h: Math.round(h) };
  }
  if (node.shape === 'circle') {
    const d = Math.round(Math.max(textW, textH) + 28);
    return { lines, w: d, h: d };
  }
  return { lines, w: Math.round(Math.max(textW + 32, 72)), h: textH + 22 };
}

function labelBox(label) {
  if (!label) return null;
  const lines = wrapText(label, LABEL_WRAP);
  return { lines, w: Math.round(Math.max(...lines.map((l) => l.length)) * LABEL_CHAR_W + 14), h: lines.length * LABEL_LINE_H + 6 };
}

/** Mark DFS back edges (and self loops) so the rest of the graph is acyclic. */
function findBackEdges(nodes, edges) {
  const out = new Map(nodes.map((n) => [n.id, []]));
  edges.forEach((e, i) => out.get(e.from).push(i));
  const state = new Map();
  const back = new Set();
  const hasIncoming = new Set(edges.filter((e) => e.from !== e.to).map((e) => e.to));
  const roots = [...nodes.filter((n) => !hasIncoming.has(n.id)), ...nodes];
  for (const root of roots) {
    if (state.has(root.id)) continue;
    const stack = [[root.id, 0]];
    state.set(root.id, 'open');
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const [id, next] = frame;
      const list = out.get(id);
      if (next >= list.length) {
        state.set(id, 'done');
        stack.pop();
        continue;
      }
      frame[1] += 1;
      const edgeIndex = list[next];
      const to = edges[edgeIndex].to;
      if (state.get(to) === 'open') back.add(edgeIndex);
      else if (!state.has(to)) {
        state.set(to, 'open');
        stack.push([to, 0]);
      }
    }
  }
  return back;
}

/** Longest-path ranks over the forward (acyclic) edges. */
function rankNodes(nodes, forward) {
  const rank = new Map(nodes.map((n) => [n.id, 0]));
  const indegree = new Map(nodes.map((n) => [n.id, 0]));
  forward.forEach((e) => indegree.set(e.to, indegree.get(e.to) + 1));
  const queue = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  while (queue.length > 0) {
    const id = queue.shift();
    for (const e of forward) {
      if (e.from !== id) continue;
      rank.set(e.to, Math.max(rank.get(e.to), rank.get(id) + 1));
      indegree.set(e.to, indegree.get(e.to) - 1);
      if (indegree.get(e.to) === 0) queue.push(e.to);
    }
  }
  return rank;
}

/** Pool-adjacent-violators: nondecreasing x' closest (least squares) to targets. */
function isotonic(targets) {
  const blocks = [];
  for (const t of targets) {
    blocks.push({ sum: t, count: 1 });
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1];
      const a = blocks[blocks.length - 2];
      if (a.sum / a.count <= b.sum / b.count) break;
      blocks.splice(-2, 2, { sum: a.sum + b.sum, count: a.count + b.count });
    }
  }
  return blocks.flatMap((b) => Array(b.count).fill(b.sum / b.count));
}

/** Place a layer's items at the desired cross positions without overlap. */
function placeLayer(layer, desired, crossSize) {
  const offsets = [0];
  for (let i = 1; i < layer.length; i++) {
    const a = layer[i - 1];
    const b = layer[i];
    const sep = a.dummy || b.dummy ? (a.label != null || b.label != null ? LABEL_SEP : DUMMY_SEP) : NODE_SEP;
    offsets.push(offsets[i - 1] + crossSize(a) / 2 + crossSize(b) / 2 + sep);
  }
  const fitted = isotonic(desired.map((d, i) => d - offsets[i]));
  return fitted.map((x, i) => x + offsets[i]);
}

/**
 * Layered (Sugiyama-lite) layout. Coordinates are node centers in SVG pixels.
 * @returns {{ width, height, direction, nodes: Map<string, object>, edges: object[] }}
 */
export function layoutFlowchart(graph) {
  const horizontal = graph.direction === 'LR' || graph.direction === 'RL';
  const reversed = graph.direction === 'RL' || graph.direction === 'BT';
  const boxes = new Map(graph.nodes.map((n) => [n.id, { ...nodeBox(n), shape: n.shape }]));
  const mainSize = (b) => (horizontal ? b.w : b.h);
  const crossOf = (b) => (horizontal ? b.h : b.w);

  const back = findBackEdges(graph.nodes, graph.edges);
  const forward = graph.edges.filter((_, i) => !back.has(i));
  const rank = rankNodes(graph.nodes, forward);
  const maxRank = Math.max(0, ...rank.values());
  const labels = graph.edges.map((e) => labelBox(e.label));

  // Layers: node ranks sit on even layers; odd layers between them carry edge labels,
  // so labels are laid out like small nodes and never overlap each other.
  const layerOf = (id) => rank.get(id) * 2;
  const items = new Map();
  const layers = Array.from({ length: maxRank * 2 + 1 }, () => []);
  const addItem = (item) => {
    items.set(item.key, item);
    layers[item.layer].push(item);
  };
  const dfsOrder = [];
  const seen = new Set();
  const visit = (id) => {
    if (seen.has(id)) return;
    seen.add(id);
    dfsOrder.push(id);
    forward.filter((e) => e.from === id).forEach((e) => visit(e.to));
  };
  graph.nodes.filter((n) => rank.get(n.id) === 0).forEach((n) => visit(n.id));
  graph.nodes.forEach((n) => visit(n.id));
  dfsOrder.forEach((id) => addItem({ key: id, layer: layerOf(id), dummy: false, box: boxes.get(id), up: [], down: [] }));

  const chains = graph.edges.map((edge, i) => {
    if (back.has(i) || edge.from === edge.to) return null;
    const first = layerOf(edge.from);
    const last = layerOf(edge.to);
    const labelLayer = first + 1 + 2 * Math.floor((rank.get(edge.to) - rank.get(edge.from) - 1) / 2);
    const keys = [edge.from];
    for (let l = first + 1; l < last; l++) {
      const key = `\u0000${i}:${l}`;
      const isLabel = labels[i] && l === labelLayer;
      addItem({ key, layer: l, dummy: true, label: isLabel ? i : null, box: isLabel ? labels[i] : { w: 0, h: 0 }, up: [], down: [] });
      keys.push(key);
    }
    keys.push(edge.to);
    for (let k = 1; k < keys.length; k++) {
      items.get(keys[k - 1]).down.push(keys[k]);
      items.get(keys[k]).up.push(keys[k - 1]);
    }
    return keys;
  });

  // Order within layers: barycenter sweeps.
  const indexOf = () => {
    const map = new Map();
    layers.forEach((layer) => layer.forEach((item, i) => map.set(item.key, i)));
    return map;
  };
  for (let pass = 0; pass < 6; pass++) {
    const downward = pass % 2 === 0;
    const order = downward ? [...layers.keys()] : [...layers.keys()].reverse();
    for (const l of order) {
      const pos = indexOf();
      const bary = new Map(layers[l].map((item, i) => {
        const near = downward ? item.up : item.down;
        return [item.key, near.length > 0 ? near.reduce((sum, k) => sum + pos.get(k), 0) / near.length : i];
      }));
      layers[l].sort((x, y) => bary.get(x.key) - bary.get(y.key));
    }
  }

  // Cross coordinates: pack, then align with neighbours (down, up, down).
  const cross = new Map();
  for (const layer of layers) {
    const placed = placeLayer(layer, layer.map(() => 0), (it) => crossOf(it.box));
    layer.forEach((item, i) => cross.set(item.key, placed[i]));
  }
  for (const downward of [true, false, true, false, true]) {
    const order = downward ? [...layers.keys()] : [...layers.keys()].reverse();
    for (const l of order) {
      const layer = layers[l];
      const desired = layer.map((item) => {
        const near = downward ? item.up : item.down;
        return near.length > 0 ? near.reduce((sum, k) => sum + cross.get(k), 0) / near.length : cross.get(item.key);
      });
      const placed = placeLayer(layer, desired, (it) => crossOf(it.box));
      layer.forEach((item, i) => cross.set(item.key, placed[i]));
    }
  }

  // Main-axis position of each layer.
  const thickness = layers.map((layer) => Math.max(0, ...layer.map((it) => mainSize(it.box))));
  const layerCenter = [];
  let cursor = 0;
  thickness.forEach((t) => {
    layerCenter.push(cursor + t / 2);
    cursor += t + LAYER_GAP;
  });

  // Geometry in abstract (main, cross) coordinates; converted to x/y at the end.
  const sign = reversed ? -1 : 1;
  const at = (m, c) => ({ m: m * sign, c });
  const centerOf = (key) => ({ m: layerCenter[items.get(key).layer], c: cross.get(key) });

  // Spread the ends of several edges leaving (or entering) the same node along its side.
  const ports = new Map();
  const outgoing = new Map();
  const incoming = new Map();
  chains.forEach((keys, i) => {
    if (!keys) return;
    const first = keys[0];
    const last = keys[keys.length - 1];
    if (!outgoing.has(first)) outgoing.set(first, []);
    if (!incoming.has(last)) incoming.set(last, []);
    outgoing.get(first).push({ id: `o${i}`, c: cross.get(keys[1]) });
    incoming.get(last).push({ id: `i${i}`, c: cross.get(keys[keys.length - 2]) });
  });
  for (const map of [outgoing, incoming]) {
    map.forEach((list, key) => list.sort((x, y) => x.c - y.c).forEach((port, i) => ports.set(port.id, { i, n: list.length, key })));
  }
  const portOffset = (id) => {
    const port = ports.get(id);
    if (!port || port.n < 2) return 0;
    const step = Math.min(28, (crossOf(items.get(port.key).box) * 0.6) / port.n);
    return (port.i - (port.n - 1) / 2) * step;
  };
  /** Distance from an item's center to its border along the main axis, `dc` off-center. */
  const reach = (key, dc) => {
    const it = items.get(key);
    if (it.dummy) return thickness[it.layer] / 2;
    const half = mainSize(it.box) / 2;
    const halfCross = crossOf(it.box) / 2;
    if (it.box.shape === 'diamond') return half * (1 - Math.abs(dc) / halfCross);
    if (it.box.shape === 'circle') return Math.sqrt(Math.max(0, half * half - dc * dc));
    return half;
  };

  const edges = graph.edges.map((edge, i) => {
    const label = labels[i];
    const keys = chains[i];
    if (keys) {
      const segs = [];
      let labelAt = null;
      for (let k = 0; k < keys.length - 1; k++) {
        const a = centerOf(keys[k]);
        const b = centerOf(keys[k + 1]);
        const dcStart = k === 0 ? portOffset(`o${i}`) : 0;
        const dcEnd = k === keys.length - 2 ? portOffset(`i${i}`) : 0;
        const start = { m: a.m + reach(keys[k], dcStart), c: a.c + dcStart };
        const end = { m: b.m - reach(keys[k + 1], dcEnd), c: b.c + dcEnd };
        segs.push([k === 0 ? 'M' : 'L', at(start.m, start.c)]);
        const mid = (start.m + end.m) / 2;
        segs.push(['C', at(mid, start.c), at(mid, end.c), at(end.m, end.c)]);
        if (items.get(keys[k + 1]).label === i) labelAt = at(b.m, b.c);
      }
      return { ...edge, back: false, segs, labelAt, labelBox: label };
    }
    const u = centerOf(edge.from);
    const ub = items.get(edge.from).box;
    if (edge.from === edge.to) {
      const ce = u.c + crossOf(ub) / 2;
      const off = Math.min(10, mainSize(ub) / 4);
      return {
        ...edge,
        back: true,
        segs: [['M', at(u.m - off, ce)], ['C', at(u.m - 26, ce + 40), at(u.m + 26, ce + 40), at(u.m + off, ce)]],
        labelAt: label ? at(u.m, ce + 30 + (horizontal ? label.h : label.w) / 2) : null,
        labelBox: label
      };
    }
    return { ...edge, back: true, pending: true, labelBox: label };
  });

  // Back edges: around the cross-max side of every layer they span.
  let lane = 0;
  edges.forEach((edge) => {
    if (!edge.pending) return;
    delete edge.pending;
    const u = centerOf(edge.from);
    const v = centerOf(edge.to);
    const lo = Math.min(layerOf(edge.from), layerOf(edge.to));
    const hi = Math.max(layerOf(edge.from), layerOf(edge.to));
    let extent = -Infinity;
    for (let l = lo; l <= hi; l++) for (const it of layers[l]) extent = Math.max(extent, cross.get(it.key) + crossOf(it.box) / 2);
    const labelCross = edge.labelBox ? (horizontal ? edge.labelBox.h : edge.labelBox.w) : 0;
    const side = extent + 28 + lane + labelCross / 2;
    lane += Math.max(22, labelCross + 12);
    const uc = u.c + crossOf(items.get(edge.from).box) / 2;
    const vc = v.c + crossOf(items.get(edge.to).box) / 2;
    const dir = Math.sign(v.m - u.m) || -1;
    const r = Math.min(18, Math.abs(v.m - u.m) / 3);
    edge.segs = [
      ['M', at(u.m, uc)],
      ['C', at(u.m, side), at(u.m, side), at(u.m + dir * r, side)],
      ['L', at(v.m - dir * r, side)],
      ['C', at(v.m, side), at(v.m, side), at(v.m, vc)]
    ];
    edge.labelAt = edge.labelBox ? at((u.m + v.m) / 2, side) : null;
  });

  // Convert to x/y, compute bounds, shift into view.
  const toXY = (p) => (horizontal ? { x: p.m, y: p.c } : { x: p.c, y: p.m });
  const nodeOut = new Map(graph.nodes.map((n) => {
    const p = toXY(at(layerCenter[layerOf(n.id)], cross.get(n.id)));
    const b = boxes.get(n.id);
    return [n.id, { x: p.x, y: p.y, w: b.w, h: b.h, lines: b.lines, shape: b.shape, rank: rank.get(n.id) }];
  }));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x, y, hw = 0, hh = 0) => {
    minX = Math.min(minX, x - hw);
    maxX = Math.max(maxX, x + hw);
    minY = Math.min(minY, y - hh);
    maxY = Math.max(maxY, y + hh);
  };
  nodeOut.forEach((b) => grow(b.x, b.y, b.w / 2, b.h / 2));
  edges.forEach((e) => {
    e.segs.forEach(([, ...pts]) => pts.forEach((p) => grow(toXY(p).x, toXY(p).y)));
    if (e.labelAt) grow(toXY(e.labelAt).x, toXY(e.labelAt).y, e.labelBox.w / 2, e.labelBox.h / 2);
  });
  const dx = MARGIN - minX;
  const dy = MARGIN - minY;
  const round = (n) => Math.round(n * 10) / 10;
  const fmt = (p) => {
    const { x, y } = toXY(p);
    return `${round(x + dx)},${round(y + dy)}`;
  };
  nodeOut.forEach((b) => {
    b.x = round(b.x + dx);
    b.y = round(b.y + dy);
  });
  return {
    direction: graph.direction,
    width: Math.ceil(maxX - minX + 2 * MARGIN),
    height: Math.ceil(maxY - minY + 2 * MARGIN),
    nodes: nodeOut,
    edges: edges.map((e) => {
      const label = e.labelAt
        ? { ...e.labelBox, x: round(toXY(e.labelAt).x + dx), y: round(toXY(e.labelAt).y + dy) }
        : null;
      return {
        from: e.from,
        to: e.to,
        label: e.label,
        back: e.back,
        path: e.segs.map(([cmd, ...pts]) => `${cmd}${pts.map(fmt).join(' ')}`).join(' '),
        labelBox: label
      };
    })
  };
}

// ---------------------------------------------------------------------------
// SVG
// ---------------------------------------------------------------------------

const ESCAPES = Object.freeze({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' });
const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

// SVG paint classes (fc, fc-shape, fc-decision, fc-text, fc-edge, fc-arrowhead, fc-label-bg, fc-label) are styled in
// src/core/styles/brain.css (@layer components); colours come from the --fc-* variables there.

function textLines(lines, x, y, lineHeight, cls) {
  const top = y - ((lines.length - 1) * lineHeight) / 2;
  const spans = lines.map((line, i) => `<tspan x="${x}" y="${Math.round((top + i * lineHeight) * 10) / 10}">${esc(line)}</tspan>`).join('');
  return `<text class="${cls}" text-anchor="middle" dominant-baseline="central">${spans}</text>`;
}

function shapeSvg(b) {
  const left = b.x - b.w / 2;
  const top = b.y - b.h / 2;
  if (b.shape === 'diamond') {
    return `<polygon class="fc-shape fc-decision" points="${b.x},${top} ${left + b.w},${b.y} ${b.x},${top + b.h} ${left},${b.y}"/>`;
  }
  if (b.shape === 'circle') return `<circle class="fc-shape" cx="${b.x}" cy="${b.y}" r="${b.w / 2}"/>`;
  const rx = b.shape === 'pill' ? b.h / 2 : b.shape === 'round' ? 14 : 8;
  return `<rect class="fc-shape" x="${left}" y="${top}" width="${b.w}" height="${b.h}" rx="${rx}"/>`;
}

/**
 * Render a parsed + laid-out flowchart as an accessible SVG string.
 * `idPrefix` keeps marker ids unique when several diagrams share a page.
 */
export function renderFlowchartSvg(graph, layout, { title = 'Flowchart', idPrefix = 'fc', minWidth } = {}) {
  const prefix = String(idPrefix).replace(/[^A-Za-z0-9_-]/g, '-');
  const marker = `${prefix}-arrow`;
  const style = minWidth ? ` style="min-width:${Math.round(minWidth)}px"` : '';
  const parts = [
    `<svg class="fc" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}" role="img" aria-labelledby="${prefix}-title"${style}>`,
    `<title id="${prefix}-title">${esc(title)}</title>`,
    `<defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="fc-arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>`
  ];
  for (const e of layout.edges) parts.push(`<path class="fc-edge"${e.back ? ' data-back' : ''} d="${e.path}" marker-end="url(#${marker})"/>`);
  for (const e of layout.edges) {
    if (!e.labelBox) continue;
    const l = e.labelBox;
    parts.push(`<g data-fc="label"><rect class="fc-label-bg" x="${Math.round((l.x - l.w / 2) * 10) / 10}" y="${Math.round((l.y - l.h / 2) * 10) / 10}" width="${l.w}" height="${l.h}" rx="${Math.min(10, l.h / 2)}"/>${textLines(l.lines, l.x, l.y, LABEL_LINE_H, 'fc-label')}</g>`);
  }
  for (const n of graph.nodes) {
    const b = layout.nodes.get(n.id);
    parts.push(`<g data-fc="node">${shapeSvg(b)}${textLines(b.lines, b.x, b.y, LINE_H, 'fc-text')}</g>`);
  }
  parts.push('</svg>');
  return parts.join('\n');
}

/** Parse, lay out and render in one call (throws if the source cannot be parsed). */
export function flowchartToSvg(source, options = {}) {
  const graph = parseFlowchart(source);
  return renderFlowchartSvg(graph, layoutFlowchart(graph), options);
}
