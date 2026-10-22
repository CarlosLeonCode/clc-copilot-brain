// Typed domain error. Adapters map `code` to exit codes (CLI) or tool errors (MCP).
export class BrainError extends Error {
  /**
   * @param {string} code - Stable machine-readable code (e.g. 'INVALID_AREA_ID')
   * @param {string} message - Human-readable description
   * @param {Record<string, unknown>} [details] - Values adapters may use to word the message themselves
   */
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'BrainError';
    this.code = code;
    this.details = details;
  }
}
