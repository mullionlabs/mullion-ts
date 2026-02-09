import {copyFile, mkdir, readdir, stat} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'pathe';
import {fileURLToPath} from 'node:url';
import {consola} from 'consola';
import {detectPackageManager, installDependencies} from 'nypm';
import {
  mergePackageJson,
  readJsonFile,
  writePackageJson,
  type PackageJson,
} from './deps-merger.js';
import {
  ensureEnvExample,
  ensureReadme,
  replacePlaceholders,
} from './placeholders.js';

export type Framework = 'nuxt' | 'next';
export type Scenario = 'rag' | 'helpdesk';
export type Ui = 'minimal' | 'shadcn';
export type PackageManagerName = 'pnpm' | 'npm' | 'yarn' | 'bun';

export interface GenerateOptions {
  projectName: string;
  targetDir: string;
  framework: Framework;
  scenario: Scenario;
  ui: Ui;
  packageManager?: PackageManagerName;
  install: boolean;
  git: boolean;
}

const TEMPLATE_MAP: Record<Scenario, string> = {
  rag: '@mullion/template-rag-sensitive-data',
  helpdesk: '@mullion/template-helpdesk',
};

export async function generateProject(options: GenerateOptions): Promise<void> {
  const targetDir = resolve(process.cwd(), options.targetDir);
  await ensureEmptyDir(targetDir);

  const templatesRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'templates',
  );
  const baseDir = join(templatesRoot, options.framework, 'base');
  const scenarioDir = join(
    templatesRoot,
    options.framework,
    'scenarios',
    options.scenario,
  );
  const uiDir = join(templatesRoot, options.framework, 'ui', options.ui);
  const catalogReplacements = await loadCatalogReplacements(templatesRoot);

  await copyOverlay(baseDir, targetDir, 'base template');
  await copyOverlay(scenarioDir, targetDir, 'scenario template');
  await copyOverlay(uiDir, targetDir, 'ui template');

  await copyScenarioCore(options.scenario, targetDir, options.framework);

  const basePackage = await readJsonFile<PackageJson>(
    join(baseDir, 'package.json'),
  );
  const scenarioDeps = await readOverlayDeps(scenarioDir);
  const uiDeps = await readOverlayDeps(uiDir);

  const mergedPackage = mergePackageJson(options.projectName, [
    basePackage,
    scenarioDeps,
    uiDeps,
  ]);
  await writePackageJson(join(targetDir, 'package.json'), mergedPackage);

  await ensureEnvExample(targetDir, options.projectName, options.framework);
  await ensureReadme(targetDir, options.projectName, options.framework);
  await replacePlaceholders(targetDir, {
    '{{PROJECT_NAME}}': options.projectName,
    ...catalogReplacements,
  });

  if (options.git) {
    await tryGitInit(targetDir);
  }

  if (options.install) {
    await tryInstallDependencies(targetDir, options.packageManager);
  }

  printSuccessMessage(options);
}

