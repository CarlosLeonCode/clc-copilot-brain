import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const PKG_DIR = path.resolve('.');

test('Sales Intelligence Suite: Revenue Enablement & Closed-Loop Assets', async (t) => {
  await t.test('skill_call_analyzer.md exists and contains rep assignment, coaching, and objections', () => {
    const locations = [
      path.join(PKG_DIR, 'skills', 'skill_call_analyzer.md'),
      path.join(PKG_DIR, 'templates', 'areas', 'sales', 'skills', 'skill_call_analyzer.md')
    ];

    for (const skillPath of locations) {
      assert.ok(fs.existsSync(skillPath), `${skillPath} must exist`);
      const content = fs.readFileSync(skillPath, 'utf8');

      // Rep assignments
      assert.match(content, /Carlos/, 'Must include rep Carlos');
      assert.match(content, /Juanita/, 'Must include rep Juanita');
      assert.match(content, /Pepito/, 'Must include rep Pepito');

      // Coaching feedback
      assert.match(content, /Coaching Feedback/i, 'Must have coaching feedback instructions');
      assert.match(content, /Objective Coaching Feedback/i, 'Must evaluate rep performance objectively');

      // Objection mapping
      assert.match(content, /Detected Objections/i, 'Must have objection detection');
      assert.match(content, /objection ID/i, 'Must map to repository objection IDs');
    }
  });

  await t.test('skill_monthly_retrospective.md contains month-end aggregation and closed-loop updates', () => {
    const locations = [
      path.join(PKG_DIR, 'skills', 'skill_monthly_retrospective.md'),
      path.join(PKG_DIR, 'templates', 'areas', 'sales', 'skills', 'skill_monthly_retrospective.md')
    ];

    for (const skillPath of locations) {
      assert.ok(fs.existsSync(skillPath), `${skillPath} must exist`);
      const content = fs.readFileSync(skillPath, 'utf8');

      // Month-end aggregation
      assert.match(content, /monthly retrospective/i, 'Must specify monthly retrospective analysis');
      assert.match(content, /sales\/calls/i, 'Must aggregate historical call logs');
      assert.match(content, /sales\/win-loss/i, 'Must aggregate deal post-mortems');

      // Closed-loop repository updates
      assert.match(content, /closed-loop/i, 'Must enforce closed-loop mechanism');
      assert.match(content, /battlecard/i, 'Must update battlecards from win/loss insights');
      assert.match(content, /objection/i, 'Must update objection handling matrices');
    }
  });

  await t.test('calls/ folder has README.md and structured sample call analysis', () => {
    const callsDir = path.join(PKG_DIR, 'templates', 'areas', 'sales', 'calls');
    const readmePath = path.join(callsDir, 'README.md');
    assert.ok(fs.existsSync(readmePath), 'sales/calls/README.md must exist');

    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    assert.match(readmeContent, /Storage Hierarchy & Naming Convention/i);
    assert.match(readmeContent, /YYYY-MM-DD_<rep>_<prospect-slug>\.md/i);

    // Verify sample call analysis
    const sampleCallPath = path.join(callsDir, '2026-09', '2026-09-15_carlos_acme-corp.md');
    assert.ok(fs.existsSync(sampleCallPath), 'Sample call analysis file must exist');

    const callContent = fs.readFileSync(sampleCallPath, 'utf8');
    assert.match(callContent, /call_id:\s*"CALL-2026-09-15-01"/);
    assert.match(callContent, /rep:\s*"Carlos"/);
    assert.match(callContent, /detected_objections:/);
    assert.match(callContent, /pricing-too-high/);
    assert.match(callContent, /competitor-alpha/);
  });

  await t.test('win-loss/ contains template, closed-won fintech, and closed-lost legacy examples', () => {
    const winLossDir = path.join(PKG_DIR, 'templates', 'areas', 'sales', 'win-loss');
    assert.ok(fs.existsSync(path.join(winLossDir, 'README.md')), 'win-loss README.md must exist');

    const templatePath = path.join(winLossDir, 'post-mortem-template.md');
    assert.ok(fs.existsSync(templatePath), 'post-mortem-template.md must exist');
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    assert.match(templateContent, /Deal Post-Mortem Template/i);
    assert.match(templateContent, /CLOSED WON.*CLOSED LOST/i);

    const closedWonPath = path.join(winLossDir, 'sample-closed-won-fintech.md');
    assert.ok(fs.existsSync(closedWonPath), 'sample-closed-won-fintech.md must exist');
    const wonContent = fs.readFileSync(closedWonPath, 'utf8');
    assert.match(wonContent, /CLOSED WON/i);
    assert.match(wonContent, /FinTech/i);
    assert.match(wonContent, /Core Decision Driver/i);
    assert.match(wonContent, /Where Our Positioning Won/i);

    const closedLostPath = path.join(winLossDir, 'sample-closed-lost-legacy.md');
    assert.ok(fs.existsSync(closedLostPath), 'sample-closed-lost-legacy.md must exist');
    const lostContent = fs.readFileSync(closedLostPath, 'utf8');
    assert.match(lostContent, /CLOSED LOST/i);
    assert.match(lostContent, /LegacyDocs/i);
    assert.match(lostContent, /Core Decision Driver/i);
    assert.match(lostContent, /What We Must Change/i);
  });

  await t.test('qualification/qualification-matrix.md specifies MEDDPICC and disqualification triggers', () => {
    const qualPath = path.join(PKG_DIR, 'templates', 'areas', 'sales', 'qualification', 'qualification-matrix.md');
    assert.ok(fs.existsSync(qualPath), 'qualification-matrix.md must exist');

    const qualContent = fs.readFileSync(qualPath, 'utf8');
    assert.match(qualContent, /MEDDPICC/i);
    assert.match(qualContent, /M — Metrics/i);
    assert.match(qualContent, /E — Economic Buyer/i);
    assert.match(qualContent, /D — Decision Criteria/i);
    assert.match(qualContent, /D — Decision Process/i);
    assert.match(qualContent, /I — Identified Pain/i);
    assert.match(qualContent, /C — Champion/i);
    assert.match(qualContent, /Disqualify-Fast Triggers/i);
  });

  await t.test('stages/pipeline-stages.md specifies canonical stages 1-5 and gate criteria', () => {
    const stagesPath = path.join(PKG_DIR, 'templates', 'areas', 'sales', 'stages', 'pipeline-stages.md');
    assert.ok(fs.existsSync(stagesPath), 'pipeline-stages.md must exist');

    const stagesContent = fs.readFileSync(stagesPath, 'utf8');
    assert.match(stagesContent, /Stage 1/i);
    assert.match(stagesContent, /Stage 2/i);
    assert.match(stagesContent, /Stage 3/i);
    assert.match(stagesContent, /Stage 4/i);
    assert.match(stagesContent, /Stage 5/i);
    assert.match(stagesContent, /Gate Exit Criteria/i);
  });

  await t.test('ecosystemTools in org-kernel.json declares Archify for sales flows', () => {
    const rootKernel = JSON.parse(fs.readFileSync(path.join(PKG_DIR, 'org-kernel.json'), 'utf8'));
    assert.ok(rootKernel.ecosystemTools, 'root org-kernel.json must have ecosystemTools');
    assert.strictEqual(rootKernel.ecosystemTools.salesFlowDiagrams.tool, 'Archify');
    assert.strictEqual(rootKernel.ecosystemTools.salesFlowDiagrams.repository, 'https://github.com/tt-a1i/archify');
    assert.ok(rootKernel.ecosystemTools.salesFlowDiagrams.purpose.length > 10);

    const templateKernel = JSON.parse(
      fs.readFileSync(path.join(PKG_DIR, 'templates', 'base', 'org-kernel.json'), 'utf8')
        .replaceAll('{{ACTIVE_AREAS_JSON}}', '[]')
    );
    assert.ok(templateKernel.ecosystemTools, 'template org-kernel.json must have ecosystemTools');
    assert.strictEqual(templateKernel.ecosystemTools.salesFlowDiagrams.tool, 'Archify');
  });
});

