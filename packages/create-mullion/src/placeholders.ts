import {readdir, readFile, stat, writeFile} from 'node:fs/promises';
import {extname, join} from 'pathe';

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.ico',
  '.zip',
  '.tgz',
  '.wasm',
  '.pdf',
]);

const SKIP_DIRS = new Set(['node_modules', '.git']);

export async function replacePlaceholders(
  dir: string,
  replacements: Record<string, string>,
): Promise<void> {
  const entries = await readdir(dir, {withFileTypes: true});
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      await replacePlaceholders(fullPath, replacements);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (BINARY_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      continue;
    }
    const contents = await readFile(fullPath, 'utf8');
    let next = contents;
    for (const [key, value] of Object.entries(replacements)) {
      next = next.split(key).join(value);
    }
    if (next !== contents) {
      await writeFile(fullPath, next, 'utf8');
    }
  }
}

export async function ensureEnvExample(
  targetDir: string,
  projectName: string,
): Promise<void> {
  const envPath = join(targetDir, '.env.example');
  try {
    await stat(envPath);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const content = [
    `# ${projectName} environment`,
    '# Leave keys empty to use mock mode.',
    'NUXT_OPENAI_API_KEY=',
    'NUXT_ANTHROPIC_API_KEY=',
    '# Optional: disable OpenAI strict JSON schema',
    '# NUXT_OPENAI_STRICT_JSON_SCHEMA=false',
    '',
  ].join('\n');

  await writeFile(envPath, content, 'utf8');
}

export async function ensureReadme(
  targetDir: string,
  projectName: string,
): Promise<void> {
  const readmePath = join(targetDir, 'README.md');
  try {
    await stat(readmePath);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const content = [
    `# ${projectName}`,
    '',
    '## Quick start',
    '',
    '```bash',
    'pnpm dev',
    '```',
    '',
    'If you skipped dependency installation, run:',
    '',
    '```bash',
    'pnpm install',
    '```',
    '',
    '## Use a real LLM provider',
    '',
    'Copy `.env.example` to `.env` and add a key:',
    '',
    '```env',
    'NUXT_ANTHROPIC_API_KEY=sk-ant-...',
    'NUXT_OPENAI_API_KEY=sk-...',
    '',
    '# Optional: disable OpenAI strict JSON schema',
    '# NUXT_OPENAI_STRICT_JSON_SCHEMA=false',
    '```',
    '',
    '## Project structure',
    '',
    '- `app/` - client UI',
    '- `schemas.ts` - shared Zod schemas (server + client)',
    '- `server/api/` - API endpoints',
    '- `server/utils/mullion/` - scenario logic and provider selection',
    '- `public/` - static assets',
    '- `nuxt.config.ts` - Nuxt config',
    '',
  ].join('\n');

  await writeFile(readmePath, content, 'utf8');
}
