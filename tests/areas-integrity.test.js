import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const PKG_DIR = path.resolve('.');

const ENTERPRISE_AREAS = [
  { id: 'sales', playbook: '01-SALES-PLAYBOOK.md', expectedDirs: ['battlecards', 'objections', 'calls', 'win-loss', 'qualification', 'stages'] },
  { id: 'marketing', playbook: '02-MARKETING-PLAYBOOK.md', expectedDirs: ['brand', 'messaging', 'content', 'distribution'] },
  { id: 'product', playbook: '03-PRODUCT-PLAYBOOK.md', expectedDirs: ['specs', 'roadmap', 'releases'] },
  { id: 'operations', playbook: '04-OPERATIONS-PLAYBOOK.md', expectedDirs: ['sops', 'tools', 'vendors'] },
  { id: 'hr_people', playbook: '05-PEOPLE-PLAYBOOK.md', expectedDirs: ['handbook', 'hiring', 'onboarding'] },
  { id: 'finance_legal', playbook: '06-FINANCE-LEGAL-PLAYBOOK.md', expectedDirs: ['pricing', 'compliance'] }
];

test('Areas Integrity Suite: 6 Enterprise Areas & Framework Playbooks', async (t) => {
  await t.test('All 6 enterprise areas have non-empty templates and READMEs', async (sub) => {
    for (const area of ENTERPRISE_AREAS) {
      await sub.test(`Area template "${area.id}" exists with valid structure`, () => {
        const areaDir = path.join(PKG_DIR, 'templates', 'areas', area.id);
        assert.ok(fs.existsSync(areaDir), `templates/areas/${area.id} must exist`);

        const readmePath = path.join(areaDir, 'README.md');
        assert.ok(fs.existsSync(readmePath), `${area.id}/README.md must exist`);
        const readmeContent = fs.readFileSync(readmePath, 'utf8');
        assert.ok(readmeContent.length > 50, `${area.id}/README.md must not be empty`);

        // Assert all expected subdirectories exist
        for (const subDir of area.expectedDirs) {
          const subDirPath = path.join(areaDir, subDir);
          assert.ok(fs.existsSync(subDirPath), `${area.id}/${subDir} subdirectory must exist`);
        }
      });
    }
  });

  await t.test('Framework overview and all 6 playbooks exist and contain rich guidance', async (sub) => {
    await sub.test('Framework overview 00-FRAMEWORK-OVERVIEW.md exists', () => {
      const overviewPath = path.join(PKG_DIR, 'playbooks', '00-FRAMEWORK-OVERVIEW.md');
      assert.ok(fs.existsSync(overviewPath), '00-FRAMEWORK-OVERVIEW.md must exist');
      const content = fs.readFileSync(overviewPath, 'utf8');
      assert.ok(content.length > 500, 'Framework overview must contain detailed documentation');
      assert.match(content, /Organizational Second Brain/);
      assert.match(content, /Architecture/);
      assert.match(content, /Single Source of Truth/i);
    });

    for (const area of ENTERPRISE_AREAS) {
      await sub.test(`Playbook ${area.playbook} exists and is comprehensive`, () => {
        const playbookPath = path.join(PKG_DIR, 'playbooks', area.playbook);
        assert.ok(fs.existsSync(playbookPath), `${area.playbook} must exist`);
        const content = fs.readFileSync(playbookPath, 'utf8');
        assert.ok(content.length > 500, `${area.playbook} must have non-trivial content (>500 chars)`);
        assert.ok(content.startsWith('# '), `${area.playbook} must start with top-level title`);
        assert.ok((content.match(/^## /gm) || []).length >= 3, `${area.playbook} must contain at least 3 major sections`);
      });
    }
  });

  await t.test('Marketing area is decoupled from AI generators and contains no vendor lock-in', async (sub) => {
    await sub.test('playbooks/02-MARKETING-PLAYBOOK.md mandates AI decoupling', () => {
      const playbookContent = fs.readFileSync(path.join(PKG_DIR, 'playbooks', '02-MARKETING-PLAYBOOK.md'), 'utf8');

      // Check explicit decoupling principles
      assert.match(playbookContent, /Decoupling from AI Generators/i);
      assert.match(playbookContent, /No Vendor Lock-In/i);
      assert.match(playbookContent, /The Brain Dictates Voice, Not the LLM/i);
      assert.match(playbookContent, /Deterministic Output Constraints/i);
      assert.match(playbookContent, /Format Portability/i);
    });

    await sub.test('templates/areas/marketing/README.md declares open, decoupled architecture', () => {
      const readmeContent = fs.readFileSync(path.join(PKG_DIR, 'templates', 'areas', 'marketing', 'README.md'), 'utf8');
      assert.match(readmeContent, /decoupled/i);
      assert.match(readmeContent, /without vendor lock-in/i);
    });

    await sub.test('marketing templates use open standard markdown without proprietary tool headers', () => {
      const marketingDir = path.join(PKG_DIR, 'templates', 'areas', 'marketing');
      const checkRecursive = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            checkRecursive(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Ensure no hardcoded proprietary tool locks like "You must run this in Notion AI"
            assert.doesNotMatch(content, /Proprietary Lock-in/i);
            assert.doesNotMatch(content, /Cannot be used outside/i);
          }
        }
      };
      checkRecursive(marketingDir);
    });
  });
});

// --- Sales system: system map + starter plays (slice 1a) ---
const SALES_DIR = path.join(PKG_DIR, 'templates', 'areas', 'sales');
const PLAYS_DIR = path.join(SALES_DIR, 'plays');
const PLAY_KEYS = ['play', 'stages', 'goal', 'gate_unlocked', 'version', 'status'];
const listPlays = () => (fs.existsSync(PLAYS_DIR) ? fs.readdirSync(PLAYS_DIR).filter((f) => f.endsWith('.md')).sort() : []);
const frontmatterOf = (text) => {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return Object.fromEntries(
    m[1].split('\n').map((l) => l.match(/^([a-z_]+):\s*(.*?)\s*(#.*)?$/)).filter(Boolean).map((x) => [x[1], x[2]])
  );
};

test('sales template ships system.md referencing every play in plays/ (S1.1)', () => {
  const systemPath = path.join(SALES_DIR, 'system.md');
  assert.ok(fs.existsSync(systemPath), 'templates/areas/sales/system.md must exist');
  const plays = listPlays();
  assert.ok(plays.length >= 2, 'at least cold-call and discovery-call must ship');
  assert.ok(plays.includes('cold-call.md') && plays.includes('discovery-call.md'));
  const system = fs.readFileSync(systemPath, 'utf8');
  for (const file of plays) {
    assert.ok(system.includes(`plays/${file}`), `system.md must link plays/${file}`);
  }
});

test('play frontmatter has keys play,stages,goal,gate_unlocked,version,status by regex (R3, S3.2)', () => {
  for (const file of listPlays()) {
    const fm = frontmatterOf(fs.readFileSync(path.join(PLAYS_DIR, file), 'utf8'));
    assert.ok(fm, `${file} needs frontmatter`);
    for (const key of PLAY_KEYS) assert.ok(key in fm && fm[key] !== '', `${file} missing ${key}`);
    assert.equal(fm.play, file.replace(/\.md$/, ''));
    assert.match(fm.stages, /^\d+(\s*,\s*\d+)*$/);
    assert.match(fm.version, /^\d+$/);
    assert.match(fm.status, /^(active|draft|retired)$/);
  }
  const cold = frontmatterOf(fs.readFileSync(path.join(PLAYS_DIR, 'cold-call.md'), 'utf8'));
  assert.equal(cold.stages.split(',').length, 1);
});

test('plays have mermaid block, learnings section; Guion links are optional but must exist when present (S4.1)', () => {
  for (const file of listPlays()) {
    const text = fs.readFileSync(path.join(PLAYS_DIR, file), 'utf8');
    assert.match(text, /```mermaid\n[\s\S]*?```/, `${file} needs a mermaid tree`);
    assert.match(text, /^## Learnings Log/m, `${file} needs a Learnings Log`);
    // The brain ships no script content: the cell is empty ("-", an em dash or nothing) until a script is saved.
    const links = [...text.matchAll(/\]\((\.\.\/scripts\/[^)#]+)\)/g)].map((m) => m[1]);
    for (const link of links) {
      assert.ok(fs.existsSync(path.join(PLAYS_DIR, link)), `${file} links missing ${link}`);
    }
    const rows = text.split('\n').filter((l) => /^\| B\d+ \|/.test(l));
    assert.ok(rows.length > 0, `${file} needs branch rows`);
    for (const row of rows) {
      const last = row.split('|').slice(-2, -1)[0].trim();
      assert.match(last, /^(—|-|)$|^\[[^\]]+\]\(\.\.\/scripts\/[^)]+\)$/, `${file}: bad Guion cell in ${row.slice(0, 40)}`);
    }
  }
});

test('/flow (command, base mirror, MCP prompt) routes by destination, never defaulting to stages (S6.1-6.3, S7.1)', async () => {
  const rootCmd = fs.readFileSync(path.join(PKG_DIR, '.agents', 'skills', 'flow', 'SKILL.md'), 'utf8');
  const baseCmd = fs.readFileSync(path.join(PKG_DIR, 'templates', 'base', '.agents', 'skills', 'flow', 'SKILL.md'), 'utf8');
  assert.equal(rootCmd, baseCmd, 'flow.md root and base must be byte-identical');
  const { getPrompt } = await import('../src/mcp/prompts.js').then((m) => ({ getPrompt: m.getPrompt }));
  const promptText = JSON.stringify(getPrompt ? getPrompt('flow', {}) : '');
  for (const [label, text] of [['command', rootCmd], ['prompt', promptText]]) {
    assert.ok(text.includes('sales/plays/'), `${label} must name sales/plays/`);
    assert.ok(text.includes('pipeline-stages.md'), `${label} must name pipeline-stages.md`);
    assert.ok(!text.includes('sales/flows/'), `${label} must not mention sales/flows/`);
    assert.match(text, /HITL|Human-in-the-Loop/i);
  }
});

// --- Sales system: remaining plays + docs (slice 1b) ---
const SHIPPED_PLAYS = ['cold-call', 'demo-call', 'discovery-call', 'follow-up'];

test('exactly the 4 starter plays ship and system.md links all of them (S2.1)', () => {
  assert.deepEqual(listPlays(), SHIPPED_PLAYS.map((p) => `${p}.md`));
  const system = fs.readFileSync(path.join(SALES_DIR, 'system.md'), 'utf8');
  for (const p of SHIPPED_PLAYS) assert.ok(system.includes(`./plays/${p}.md`), `system.md must link ${p}`);
});

test('system.md has a row for every pipeline stage 1-5 (R1)', () => {
  const system = fs.readFileSync(path.join(SALES_DIR, 'system.md'), 'utf8');
  for (let n = 1; n <= 5; n++) {
    assert.match(system, new RegExp(`^\\| ${n}\\. `, 'm'), `system.md needs a row for stage ${n}`);
  }
});

test('stage names agree across the pipeline diagram, system.md and the sales playbook', () => {
  const system = fs.readFileSync(path.join(SALES_DIR, 'system.md'), 'utf8');
  const pipeline = fs.readFileSync(path.join(SALES_DIR, 'stages', 'pipeline-stages.md'), 'utf8');
  const playbook = fs.readFileSync(path.join(PKG_DIR, 'playbooks', '01-SALES-PLAYBOOK.md'), 'utf8');
  const listed = [...system.matchAll(/^(\d)\. \*\*([^*]+)\*\*/gm)].map((m) => m[2]);
  const rows = [...system.matchAll(/^\| (\d)\. ([^|]+?) \|/gm)].map((m) => m[2]);
  const diagram = /```mermaid\r?\n([\s\S]*?)```/.exec(pipeline)[1];
  const drawn = [...diagram.matchAll(/"(\d)\. ([^<"]+)</g)].map((m) => m[2].trim());
  assert.deepEqual(listed, ['Discovery', 'Validation', 'Proposal', 'Negotiation', 'Closed']);
  assert.deepEqual(rows, listed, 'AI stage table matches the plain list');
  assert.deepEqual(drawn, listed, 'pipeline diagram matches the plain list');
  for (const [i, name] of listed.entries()) {
    assert.match(pipeline, new RegExp(`### Stage ${i + 1}: ${name}`), `pipeline section for stage ${i + 1}`);
    assert.match(playbook, new RegExp(`Stage ${i + 1} \\(${name}\\)`), `playbook names stage ${i + 1}`);
  }
});

test('the template pipeline is written in plain, industry-neutral words', () => {
  const pipeline = fs.readFileSync(path.join(SALES_DIR, 'stages', 'pipeline-stages.md'), 'utf8');
  const diagram = /```mermaid\r?\n([\s\S]*?)```/.exec(pipeline)[1];
  assert.doesNotMatch(diagram, /Gate \d|Passed|•/, 'diagram labels stay short and plain');
  for (const term of [/engineering/i, /Technical Architecture/i, /InfoSec/i, /SOC2/i, /Git-native/i, /CLI/, /IDE/, /DocuSign/i, /\bARR\b/, /\bMSA\b/, /Business Case/]) {
    assert.doesNotMatch(pipeline, term);
  }
});

test('follow-up stages yields [2,3,4] (S3.1)', () => {
  const fm = frontmatterOf(fs.readFileSync(path.join(PLAYS_DIR, 'follow-up.md'), 'utf8'));
  assert.deepEqual(fm.stages.split(',').map((s) => Number(s.trim())), [2, 3, 4]);
});

test('no sales/flows/ reference in docs or prompts (S5.1)', () => {
  const files = [
    'AGENTS.md', 'TECHNICAL.md', 'README.md', 'src/mcp/prompts.js',
    'templates/base/AGENTS.md', 'templates/areas/sales/README.md', 'playbooks/01-SALES-PLAYBOOK.md',
  ];
  for (const f of files) {
    const text = fs.readFileSync(path.join(PKG_DIR, f), 'utf8');
    assert.ok(!text.includes('sales/flows/'), `${f} must not mention sales/flows/`);
  }
});

test('sales docs and AGENTS lookup rules document plays and system.md', () => {
  const docs = [
    'AGENTS.md', 'templates/base/AGENTS.md', 'templates/areas/sales/README.md', 'playbooks/01-SALES-PLAYBOOK.md',
  ];
  for (const f of docs) {
    const text = fs.readFileSync(path.join(PKG_DIR, f), 'utf8');
    assert.ok(text.includes('plays/'), `${f} must document plays/`);
    assert.ok(text.includes('system.md'), `${f} must document system.md`);
  }
  for (const f of ['AGENTS.md', 'templates/base/AGENTS.md']) {
    const text = fs.readFileSync(path.join(PKG_DIR, f), 'utf8');
    assert.match(text, /plays\/[^\n]*conversation|conversation[^\n]*plays\//i, `${f} must route conversations to plays/`);
  }
});