test('Sales plays loop: call attribution and retro play performance', async (t) => {
  const { getPrompt } = await import('../src/mcp/prompts.js');
  const read = (...p) => fs.readFileSync(path.join(PKG_DIR, ...p), 'utf8');
  const skillCopies = (name) => [
    read('skills', name),
    read('templates', 'base', 'skills', name),
    read('templates', 'areas', 'sales', 'skills', name),
  ];
  const cmdCopies = (name) => [
    read('.claude', 'commands', name),
    read('templates', 'base', '.claude', 'commands', name),
  ];

  await t.test('call analyzer records play, branch, gate_advanced with canonical keys', () => {
    for (const c of skillCopies('skill_call_analyzer.md')) {
      assert.match(c, /^play: /m);
      assert.match(c, /^branch: /m);
      assert.match(c, /^gate_advanced: /m);
      assert.match(c, /sales\/plays\//);
      assert.match(c, /HITL/i);
    }
    for (const c of cmdCopies('call.md')) assert.match(c, /play/i), assert.match(c, /gate_advanced/);
    assert.match(getPrompt('call').messages[0].content.text, /gate_advanced/);
  });

  await t.test('no managed sales skill uses {{COMPANY_NAME}} for the prospect', () => {
    for (const name of ['skill_call_analyzer.md', 'skill_monthly_retrospective.md', 'skill_sales_copilot.md']) {
      const copies = [read('skills', name), read('templates', 'base', 'skills', name)];
      const salesCopy = path.join(PKG_DIR, 'templates', 'areas', 'sales', 'skills', name);
      if (fs.existsSync(salesCopy)) copies.push(fs.readFileSync(salesCopy, 'utf8'));
      for (const c of copies) {
        assert.doesNotMatch(c, /\{\{COMPANY_NAME\}\}/, `${name} must not use {{COMPANY_NAME}}`);
      }
    }
    assert.match(read('skills', 'skill_call_analyzer.md'), /prospect_company: "\{\{PROSPECT_COMPANY\}\}"/);
  });

  await t.test('retro covers play performance, unattributed bucket, legacy keys, approval, version bump', () => {
    for (const c of skillCopies('skill_monthly_retrospective.md')) {
      assert.match(c, /Play performance & proposed play edits/);
      assert.match(c, /Unattributed/);
      assert.match(c, /legacy/i);
      assert.match(c, /\bstage\b/);
      assert.match(c, /explicit approval/i);
      assert.match(c, /Learnings Log/);
      assert.match(c, /version/);
      assert.match(c, /HITL/i);
    }
    for (const c of cmdCopies('retro.md')) assert.match(c, /Play performance/);
    assert.match(getPrompt('retro').messages[0].content.text, /Play performance & proposed play edits/);
  });

  await t.test('demo call log carries play, branch, gate_advanced', () => {
    const c = read('templates', 'areas', 'sales', 'calls', '2026-09', '2026-09-15_carlos_acme-corp.md');
    assert.match(c, /^play: "discovery-call"/m);
    assert.match(c, /^branch: "B\d+"/m);
    assert.match(c, /^gate_advanced: (true|false)$/m);
  });
});

