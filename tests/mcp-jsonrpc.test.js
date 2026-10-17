import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { McpServer, SUPPORTED_PROTOCOL_VERSIONS } from '../src/mcp/server.js';

const server = () => new McpServer({ rootDir: os.tmpdir() });

test('initialize echoes a supported client protocolVersion', async () => {
  for (const version of ['2025-06-18', '2025-03-26', '2024-11-05']) {
    const res = await server().handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: version } });
    assert.equal(res.result.protocolVersion, version);
  }
});

test('initialize answers with the latest supported version for an unknown client version', async () => {
  assert.deepEqual(SUPPORTED_PROTOCOL_VERSIONS, ['2025-06-18', '2025-03-26', '2024-11-05']);
  const res = await server().handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } });
  assert.equal(res.result.protocolVersion, '2025-06-18');
  const noParams = await server().handleMessage({ jsonrpc: '2.0', id: 2, method: 'initialize' });
  assert.equal(noParams.result.protocolVersion, '2025-06-18');
});

test('a request with id null gets a response with id null', async () => {
  const res = await server().handleMessage({ jsonrpc: '2.0', id: null, method: 'tools/list' });
  assert.ok(res, 'id: null is a request, not a notification');
  assert.equal(res.id, null);
  assert.ok(Array.isArray(res.result.tools));
});

test('notifications (no id member) never get a response, even for unknown methods', async () => {
  assert.equal(await server().handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  assert.equal(await server().handleMessage({ jsonrpc: '2.0', method: 'does/not/exist' }), null);
});

test('unknown method on a request returns -32601', async () => {
  const res = await server().handleMessage({ jsonrpc: '2.0', id: 9, method: 'does/not/exist' });
  assert.equal(res.id, 9);
  assert.equal(res.error.code, -32601);
});

test('invalid requests return -32600 with the request id when it is valid', async () => {
  const cases = [
    [{ id: 3, method: 'tools/list' }, 3],
    [{ jsonrpc: '1.0', id: 'a', method: 'tools/list' }, 'a'],
    [{ jsonrpc: '2.0', id: 4 }, 4],
    [{ jsonrpc: '2.0', id: 5, method: 42 }, 5],
    [{ jsonrpc: '2.0', id: { bad: true }, method: 'tools/list' }, null],
    [{ jsonrpc: '2.0', method: 7 }, null]
  ];
  for (const [msg, expectedId] of cases) {
    const res = await server().handleMessage(msg);
    assert.ok(res, `expected a response for ${JSON.stringify(msg)}`);
    assert.equal(res.error.code, -32600, JSON.stringify(msg));
    assert.equal(res.id, expectedId);
  }
  for (const msg of [42, 'str', null, true]) {
    const res = await server().handleMessage(msg);
    assert.equal(res.error.code, -32600);
    assert.equal(res.id, null);
  }
});

test('handleLine: parse errors return -32700 with id null', async () => {
  const res = await server().handleLine('{not json');
  assert.equal(res.error.code, -32700);
  assert.equal(res.id, null);
});

test('handleLine: batch arrays are rejected with a single -32600 and id null', async () => {
  const res = await server().handleLine(JSON.stringify([{ jsonrpc: '2.0', id: 1, method: 'tools/list' }]));
  assert.equal(res.error.code, -32600);
  assert.equal(res.id, null);
  assert.match(res.error.message, /batch/i);
});

test('handleLine: blank lines produce no response', async () => {
  assert.equal(await server().handleLine('   '), null);
});

test('createLineHandler writes responses in request order even when an earlier request is slower', async () => {
  const s = server();
  const original = s.handleMessage.bind(s);
  s.handleMessage = async (msg) => {
    if (msg.method === 'slow') {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return { jsonrpc: '2.0', id: msg.id, result: 'slow' };
    }
    return original(msg);
  };
  const written = [];
  const onLine = s.createLineHandler((text) => written.push(JSON.parse(text)));
  onLine(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'slow' }));
  onLine(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
  const done = onLine(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }));
  await done;
  assert.deepEqual(written.map((r) => r.id), [1, 2]);
});

test('ping returns an empty result', async () => {
  const res = await server().handleMessage({ jsonrpc: '2.0', id: 'p1', method: 'ping' });
  assert.equal(res.id, 'p1');
  assert.deepEqual(res.result, {});
  assert.equal(res.error, undefined);
});

test('notifications/initialized over the line handler writes nothing', async () => {
  const written = [];
  const onLine = server().createLineHandler((text) => written.push(text));
  await onLine(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }));
  assert.deepEqual(written, []);
});
