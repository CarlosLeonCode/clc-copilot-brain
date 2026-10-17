// MCP adapter: tool schemas plus thin handlers that delegate to src/core use cases.
import { resolveAllowedAreas, PRESET_AREA_IDS } from '../core/areas.js';
import { captureCall } from '../core/calls.js';
import { runDoctor } from '../core/doctor.js';
import { BrainError } from '../core/errors.js';
import { captureObjection } from '../core/objections.js';
import { queryBrain } from '../core/query.js';

// Static definitions advertise the preset areas; tools/list uses getToolDefinitions(rootDir),
// which also advertises the custom areas declared in the brain's org-kernel.json.
export const TOOLS_DEFINITIONS = [
  {
    name: 'brain_query',
    description: 'Search and retrieve organizational knowledge assets (battlecards, objections, SOPs, playbooks, calls) from the Second Brain.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keyword, topic, competitor name, or objection trigger to search for.'
        },
        area: {
          type: 'string',
          enum: [...PRESET_AREA_IDS],
          description: 'Optional operational area to narrow down the search.'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'brain_capture_call',
    description: 'Record an analyzed sales call into the Second Brain historical memory (sales/calls/YYYY-MM/).',
    inputSchema: {
      type: 'object',
      properties: {
        rep: {
          type: 'string',
          description: 'Sales representative name (e.g. Carlos, Juanita, Pepito).'
        },
        prospect: {
          type: 'string',
          description: 'Company or prospect name.'
        },
        date: {
          type: 'string',
          description: 'Call date in YYYY-MM-DD format.'
        },
        summary: {
          type: 'string',
          description: 'Executive summary or key discussion takeaways.'
        },
        stage: {
          type: 'string',
          description: 'Pipeline stage (Discovery, Validation, Business Case, Negotiation, Closed Won, Closed Lost).'
        },
        outcome: {
          type: 'string',
          description: 'Immediate outcome or next step scheduled.'
        },
        notes: {
          type: 'string',
          description: 'Detailed call notes, objections raised, or coaching feedback.'
        },
        objections: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of objections encountered during the call.'
        },
        actionItems: {
          type: 'array',
          items: { type: 'string' },
          description: 'Action items and owners following the call.'
        },
        rawTranscript: {
          type: 'string',
          description: 'Optional complete raw transcript or meeting recording text to archive.'
        }
      },
      required: ['rep', 'prospect', 'date', 'summary', 'stage', 'outcome']
    }
  },
  {
    name: 'brain_capture_objection',
    description: 'Save or update a validated objection-handling card in sales/objections/ conforming to schemas/sales-objection.schema.json.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Kebab-case unique identifier (e.g. pricing-too-high, competitor-legacy).'
        },
        title: {
          type: 'string',
          description: 'Short title describing the objection.'
        },
        category: {
          type: 'string',
          enum: ['pricing', 'timing', 'authority', 'competitor', 'trust', 'technical_fit'],
          description: 'Category of objection.'
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'blocker'],
          description: 'Deal impact severity.'
        },
        triggerPhrases: {
          type: 'array',
          items: { type: 'string' },
          description: 'Verbatim phrases prospects say when raising this objection.'
        },
        rootCause: {
          type: 'string',
          description: 'Underlying reason or fear behind the objection.'
        },
        pivotScript: {
          type: 'string',
          description: 'Immediate verbatim pivot script / empathetic acknowledgment.'
        },
        counterArguments: {
          type: 'array',
          items: { type: 'string' },
          description: 'Structured talking points and proof angles.'
        },
        suggestedNextStep: {
          type: 'string',
          description: 'Recommended next action or closing bridge.'
        },
        proofPoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Customer case studies or ROI metrics.'
        }
      },
      required: ['id', 'title', 'category', 'severity', 'rootCause', 'pivotScript', 'counterArguments']
    }
  },
  {
    name: 'brain_doctor',
    description: 'Run health and integrity diagnostics on the Second Brain repository.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

/** Tool definitions for a given brain: brain_query's area enum lists every allowed area. */
export function getToolDefinitions(rootDir) {
  const areas = resolveAllowedAreas(rootDir);
  return TOOLS_DEFINITIONS.map((def) => def.name !== 'brain_query' ? def : {
    ...def,
    inputSchema: {
      ...def.inputSchema,
      properties: { ...def.inputSchema.properties, area: { ...def.inputSchema.properties.area, enum: areas } }
    }
  });
}

const HANDLERS = {
  brain_query: handleQuery,
  brain_capture_call: (args, rootDir) => textResult(`✅ Call log saved successfully to ${captureCall(rootDir, args).relPath}`),
  brain_capture_objection: (args, rootDir) => {
    captureObjection(rootDir, args);
    return textResult(`✅ Objection "${args.title}" (${args.id}) saved successfully to sales/objections/${args.id}.json and ${args.id}.md`);
  },
  brain_doctor: (_args, rootDir) => textResult(formatDoctor(runDoctor(rootDir)))
};

export async function executeTool(name, args, { rootDir = process.cwd() } = {}) {
  const handler = HANDLERS[name];
  if (!handler) return errorResult(`Unknown tool: "${name}"`);
  try {
    return handler(args || {}, rootDir);
  } catch (err) {
    // Domain validation failures are tool errors, not protocol errors.
    if (err instanceof BrainError) return errorResult(err.message);
    throw err;
  }
}

function handleQuery(args, rootDir) {
  const { query, matches } = queryBrain(rootDir, { query: args.query, area: args.area });
  if (matches.length === 0) {
    return textResult(`🔍 No direct matches found for "${query}" across active Second Brain areas.\n\nTip: You can add new knowledge using brain_capture_objection, brain_capture_call, or clc-brain add-area.`);
  }
  const formatted = matches.slice(0, 10)
    .map((m, idx) => `### ${idx + 1}. [${m.file}](./${m.file})\n\`\`\`markdown\n${m.snippet}\n\`\`\``)
    .join('\n\n');
  return textResult(`Found ${matches.length} matching asset(s) for "${query}":\n\n${formatted}`);
}

function formatDoctor(result) {
  const lines = [
    ...result.passed.map((m) => `- ✔ ${m}`),
    ...result.issues.map((i) => `- ${i.level === 'error' ? '❌' : '⚠️'} ${i.message}`)
  ];
  return `### 🩺 Second Brain Doctor (Health & Integrity)\n\n${lines.join('\n')}\n\n` +
    `Checks passed: ${result.checksPassed} | Warnings: ${result.warnings} | Errors: ${result.errors}\n` +
    `Overall Status: ${result.errors > 0 ? 'Unhealthy' : 'Healthy'}`;
}

function textResult(text) {
  return { isError: false, content: [{ type: 'text', text }] };
}

function errorResult(text) {
  return { isError: true, content: [{ type: 'text', text }] };
}
