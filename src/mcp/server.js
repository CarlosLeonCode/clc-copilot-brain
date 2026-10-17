import readline from 'node:readline';
import { getToolDefinitions, executeTool } from './tools.js';
import { PROMPTS_DEFINITIONS, getPrompt } from './prompts.js';

export class McpServer {
  constructor({ rootDir = process.cwd() } = {}) {
    this.rootDir = rootDir;
  }

  async handleMessage(message) {
    if (!message || typeof message !== 'object') {
      return this._formatError(null, -32700, 'Parse error');
    }

    const { id, method, params } = message;

    // Notifications (no id)
    if (id === undefined || id === null) {
      if (method === 'notifications/initialized') {
        return null;
      }
      return null;
    }

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
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

  startStdio() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const message = JSON.parse(trimmed);
        const response = await this.handleMessage(message);
        if (response) {
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      } catch (err) {
        const errorResponse = this._formatError(null, -32700, `Parse error: ${err.message}`);
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    });

    process.on('SIGINT', () => {
      process.exit(0);
    });
  }
}
