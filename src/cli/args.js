// Minimal argv parser: positional args plus known valued (and repeatable) flags; other dashes become booleans.
const VALUED_FLAGS = Object.freeze(['name', 'industry', 'tagline', 'areas', 'preset', 'custom', 'month']);
// Valued flags that may repeat; their values are collected into an array.
const REPEATABLE_FLAGS = Object.freeze(['draft']);

export function parseArgs(rawArgs) {
  const args = [];
  const options = {};
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    const flag = arg.replace(/^-+/, '');
    if (arg === '--yes' || arg === '-y') {
      options.yes = true;
    } else if (arg.startsWith('--') && REPEATABLE_FLAGS.includes(flag) && i + 1 < rawArgs.length) {
      options[flag] = [...(Array.isArray(options[flag]) ? options[flag] : []), rawArgs[++i]];
    } else if (arg.startsWith('--') && VALUED_FLAGS.includes(flag) && i + 1 < rawArgs.length) {
      options[flag] = rawArgs[++i];
    } else if (arg.startsWith('-')) {
      options[flag] = true;
    } else {
      args.push(arg);
    }
  }
  return { args, options };
}
