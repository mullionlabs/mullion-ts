import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join, resolve} from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..');
const workspacePath = join(repoRoot, 'pnpm-workspace.yaml');
const outputPath = join(
  repoRoot,
  'packages',
  'create-mullion',
  'templates',
  'versions.json',
);

const workspaceContents = await readFile(workspacePath, 'utf8');
const catalog = parseCatalog(workspaceContents);
const nextOutput = `${JSON.stringify(catalog, null, 2)}\n`;

await writeFile(outputPath, nextOutput, 'utf8');
console.log(`Updated ${outputPath}`);

function parseCatalog(contents) {
  const lines = contents.split(/\r?\n/);
  const catalog = {};
  let inCatalog = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    if (!inCatalog) {
      if (trimmed === 'catalog:') {
        inCatalog = true;
      }
      continue;
    }

    if (!line.startsWith('  ')) {
      if (trimmed.endsWith(':')) {
        break;
      }
      continue;
    }

    const match = trimmed.match(/^(['"]?)([^'"]+)\1:\s*(.+)$/);
    if (!match) {
      continue;
    }
    const [, , name, version] = match;
    catalog[name] = version.trim();
  }

  if (!inCatalog) {
    throw new Error('Missing catalog section in pnpm-workspace.yaml');
  }

  return catalog;
}
