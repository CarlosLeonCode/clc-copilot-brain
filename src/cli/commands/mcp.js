// `mcp`: serve the brain over stdio (JSON-RPC 2.0). The process stays alive on stdin.
import { McpServer } from '../../mcp/server.js';

export async function runMcp(targetDir) {
  new McpServer({ rootDir: targetDir }).startStdio();
  return 0;
}
