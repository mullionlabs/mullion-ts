import {readFile, writeFile} from 'node:fs/promises';

export interface PackageJson {
  name?: string;
  version?: string;
  private?: boolean;
  type?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  [key: string]: unknown;
}

const MERGE_KEYS: (keyof PackageJson)[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'scripts',
];

export async function readJsonFile<T = PackageJson>(
  path: string,
): Promise<T | undefined> {
  try {
    const contents = await readFile(path, 'utf8');
    return JSON.parse(contents) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

export function mergePackageJson(
  projectName: string,
  slices: (PackageJson | undefined)[],
): PackageJson {
  const result: PackageJson = {};

  for (const slice of slices) {
    if (!slice) {
      continue;
    }

    // Copy non-mergeable keys (only if not already set)
    for (const [key, value] of Object.entries(slice)) {
      if (!MERGE_KEYS.includes(key as keyof PackageJson) && !(key in result)) {
        result[key] = value;
      }
    }

    // Deep merge the mergeable keys
    for (const key of MERGE_KEYS) {
      const current = result[key] as Record<string, string> | undefined;
      const incoming = slice[key] as Record<string, string> | undefined;
      if (incoming) {
        result[key] = {...(current ?? {}), ...incoming};
      }
    }
  }

  result.name = sanitizePackageName(projectName);
  result.private ??= true;

  return result;
}

export async function writePackageJson(
  path: string,
  pkg: PackageJson,
): Promise<void> {
  const content = `${JSON.stringify(pkg, null, 2)}\n`;
  await writeFile(path, content, 'utf8');
}

function sanitizePackageName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-._/]/g, '-');
}
