// Shared CLI rendering helpers.
import * as p from '@clack/prompts';
import pc from 'picocolors';

/** Tell the user about adapter files that were backed up or left untouched. */
export function reportAdapterBackups(adapterResults) {
  const lines = adapterResults
    .filter((r) => r.status === 'backed_up' || r.status === 'skipped')
    .map((r) => (r.status === 'backed_up'
      ? `${pc.cyan(r.adapter)} existed as a regular file; moved to ${pc.cyan(r.backup)} and linked to AGENTS.md`
      : `${pc.cyan(r.adapter)} left untouched: ${r.reason}`));
  if (lines.length > 0) p.note(lines.join('\n'), 'Existing Adapter Files');
}
