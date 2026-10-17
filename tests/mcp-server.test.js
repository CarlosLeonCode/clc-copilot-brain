import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { McpServer } from '../src/mcp/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

test('MCP Server Suite: Protocol Handshake & Tool Execution', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));
  
  // Create a minimal brain scaffold inside tmpDir to test file writes
  fs.mkdirSync(path.join(tmpDir, 'sales', 'calls', '2026-10'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'sales', 'objections'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'schemas'), { recursive: true });
  fs.copyFileSync(
    path.join(REPO_ROOT, 'schemas', 'sales-objection.schema.json'),
    path.join(tmpDir, 'schemas', 'sales-objection.schema.json')
  );
  fs.writeFileSync(path.join(tmpDir, 'org-kernel.json'), JSON.stringify({
    schemaVersion: '1.0.0',
    organization: { name: 'Test Org', industry: 'tech', tagline: 'Test' },
    activeAreas: ['sales']
  }));
  fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# Agents');

  const server = new McpServer({ rootDir: tmpDir });

  await t.test('initialize returns protocol version and server capabilities', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' }
    });

    assert.equal(res.jsonrpc, '2.0');
    assert.equal(res.id, 1);
    assert.equal(res.result.serverInfo.name, 'copilot-brain');
    assert.ok(res.result.capabilities.tools);
    assert.ok(res.result.capabilities.prompts);
  });

  await t.test('prompts/list returns 5 actionable slash prompts with argument definitions', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 10,
      method: 'prompts/list',
      params: {}
    });

    assert.equal(res.id, 10);
    const prompts = res.result.prompts;
    assert.ok(Array.isArray(prompts));
    const promptNames = prompts.map(p => p.name);
    assert.deepEqual(promptNames, ['call', 'objection', 'battlecard', 'flow', 'retro']);
    for (const prompt of prompts) {
      assert.ok(prompt.description && prompt.description.length > 10);
      assert.ok(Array.isArray(prompt.arguments));
    }
  });

  await t.test('prompts/get returns structured messages for valid prompts and -32602 error for unknown prompts', async () => {
    for (const name of ['call', 'objection', 'battlecard', 'flow', 'retro']) {
      const res = await server.handleMessage({
        jsonrpc: '2.0',
        id: 11,
        method: 'prompts/get',
        params: {
          name,
          arguments: {}
        }
      });

      assert.equal(res.id, 11);
      assert.ok(res.result, `Expected result for prompt ${name}`);
      assert.ok(Array.isArray(res.result.messages), `Expected messages array for prompt ${name}`);
      assert.ok(res.result.messages.length > 0);
      assert.equal(res.result.messages[0].role, 'user');
      assert.equal(res.result.messages[0].content.type, 'text');
      assert.ok(res.result.messages[0].content.text.length > 50);
    }

    const unknownRes = await server.handleMessage({
      jsonrpc: '2.0',
      id: 12,
      method: 'prompts/get',
      params: {
        name: 'non_existent_prompt',
        arguments: {}
      }
    });

    assert.equal(unknownRes.id, 12);
    assert.ok(unknownRes.error, 'Unknown prompt must return a JSON-RPC error');
    assert.equal(unknownRes.error.code, -32602);
  });

  await t.test('tools/list returns 4 core brain tools with input schemas', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    });

    assert.equal(res.id, 2);
    const tools = res.result.tools;
    assert.ok(Array.isArray(tools));
    const toolNames = tools.map(tool => tool.name);
    assert.ok(toolNames.includes('brain_query'));
    assert.ok(toolNames.includes('brain_capture_call'));
    assert.ok(toolNames.includes('brain_capture_objection'));
    assert.ok(toolNames.includes('brain_doctor'));
  });

  await t.test('tools/call brain_query searches repository assets', async () => {
    // Add a mock asset
    fs.writeFileSync(
      path.join(tmpDir, 'sales', 'objections', 'pricing.md'),
      '# Objection: Pricing is too high\nWe show 3x ROI in 30 days.'
    );

    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'brain_query',
        arguments: { query: 'pricing' }
      }
    });

    assert.equal(res.id, 3);
    assert.ok(res.result.content[0].text.includes('Pricing is too high'));
  });

  await t.test('tools/call brain_capture_call writes structured call log file', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'brain_capture_call',
        arguments: {
          rep: 'Carlos',
          prospect: 'Acme Corp',
          date: '2026-10-15',
          summary: 'Prospect showed interest in enterprise plan.',
          stage: 'Discovery',
          outcome: 'Next step scheduled',
          notes: 'Follow up on ROI calculation',
          rawTranscript: 'Carlos: Hi Sarah... Sarah: We need to see ROI in 30 days.'
        }
      }
    });

    assert.equal(res.id, 4);
    assert.ok(res.result.content[0].text.includes('successfully'));

    const expectedFile = path.join(tmpDir, 'sales', 'calls', '2026-10', '2026-10-15_carlos_acme-corp.md');
    assert.ok(fs.existsSync(expectedFile), 'Call log markdown file must exist');
    const content = fs.readFileSync(expectedFile, 'utf-8');
    assert.ok(content.includes('rep: "Carlos"'));
    assert.ok(content.includes('Acme Corp'));
    assert.ok(content.includes('Raw Call Transcript'));
    assert.ok(content.includes('Sarah: We need to see ROI in 30 days.'));
  });

  await t.test('tools/call brain_capture_objection validates schema correctly', async () => {
    // Negative test: invalid objection
    const invalidRes = await server.handleMessage({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'brain_capture_objection',
        arguments: {
          id: 'bad-obj'
          // missing required fields
        }
      }
    });

    assert.ok(invalidRes.result.isError, 'Invalid objection must report error');

    // Positive test: valid objection
    const validRes = await server.handleMessage({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'brain_capture_objection',
        arguments: {
          id: 'timing-bad',
          title: 'Not the right time for us',
          category: 'timing',
          severity: 'medium',
          rootCause: 'Buyer has competing priorities this quarter.',
          pivotScript: 'Understood. What milestones need to happen before this becomes a priority?',
          counterArguments: [
            'Delaying implementation increases technical debt cost',
            'Pilot setup takes under 2 hours without blocking current sprint'
          ]
        }
      }
    });

    assert.equal(validRes.result.isError, false);
    const jsonPath = path.join(tmpDir, 'sales', 'objections', 'timing-bad.json');
    const mdPath = path.join(tmpDir, 'sales', 'objections', 'timing-bad.md');
    assert.ok(fs.existsSync(jsonPath));
    assert.ok(fs.existsSync(mdPath));
  });

  await t.test('tools/call brain_doctor runs diagnostics', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'brain_doctor',
        arguments: {}
      }
    });

    assert.equal(res.id, 7);
    assert.ok(res.result.content[0].text.includes('Health'));
  });

  // Clean up
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
});
