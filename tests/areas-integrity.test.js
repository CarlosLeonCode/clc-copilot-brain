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
