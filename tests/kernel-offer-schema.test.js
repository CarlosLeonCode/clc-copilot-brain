// org-kernel.json: optional positioning, target segments, offer and weekly review, validated when present.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateAgainstSchema } from '../src/core/schema-validator.js';

// Real brains on the maintainer's machine (read-only). Skipped where they do not exist.
const REAL_BRAINS = [
  ['Kinoia', path.join(os.homedir(), 'Dev', 'kino', 'workspace', 'brain', 'org-kernel.json')],
  ['Laila', path.join(os.homedir(), 'Dev', 'laila-workspace', 'brain', 'org-kernel.json')]
];

const base = () => ({
  version: '1.0.0',
  organization: { name: 'Org', industry: 'Software', tagline: 'Tag' },
  activeAreas: ['sales'],
  governance: { owner: 'Owner', reviewCadenceDays: 30 }
});

const withOrg = (org) => ({ ...base(), organization: { ...base().organization, ...org } });
const errorsOf = (kernel) => validateAgainstSchema('org-kernel', kernel).errors;

const OFFER = {
  businessModel: 'Monthly subscription (USD).',
  excludedCosts: 'Messaging fees are billed apart.',
  plans: [
    { name: 'Starter', priceUsdMonthly: 45, messagesPerMonth: 1000, channels: '1 (web)' },
    { name: 'Scale', priceUsdMonthly: 99.5, recommended: true, limits: { seats: 6 } },
    { name: 'Custom', priceUsdMonthly: 0, limits: 'Ask sales' }
  ],
  pricesVerifiedAt: '2026-10-21'
};

for (const [name, file] of REAL_BRAINS) {
  test(`the real ${name} brain kernel validates as it is`, { skip: !fs.existsSync(file) && 'brain not on this machine' }, () => {
    assert.deepEqual(errorsOf(JSON.parse(fs.readFileSync(file, 'utf8'))), []);
  });
}

test('positioning, target segments, offer and weekly review are optional and accepted in their documented shapes', () => {
  assert.deepEqual(errorsOf(base()), []);
  const kernel = withOrg({ positioning: 'The simplest way for small businesses.', targetSegments: ['Retail', { name: 'Hotels', notes: 'Small chains' }], offer: OFFER });
  kernel.governance.weeklyReview = 'Weekly review of calls and objections.';
  assert.deepEqual(errorsOf(kernel), []);
  assert.deepEqual(errorsOf(withOrg({ offer: { ...OFFER, pricesVerifiedAt: '2026-10-21T21:24:50Z' } })), [], 'date-time is accepted');
  assert.deepEqual(errorsOf(withOrg({ offer: { plans: [{ name: 'Only', priceUsdMonthly: 10 }] } })), [], 'only plans');
});

test('invalid shapes are rejected with the field named', () => {
  const cases = [
    [withOrg({ positioning: 3 }), /positioning/],
    [withOrg({ positioning: '' }), /positioning/],
    [withOrg({ targetSegments: 'Retail' }), /targetSegments/],
    [withOrg({ targetSegments: [1] }), /targetSegments/],
    [withOrg({ targetSegments: [{ notes: 'no name' }] }), /targetSegments/],
    [withOrg({ offer: 'cheap' }), /offer/],
    [withOrg({ offer: { ...OFFER, plans: {} } }), /plans/],
    [withOrg({ offer: { ...OFFER, plans: [{ priceUsdMonthly: 45 }] } }), /plans/],
    [withOrg({ offer: { ...OFFER, plans: [{ name: 'A', priceUsdMonthly: '45' }] } }), /priceUsdMonthly/],
    [withOrg({ offer: { ...OFFER, plans: [{ name: 'A', priceUsdMonthly: -1 }] } }), /priceUsdMonthly/],
    [withOrg({ offer: { ...OFFER, plans: [{ name: 'A', priceUsdMonthly: 1, limits: 5 }] } }), /limits/],
    [withOrg({ offer: { ...OFFER, pricesVerifiedAt: 'yesterday' } }), /pricesVerifiedAt/],
    [withOrg({ offer: { ...OFFER, businessModel: 7 } }), /businessModel/],
    [withOrg({ offer: { ...OFFER, excludedCosts: false } }), /excludedCosts/]
  ];
  for (const [kernel, field] of cases) {
    const errors = errorsOf(kernel);
    assert.ok(errors.length > 0, `expected an error for ${field}`);
    assert.match(errors.join(' '), field);
  }
  const weekly = base();
  weekly.governance.weeklyReview = 7;
  assert.match(errorsOf(weekly).join(' '), /weeklyReview/);
  weekly.governance.weeklyReview = '';
  assert.match(errorsOf(weekly).join(' '), /weeklyReview/);
});
