// `stats`: show how sales are going, as plain text for people or full JSON for the AI.
import fs from 'node:fs';
import path from 'node:path';
import { messageLanguage } from '../../core/brain-language.js';
import { BrainError } from '../../core/errors.js';
import { t } from '../../core/i18n.js';
import { loadSalesReport } from '../../core/sales-records.js';
import { formatSalesReport } from '../../core/sales-report-text.js';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function runStats(targetDir, options) {
  if (options.month !== undefined && !(typeof options.month === 'string' && MONTH_PATTERN.test(options.month))) {
    throw new BrainError('VALIDATION', 'The month must look like YYYY-MM, for example: clc-brain stats --month 2026-09');
  }
  if (!fs.existsSync(path.join(targetDir, 'org-kernel.json'))) {
    throw new BrainError('NOT_A_BRAIN', t(messageLanguage(targetDir, process.env), 'cli.notBrain', { dir: targetDir }));
  }
  if (!fs.existsSync(path.join(targetDir, 'sales'))) {
    throw new BrainError('NO_SALES_AREA', 'This brain has no sales area yet. Add it with "clc-brain add-area --preset sales".');
  }
  const report = loadSalesReport(targetDir, { month: options.month });
  console.log(options.json ? JSON.stringify(report, null, 2) : formatSalesReport(report).trimEnd());
  return 0;
}
