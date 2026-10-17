// Typed domain error. Adapters map `code` to exit codes (CLI) or tool errors (MCP).
export class BrainError extends Error {
  /**
   * @param {string} code - Stable machine-readable code (e.g. 'INVALID_AREA_ID')
   * @param {string} message - Human-readable description
   */
  constructor(code, message) {
    super(message);
    this.name = 'BrainError';
    this.code = code;
  }
}
