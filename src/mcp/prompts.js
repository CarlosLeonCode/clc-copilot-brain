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
    description: 'Import, understand and update the sales pipeline (sales/stages/pipeline-stages.md) or conversation plays (sales/plays/) from any drawing, file or description, with a preview and approval before saving.',
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
              text: `Execute the Sales Call Analyzer workflow grounded in \`skills/skill_call_analyzer.md\`:\n\n1. Analyze the sales call transcript or meeting notes. Ask only for missing essentials (who, which company, how it ended), one at a time; infer the rest.\n2. Cross-reference detected objections against \`sales/objections/\` and competitors against \`sales/battlecards/\`.\n3. Extract Executive Summary, Deal Stage (a stage name from the stage table of \`sales/system.md\`, gates in \`sales/stages/pipeline-stages.md\`), qualification signals for each criterion of \`sales/qualification/qualification-matrix.md\` (in the terms of \`sales/glossary.md\` when it exists), Coaching Feedback, and Action Items.\n4. Infer the \`play\` run (a file in \`sales/plays/\`), the \`branch\` ID where the call went or broke, and \`gate_advanced\` (true/false), and write them with the canonical frontmatter keys. Also infer the type of sale, the lead source and whether the guide's success was reached, and write \`motion\`, \`lead_source\`, \`deal_id\` (reuse the deal's earlier one) and \`goal_met\` (never taken from \`gate_advanced\`).\n5. Review checkpoint: confirm in ONE plain sentence in my language (including the type of sale, the lead source and whether the goal was reached), then ask "Save it?" / "¿Lo guardo?". Show the full log only if I ask. Never show internal IDs, field names or file paths, and never say HITL.\n6. After I say yes, save the structured call log into \`sales/calls/YYYY-MM/\` (or call \`brain_capture_call\`).\n\n${contextLines.length > 0 ? `### Provided Call Context\n${contextLines.join('\n')}` : 'Ask me, in plain words, to paste my notes or the call transcript.'}`
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
        description: 'Inspect or update the sales pipeline, conversation plays, qualification criteria, and Mermaid flowcharts.',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Inspect and manage our Sales System grounded in \`sales/system.md\`, \`sales/stages/pipeline-stages.md\`, \`sales/plays/\`, and \`sales/qualification/qualification-matrix.md\`. Keep all routing internal: never show file paths, play IDs, Mermaid code or words like gate or HITL to me unless I use them.\n\n1. **Import**: accept anything I hand in: a photo or screenshot of a whiteboard, a PDF, an HTML file (including diagrams exported from Archify, Miro or Lucidchart; read their visible text, labels and arrows), Mermaid text, a document, or a spoken or written description.\n2. **Understand**: extract the steps, decisions and branches. Classify each flow and never default to pipeline-stages.md: the **whole sales process** (deal stages) goes to \`sales/stages/pipeline-stages.md\`; **one conversation** (things said or heard in one call) goes to \`sales/plays/<play-id>.md\` (a conversation used in several stages is one guide with \`stages: 2, 3, 4\`). If the input holds several flows, split them and list them plainly. If unclear, ask: 'Is this your whole sales process, or one conversation (like a call)?'\n3. **Explain back** before drafting: a short numbered list of the steps and the 'if they say X → do Y' branches, plus anything unclear or missing (dead ends, unlabeled arrows, a missing next step). Ask about gaps one question at a time. Never invent steps: mark unknowns and ask. A new or imported call guide must define success and its type(s) of sale: if the input does not say, ask plainly 'What counts as a good result for this call?' and 'Which type(s) of sale is it for?'. Never invent the success or the type of sale.\n4. **Draft** in a temporary file outside the saved guides, following the play contract for call guides (frontmatter \`play, stages, goal, success, motions, gate_unlocked, version, status\`; Decision Tree; Branches; Learnings Log). Use only the Mermaid subset the page can draw: \`flowchart TD\` (call guides) or \`flowchart LR\` (whole process); steps \`id[text]\`, \`id(text)\`, \`id([text])\`, \`id{question?}\`, \`id((text))\`, quoted labels \`id["text"]\`; arrows \`A --> B\`, \`A -->|label| B\` or \`A -- label --> B\`; no styling (no \`classDef\`, \`class\`, \`style\`, \`linkStyle\`, \`click\`, no subgraph styling).\n5. **Preview**: run \`clc-brain view --draft <draft-file> --open\` in the brain folder. If it exits with 1, the diagram can't be drawn: fix the draft and preview again before showing it. Then tell me: 'This is how it would look. Nothing is saved yet.' If you cannot run commands, describe the result in plain words.\n6. **Human-in-the-Loop (HITL) review checkpoint**: ask one yes/no question ('Save it like this?' / '¿Lo guardo así?'). On changes, update the draft and preview again until I say yes or cancel.\n7. **Save**: new guide → save it and add it to \`sales/system.md\`; existing guide → bump \`version\` and add a Learnings Log entry; whole process → update \`sales/stages/pipeline-stages.md\`. Check the qualification criteria of \`sales/qualification/qualification-matrix.md\` and the exit gates when relevant, in the words of the team's sales method.\n8. After saving, refresh the sales system page by running \`clc-brain view\` in the brain folder, tell me in plain words that my sales page is up to date, and offer to open it (\`clc-brain view --open\`).\n\nLater updates follow the same loop: understand the change → explain back → draft → preview → approval → save.\n\n${stage ? `### Requested Stage / Focus\n${stage}` : 'Ask me in plain words: "Do you want to see how your sales process works, improve a call guide, or turn a drawing or photo of your process into a guide?"'}`
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
              text: `Execute the Monthly RevOps Retrospective grounded in \`skills/skill_monthly_retrospective.md\`:\n\n1. Get the numbers by running \`clc-brain stats --month ${month || '<YYYY-MM>'} --json\` for the last complete month (or the month I name). Never count by hand; if the command cannot run, say plainly that the numbers are approximate. Report by type of sale and per person too, and propose classifying calls still "Not classified yet" (a short plain list; write only after a yes).\n2. For the details behind the numbers, read call logs in \`sales/calls/${month || 'YYYY-MM'}/\` and post-mortems in \`sales/win-loss/\`; analyze rep performance metrics, recurring objection frequency, competitor encounter rates, and pipeline stage friction bottlenecks.\n3. Recommend concrete updates to \`sales/objections/\`, \`sales/battlecards/\`, and \`sales/scripts/\` for human-in-the-loop approval.\n4. Report format: start with "This month in 3 points" (plain words), then "Changes I suggest" as numbered yes/no questions in plain words (for example: "In the cold call, most people drop when we ask about budget. Want me to change that question to ...?"). Put tables, funnel and per-rep details in an optional appendix shown only if I ask; no Mermaid, Archify links, IDs or file paths in the main part.\n5. Play performance & proposed play edits: per play/branch counts and drop-off, an Unattributed bucket for logs without \`play\` (read legacy and canonical keys). Apply a play edit only after explicit approval from whoever runs the retro, then append a Learnings Log entry and bump the play's \`version\`.\n\n${month ? `### Target Month\n${month}` : 'Run the retrospective for the most recent month in `sales/calls/` or ask me which `YYYY-MM` partition to analyze.'}`
            }
          }
        ]
      };
    }

    default:
      return null;
  }
}
