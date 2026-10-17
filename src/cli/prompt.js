// @clack/prompts helpers shared by CLI commands.
import * as p from '@clack/prompts';

/** Await a prompt; on Ctrl+C / Esc print `cancelMessage` and exit cleanly (code 0). */
export async function ask(promptPromise, cancelMessage = 'Cancelled.') {
  const value = await promptPromise;
  if (p.isCancel(value)) {
    p.cancel(cancelMessage);
    process.exit(0);
  }
  return value;
}