async function ensureEmptyDir(targetDir: string): Promise<void> {
  try {
    const stats = await stat(targetDir);
    if (!stats.isDirectory()) {
      throw new Error(
        `Target path exists and is not a directory: ${targetDir}`,
      );
    }
    const entries = await readdir(targetDir);
    if (entries.length > 0) {
      throw new Error(`Target directory is not empty: ${targetDir}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    await mkdir(targetDir, {recursive: true});
  }
}

async function copyOverlay(
  sourceDir: string,
  targetDir: string,
  label: string,
): Promise<void> {
  try {
    const stats = await stat(sourceDir);
    if (!stats.isDirectory()) {
      consola.warn(`Skipping ${label}; not a directory: ${sourceDir}`);
      return;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      consola.warn(`Skipping ${label}; missing: ${sourceDir}`);
      return;
    }
    throw error;
  }

  await copyDirRecursive(sourceDir, targetDir);
}

// Files to exclude from copying (used for CLI logic, not in generated project)
const EXCLUDE_FILES = new Set(['deps.json']);

async function copyDirRecursive(
  sourceDir: string,
  targetDir: string,
): Promise<void> {
  await mkdir(targetDir, {recursive: true});
  const entries = await readdir(sourceDir, {withFileTypes: true});
  for (const entry of entries) {
    // Skip excluded files
    if (EXCLUDE_FILES.has(entry.name)) {
      continue;
    }
    const sourcePath = join(sourceDir, entry.name);
    const targetPath = join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(sourcePath, targetPath);
    } else if (entry.isFile()) {
      await copyFile(sourcePath, targetPath);
    }
  }
}

async function readOverlayDeps(dir: string): Promise<PackageJson | undefined> {
  const depsJson = await readJsonFile<PackageJson>(join(dir, 'deps.json'));
  if (depsJson) {
    return depsJson;
  }
  return readJsonFile<PackageJson>(join(dir, 'package.json'));
}

async function loadCatalogReplacements(
  templatesRoot: string,
): Promise<Record<string, string>> {
  const versions = await readJsonFile<Record<string, string>>(
    join(templatesRoot, 'versions.json'),
  );
  if (!versions) {
    return {};
  }
  const replacements: Record<string, string> = {};
  for (const [name, version] of Object.entries(versions)) {
    replacements[`{{CATALOG:${name}}}`] = version;
  }
  return replacements;
}

async function copyScenarioCore(
  scenario: Scenario,
  targetDir: string,
  framework: Framework,
): Promise<void> {
  const packageName = TEMPLATE_MAP[scenario];
  const require = createRequire(import.meta.url);
  let packageRoot: string | undefined;

  const target = resolveScenarioTargetDir(targetDir, framework);
  const targetHasContent = await hasDirectoryEntries(target);
  if (targetHasContent) {
    consola.info(
      `Scenario logic already present in ${target}; skipping ${packageName} copy.`,
    );
    return;
  }

  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`, {
      paths: [process.cwd()],
    });
    packageRoot = dirname(packageJsonPath);
  } catch {
    consola.info(`Template package ${packageName} not found; skipping.`);
    return;
  }

  const candidateDirs = [
    join(packageRoot, 'server', 'mullion'),
    join(packageRoot, 'src'),
  ];
  let sourceDir: string | undefined;

  for (const candidate of candidateDirs) {
    try {
      const stats = await stat(candidate);
      if (stats.isDirectory()) {
        sourceDir = candidate;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!sourceDir) {
    consola.info(`No scenario sources found in ${packageName}; skipping.`);
    return;
  }

  await copyDirRecursive(sourceDir, target);
}

function resolveScenarioTargetDir(
  targetDir: string,
  framework: Framework,
): string {
  if (framework === 'next') {
    return join(targetDir, 'src', 'mullion');
  }
  return join(targetDir, 'server', 'utils', 'mullion');
}

async function hasDirectoryEntries(path: string): Promise<boolean> {
  try {
    const entries = await readdir(path);
    return entries.length > 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function tryGitInit(targetDir: string): Promise<void> {
  try {
    const {spawn} = await import('node:child_process');
    await new Promise<void>((resolvePromise, reject) => {
      const child = spawn('git', ['init'], {
        cwd: targetDir,
        stdio: 'ignore',
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          resolvePromise();
        } else {
          reject(new Error(`git init failed with code ${code}`));
        }
      });
    });
  } catch (error) {
    consola.warn(`Git init failed: ${(error as Error).message}`);
  }
}

async function tryInstallDependencies(
  targetDir: string,
  packageManager?: PackageManagerName,
): Promise<void> {
  try {
    const resolved =
      packageManager ??
      (
        await detectPackageManager(process.cwd(), {
          includeParentDirs: true,
          ignoreArgv: true,
        })
      )?.name ??
      'pnpm';

    await installDependencies({
      cwd: targetDir,
      packageManager: resolved,
    });
  } catch (error) {
    consola.warn(`Install failed: ${(error as Error).message}`);
  }
}

function formatRunCommand(
  packageManager: PackageManagerName,
  script: string,
): string {
  switch (packageManager) {
    case 'npm':
      return `npm run ${script}`;
    case 'yarn':
      return `yarn ${script}`;
    case 'bun':
      return `bun run ${script}`;
    case 'pnpm':
    default:
      return `pnpm ${script}`;
  }
}

function formatInstallCommand(packageManager: PackageManagerName): string {
  switch (packageManager) {
    case 'npm':
      return 'npm install';
    case 'yarn':
      return 'yarn install';
    case 'bun':
      return 'bun install';
    case 'pnpm':
    default:
      return 'pnpm install';
  }
}

function printSuccessMessage(options: GenerateOptions): void {
  const packageManager = options.packageManager ?? 'pnpm';
  const devCommand = formatRunCommand(packageManager, 'dev');
  const installCommand = formatInstallCommand(packageManager);

  consola.success(`Created ${options.projectName}!`);
  consola.log('');
  consola.log('Next steps:');
  consola.log(`  cd ${options.projectName}`);
  if (!options.install) {
    consola.log(`  ${installCommand}`);
  }
  consola.log(`  ${devCommand}`);
  consola.log('');
  consola.log('Add API key to .env to use real LLM (optional).');
}
