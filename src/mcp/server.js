import readline from 'node:readline';
import { getToolDefinitions, executeTool } from './tools.js';
import { PROMPTS_DEFINITIONS, getPrompt } from './prompts.js';

// Latest first. The MCP spec 2025-06-18 removed JSON-RPC batching, so arrays are rejected.
export const SUPPORTED_PROTOCOL_VERSIONS = Object.freeze(['2025-06-18', '2025-03-26', '2024-11-05']);

function negotiateProtocolVersion(requested) {
  return SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : SUPPORTED_PROTOCOL_VERSIONS[0];
}

function isValidId(id) {
  return id === null || typeof id === 'string' || typeof id === 'number';
}

export class McpServer {
  constructor({ rootDir = process.cwd() } = {}) {
    this.rootDir = rootDir;
  }

  async handleMessage(message) {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return this._formatError(null, -32600, 'Invalid Request: expected a JSON-RPC 2.0 request object');
    }

    const isNotification = !('id' in message);
    const { id, method, params } = message;

    if (message.jsonrpc !== '2.0' || typeof method !== 'string' || (!isNotification && !isValidId(id))) {
      return this._formatError(isValidId(id) ? id : null, -32600, 'Invalid Request');
    }

    // Notifications (no id member) never receive a response, not even an error.
    if (isNotification) return null;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: negotiateProtocolVersion(params?.protocolVersion),
            serverInfo: {
              name: 'copilot-brain',
              version: '1.0.0'
            },
            capabilities: {
              tools: {},
              prompts: {}
            }
          }
        };

      case 'ping':
        return { jsonrpc: '2.0', id, result: {} };

      case 'prompts/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            prompts: PROMPTS_DEFINITIONS
          }
        };

      case 'prompts/get': {
        const promptName = params?.name;
        const promptArgs = params?.arguments || {};
        const promptResult = getPrompt(promptName, promptArgs);
        if (!promptResult) {
          return this._formatError(id, -32602, `Invalid params: Unknown prompt "${promptName}"`);
        }
        return {
          jsonrpc: '2.0',
          id,
          result: promptResult
        };
      }

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: getToolDefinitions(this.rootDir)
          }
        };

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        try {
          const toolResult = await executeTool(toolName, toolArgs, { rootDir: this.rootDir });
          return {
            jsonrpc: '2.0',
            id,
            result: toolResult
          };
        } catch (err) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [{ type: 'text', text: `Tool execution failed: ${err.message}` }]
            }
          };
        }
      }

      default:
        return this._formatError(id, -32601, `Method not found: "${method}"`);
    }
  }

  _formatError(id, code, message) {
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      error: {
        code,
        message
      }
    };
  }

  /** Process one raw stdio line. Returns the response object, or null when none is due. */
  async handleLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return null;
    let message;
    try {
      message = JSON.parse(trimmed);
    } catch (err) {
      return this._formatError(null, -32700, `Parse error: ${err.message}`);
    }
    if (Array.isArray(message)) {
      return this._formatError(null, -32600, 'Invalid Request: JSON-RPC batching is not supported (removed in MCP 2025-06-18)');
    }
    return this.handleMessage(message);
  }

  /**
   * Build a line listener that processes lines sequentially so responses are written in request order.
   * Each call returns the promise for that line's completion.
   */
  createLineHandler(write) {
    let queue = Promise.resolve();
    return (line) => {
      queue = queue.then(async () => {
        let response;
        try {
          response = await this.handleLine(line);
        } catch (err) {
          response = this._formatError(null, -32603, `Internal error: ${err.message}`);
        }
        if (response) write(JSON.stringify(response) + '\n');
      });
      return queue;
    };
  }

  startStdio() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', this.createLineHandler((text) => process.stdout.write(text)));

    process.on('SIGINT', () => {
      process.exit(0);
    });
  }
}
