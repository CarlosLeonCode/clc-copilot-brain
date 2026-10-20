import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const PKG_DIR = path.resolve('.');

test('IDE Adapters Suite: SSOT AGENTS.md, Multi-IDE Adapters & Skills', async (t) => {
  await t.test('SSOT AGENTS.md exists and is non-empty in root and base templates', () => {
    const targets = [
      path.join(PKG_DIR, 'AGENTS.md'),
      path.join(PKG_DIR, 'templates', 'base', 'AGENTS.md')
    ];

    for (const target of targets) {
      assert.ok(fs.existsSync(target), `${target} must exist`);
      const content = fs.readFileSync(target, 'utf8');
      assert.ok(content.length > 500, `${target} must be substantive (>500 chars)`);
      assert.match(content, /Single Source of Truth/i);
      assert.match(content, /Behavioral Directives/i);
      assert.match(content, /operational areas/i);
    }
  });

  await t.test('Multi-IDE adapters exist and point canonically to AGENTS.md', () => {
    const adapters = ['CLAUDE.md', 'GEMINI.md', '.cursorrules', '.windsurfrules'];

    for (const adapter of adapters) {
      const adapterPath = path.join(PKG_DIR, adapter);
      assert.ok(fs.existsSync(adapterPath), `Adapter ${adapter} must exist in repo root`);

      const lstat = fs.lstatSync(adapterPath);
      if (lstat.isSymbolicLink()) {
        const linkTarget = fs.readlinkSync(adapterPath);
        assert.ok(
          linkTarget === 'AGENTS.md' || linkTarget === path.join(PKG_DIR, 'AGENTS.md'),
          `Symlink ${adapter} points to "${linkTarget}", expected "AGENTS.md"`
        );
      } else {
        const fileContent = fs.readFileSync(adapterPath, 'utf8');
        assert.match(fileContent, /AGENTS\.md/, `Fallback file ${adapter} must reference AGENTS.md`);
      }
    }
  });

  await t.test('.agents/skills/ holds every slash-command skill, identical in root and base templates', () => {
    const expected = [
      'battlecard', 'brain', 'brain-add-area', 'brain-doctor', 'brain-onboarding', 'brain-sales',
      'brain-search', 'call', 'flow', 'objection', 'retro', 'sales-assist', 'sop-auditor'
    ];
    for (const name of expected) {
      const root = path.join(PKG_DIR, '.agents', 'skills', name, 'SKILL.md');
      const base = path.join(PKG_DIR, 'templates', 'base', '.agents', 'skills', name, 'SKILL.md');
      assert.ok(fs.existsSync(base), `Skill ${name} must exist at ${base}`);
      const content = fs.readFileSync(base, 'utf8');
      assert.match(content, new RegExp(`^---\\nname: ${name}\\ndescription: ".{20,}"\\n`), `${name} frontmatter`);
      assert.match(content, /^metadata:\n  opencode\/slash: "true"$/m, `${name} is exposed as an OpenCode slash command`);
      assert.match(content, /\$ARGUMENTS/, `${name} passes the user input`);
      assert.match(content, /If no arguments were given/, `${name} says what to do without input`);
      assert.equal(fs.readFileSync(root, 'utf8'), content, `${name} root and base copies must be identical`);
    }
    assert.equal(fs.existsSync(path.join(PKG_DIR, 'templates', 'base', '.claude')), false, 'templates/base must not ship .claude/');
  });

  await t.test('skills/ contains all 6 root execution skills', () => {
    const expectedRootSkills = [
      'skill_brain_onboarding.md',
      'skill_sales_copilot.md',
      'skill_call_analyzer.md',
      'skill_monthly_retrospective.md',
      'skill_brain_doctor.md',
      'skill_area_scaffolder.md'
    ];

    const dirsToCheck = [
      path.join(PKG_DIR, 'skills'),
      path.join(PKG_DIR, 'templates', 'base', 'skills')
    ];

    for (const dir of dirsToCheck) {
      assert.ok(fs.existsSync(dir), `Directory ${dir} must exist`);
      for (const skill of expectedRootSkills) {
        const skillPath = path.join(dir, skill);
        assert.ok(fs.existsSync(skillPath), `Root skill ${skill} must exist at ${skillPath}`);
        const content = fs.readFileSync(skillPath, 'utf8');
        assert.ok(content.length > 200, `Root skill ${skill} must be substantive (>200 chars)`);
        assert.match(content, /# Skill:/i, `Root skill ${skill} must have header title`);
      }
    }
  });
});
