#!/usr/bin/env node

import {consola} from 'consola';
import {runCLI} from './cli.js';

async function main() {
  try {
    await runCLI(process.argv.slice(2));
  } catch (error) {
    consola.error(error);
    process.exit(1);
  }
}

void main();
