#!/usr/bin/env node
// Thin entrypoint: all behavior lives in src/cli (adapter) and src/core (domain).
import { runCli } from '../src/cli/main.js';

runCli();
