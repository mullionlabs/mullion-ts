import {defineCommand, runMain} from 'citty';
import {consola} from 'consola';
import {stdin, stdout} from 'node:process';
import {generateProject} from './generator.js';
import type {
  Framework,
  GenerateOptions,
  PackageManagerName,
  Scenario,
  Ui,
} from './generator.js';

const VALID_FRAMEWORKS: Framework[] = ['nuxt', 'next'];
const VALID_SCENARIOS: Scenario[] = ['rag', 'helpdesk'];
const VALID_UI: Ui[] = ['minimal', 'shadcn'];
const VALID_PM: PackageManagerName[] = ['pnpm', 'npm', 'yarn', 'bun'];

const DEFAULT_PROJECT_NAME = 'mullion-app';
const DEFAULT_FRAMEWORK: Framework = 'nuxt';
const DEFAULT_SCENARIO: Scenario = 'rag';
const DEFAULT_UI: Ui = 'minimal';

function isInteractive(): boolean {
  return Boolean(stdin.isTTY && stdout.isTTY);
}

function normalizeProjectName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_PROJECT_NAME;
  }
  return trimmed;
}

function assertOneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  label: string,
): asserts value is T {
  if (!allowed.includes(value as T)) {
    throw new Error(
      `Invalid ${label}: "${value}". Allowed: ${allowed.join(', ')}`,
    );
  }
}

async function promptValue(
  message: string,
  defaultValue: string,
): Promise<string> {
  const result = await consola.prompt(message, {
    type: 'text',
    default: defaultValue,
  });

  if (typeof result === 'symbol') {
    return defaultValue;
  }

  return result.trim() || defaultValue;
}

async function promptSelect<T extends string>(
  message: string,
  options: readonly T[],
  initial?: T,
): Promise<T> {
  const result = await consola.prompt(message, {
    type: 'select',
    options: options.map((opt) => ({
      label: opt,
      value: opt,
    })),
    initial: initial ?? options[0],
  });

  if (typeof result === 'symbol') {
    throw new Error('Prompt was cancelled');
  }

  return result as T;
}

async function promptConfirmPrompt(
  message: string,
  initial = false,
): Promise<boolean> {
  const result = await consola.prompt(message, {
    type: 'confirm',
    initial,
  });

  if (typeof result === 'symbol') {
    return initial;
  }

  return result;
}

async function promptConfirm(): Promise<boolean> {
  return promptConfirmPrompt('Proceed?', false);
}

async function resolveOptions(rawArgs: {
  projectName?: string;
  framework?: string;
  scenario?: string;
  ui?: string;
  pm?: string;
  install: boolean;
  git: boolean;
  yes: boolean;
}): Promise<GenerateOptions> {
  const interactive = isInteractive();

  const framework = rawArgs.framework ?? DEFAULT_FRAMEWORK;
  assertOneOf(framework, VALID_FRAMEWORKS, 'framework');

  let projectName = rawArgs.projectName;
  if (!projectName) {
    if (rawArgs.yes) {
      projectName = DEFAULT_PROJECT_NAME;
    } else if (interactive) {
      projectName = await promptValue('Project name', DEFAULT_PROJECT_NAME);
    } else {
      throw new Error(
        'Project name is required in non-interactive mode. Provide a name as the first argument.',
      );
    }
  }
  projectName = normalizeProjectName(projectName);

  let scenario = rawArgs.scenario;
  if (!scenario) {
    if (rawArgs.yes) {
      scenario = DEFAULT_SCENARIO;
    } else if (interactive) {
      scenario = await promptSelect(
        'Choose scenario',
        VALID_SCENARIOS,
        DEFAULT_SCENARIO,
      );
    } else {
      throw new Error(
        `Scenario is required in non-interactive mode. Use --scenario ${VALID_SCENARIOS.join('|')}.`,
      );
    }
  }
  assertOneOf(scenario, VALID_SCENARIOS, 'scenario');

  let ui = rawArgs.ui;
  if (!ui) {
    if (rawArgs.yes) {
      ui = DEFAULT_UI;
    } else if (interactive) {
      ui = await promptSelect('Choose UI style', VALID_UI, DEFAULT_UI);
    } else {
      throw new Error(
        `UI is required in non-interactive mode. Use --ui ${VALID_UI.join('|')}.`,
      );
    }
  }
  assertOneOf(ui, VALID_UI, 'ui');

  let install = rawArgs.install;
  if (interactive && !rawArgs.yes) {
    install = await promptConfirmPrompt('Install dependencies?', true);
  }

  let packageManager = rawArgs.pm;
  if (!packageManager && interactive && !rawArgs.yes && install) {
    packageManager = await promptSelect(
      'Choose package manager',
      VALID_PM,
      'pnpm',
    );
  }
  if (packageManager) {
    assertOneOf(packageManager, VALID_PM, 'pm');
  }

  let git = rawArgs.git;
  if (interactive && !rawArgs.yes) {
    git = await promptConfirmPrompt('Initialize git repository?', true);
  }

  return {
    projectName,
    targetDir: projectName,
    framework,
    scenario,
    ui,
    packageManager: packageManager as PackageManagerName | undefined,
    install,
    git,
  };
}

function printSummary(options: GenerateOptions): void {
  consola.log('create-mullion summary:');
  consola.log(`- Project: ${options.projectName}`);
  consola.log(`- Framework: ${options.framework}`);
  consola.log(`- Scenario: ${options.scenario}`);
  consola.log(`- UI: ${options.ui}`);
  consola.log(`- Package manager: ${options.packageManager ?? 'auto'}`);
  consola.log(`- Install deps: ${options.install ? 'yes' : 'no'}`);
  consola.log(`- Git init: ${options.git ? 'yes' : 'no'}`);
}

const command = defineCommand({
  meta: {
    name: 'create-mullion',
    version: '0.0.1',
    description: 'Create Mullion-powered LLM apps',
  },
  args: {
    projectName: {
      type: 'positional',
      description: 'Target project directory',
      required: false,
    },
    framework: {
      type: 'string',
      description: 'Framework to use',
    },
    scenario: {
      type: 'string',
      description: 'Scenario template to use',
    },
    ui: {
      type: 'string',
      description: 'UI template to use',
    },
    pm: {
      type: 'string',
      description: 'Package manager (pnpm, npm, yarn, bun)',
    },
    install: {
      type: 'boolean',
      default: true,
      description: 'Install dependencies',
    },
    git: {
      type: 'boolean',
      default: true,
      description: 'Initialize a git repository',
    },
    yes: {
      type: 'boolean',
      default: false,
      description: 'Skip prompts and accept defaults',
    },
  },
  async run({args}) {
    const options = await resolveOptions({
      projectName: args.projectName as string | undefined,
      framework: args.framework as string | undefined,
      scenario: args.scenario as string | undefined,
      ui: args.ui as string | undefined,
      pm: args.pm as string | undefined,
      install: args.install,
      git: args.git,
      yes: args.yes,
    });

    printSummary(options);

    if (!args.yes) {
      if (!isInteractive()) {
        throw new Error(
          'Confirmation requires an interactive terminal. Use --yes to skip.',
        );
      }
      const proceed = await promptConfirm();
      if (!proceed) {
        consola.info('Canceled.');
        return;
      }
    }

    await generateProject(options);
  },
});

export async function runCLI(rawArgs: string[]): Promise<void> {
  await runMain(command, {rawArgs});
}
