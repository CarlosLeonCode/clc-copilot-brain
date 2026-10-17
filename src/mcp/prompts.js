export const PROMPTS_DEFINITIONS = [
  {
    name: 'call',
    description: 'Analyze a sales call transcript or notes, extract deal signals, objections, coaching feedback, and save to sales/calls/YYYY-MM/.',
    arguments: [
      {
        name: 'transcript',
        description: 'Raw call transcript or meeting notes to analyze.',
        required: false
      },
      {
        name: 'rep',
        description: 'Sales representative name (e.g., Carlos, Sarah).',
        required: false
      },
      {
        name: 'prospect',
        description: 'Prospect company name.',
        required: false
      }
    ]
  },
  {
    name: 'objection',
    description: 'Search documented objections or capture a new objection into sales/objections/.',
    arguments: [
      {
        name: 'topic',
        description: 'Objection topic, buyer hesitation, or trigger phrase to look up or record.',
        required: false
      }
    ]
  },
  {
    name: 'battlecard',
    description: 'Compare against a competitor and get silver bullets from sales/battlecards/.',
    arguments: [
      {
        name: 'competitor',
        description: 'Competitor name to compare against.',
        required: false
      }
    ]
  },
  {
    name: 'flow',
    description: 'Inspect or update sales pipeline stages, MEDDPICC qualification criteria, or Mermaid sales flow diagrams in sales/stages/pipeline-stages.md and sales/qualification/qualification-matrix.md.',
    arguments: [
      {
        name: 'stage',
        description: 'Optional pipeline stage or qualification gate to inspect or update.',
        required: false
      }
    ]
  },
  {
    name: 'retro',
    description: 'Run a monthly RevOps retrospective across sales/calls/ and sales/win-loss/.',
    arguments: [
      {
        name: 'month',
        description: 'Target month in YYYY-MM format (defaults to current month).',
        required: false
      }
    ]
  }
];

export function getPrompt(name, args = {}) {
  switch (name) {
    case 'call': {
      const { transcript, rep, prospect } = args;
      const contextLines = [];
      if (rep) contextLines.push(`- **Sales Rep:** ${rep}`);
      if (prospect) contextLines.push(`- **Prospect:** ${prospect}`);
      if (transcript) contextLines.push(`- **Transcript / Notes:**\n\`\`\`text\n${transcript}\n\`\`\``);

      return {
        description: 'Analyze a sales call transcript and persist structured intelligence to sales/calls/YYYY-MM/.',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Execute the Sales Call Analyzer workflow grounded in \`skills/skill_call_analyzer.md\`:\n\n1. Analyze the sales call transcript or meeting notes.\n2. Cross-reference detected objections against \`sales/objections/\` and competitors against \`sales/battlecards/\`.\n3. Extract Executive Summary, Deal Stage, MEDDPICC signals, Coaching Feedback, and Action Items.\n4. Save the structured call log into \`sales/calls/YYYY-MM/\` (or call \`brain_capture_call\`) after human-in-the-loop confirmation.\n\n${contextLines.length > 0 ? `### Provided Call Context\n${contextLines.join('\n')}` : 'Please ask me to paste the call transcript or meeting notes if not already provided.'}`
            }
          }
        ]
      };
    }

    case 'objection': {
      const { topic } = args;
      return {
        description: 'Resolve a buyer objection or capture a new schema-validated objection card in sales/objections/.',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Execute the Objection Handling workflow grounded in \`skills/skill_sales_copilot.md\` and \`schemas/sales-objection.schema.json\`:\n\n1. Search \`sales/objections/\` (or invoke \`brain_query\`) for matching objection cards.\n2. Return the **Verbatim Pivot Script**, **Root Cause**, **Top Counter-Arguments**, **Proof Points**, and **Suggested Next Step**.\n3. If this is a new objection not yet in \`sales/objections/\`, offer to save it using \`brain_capture_objection\` conforming to \`schemas/sales-objection.schema.json\`.\n\n${topic ? `### Objection / Buyer Hesitation\n"${topic}"` : 'Ask me what objection the buyer raised or what new objection I want to save.'}`
            }
          }
        ]
      };
    }

    case 'battlecard': {
      const { competitor } = args;
      return {
        description: 'Retrieve competitive positioning and silver bullets from sales/battlecards/.',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Execute the Competitive Battlecard workflow grounded in \`skills/skill_sales_copilot.md\` and \`schemas/sales-battlecard.schema.json\`:\n\n1. Inspect \`sales/battlecards/\` (or invoke \`brain_query\`) for the target competitor.\n2. Present a clear breakdown: **Our Silver Bullets**, **Competitor Strengths**, **Competitor Weaknesses / Landmines**, **Pricing Comparison**, and **Verbatim Trap-Setting Questions**.\n3. If no battlecard exists yet for this competitor, flag the gap and offer to scaffold a new JSON + Markdown battlecard in \`sales/battlecards/\`.\n\n${competitor ? `### Target Competitor\n${competitor}` : 'Ask me which competitor we are going up against.'}`
            }
          }
        ]
      };
    }

    case 'flow': {
      const { stage } = args;
      return {
        description: 'Inspect or update sales pipeline stages, MEDDPICC criteria, and Mermaid flowcharts.',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Inspect and manage our Sales Flow & Pipeline Architecture grounded in \`sales/stages/pipeline-stages.md\` and \`sales/qualification/qualification-matrix.md\`:\n\n1. Review the canonical pipeline stages (Discovery, Validation, Business Case, Negotiation, Closed Won/Lost) and mandatory exit gates.\n2. Check MEDDPICC qualification criteria and disqualification triggers.\n3. If the user provides a screenshot, whiteboard image, or updated process description, convert or update the interactive **Mermaid flowchart** inside \`sales/stages/pipeline-stages.md\` (and optional Archify workflow in \`sales/flows/\`).\n\n${stage ? `### Requested Stage / Focus\n${stage}` : 'Show our current pipeline stages and ask if I want to check deal exit criteria or update our Mermaid sales flow diagram.'}`
            }
          }
        ]
      };
    }

    case 'retro': {
      const { month } = args;
      return {
        description: 'Run a monthly RevOps retrospective across sales/calls/ and sales/win-loss/.',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Execute the Monthly RevOps Retrospective grounded in \`skills/skill_monthly_retrospective.md\`:\n\n1. Aggregate all call logs in \`sales/calls/${month || 'YYYY-MM'}/\` and post-mortems in \`sales/win-loss/\`.\n2. Compute rep performance metrics, recurring objection frequency, competitor encounter rates, and pipeline stage friction bottlenecks.\n3. Recommend concrete updates to \`sales/objections/\`, \`sales/battlecards/\`, and \`sales/scripts/\` for human-in-the-loop approval.\n\n${month ? `### Target Month\n${month}` : 'Run the retrospective for the most recent month in `sales/calls/` or ask me which `YYYY-MM` partition to analyze.'}`
            }
          }
        ]
      };
    }

    default:
      return null;
  }
}
