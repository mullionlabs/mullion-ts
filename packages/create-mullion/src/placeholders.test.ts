import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'pathe';
import {describe, expect, it, afterEach} from 'vitest';
import {
  ensureEnvExample,
  ensureReadme,
  replacePlaceholders,
} from './placeholders.js';

describe('placeholders', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    // Clean up temp directories after each test
    for (const dir of tempDirs) {
      await rm(dir, {recursive: true, force: true});
    }
    tempDirs.length = 0;
  });

  async function createTempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'create-mullion-test-'));
    tempDirs.push(dir);
    return dir;
  }

  describe('replacePlaceholders', () => {
    it('should replace simple placeholders in text files', async () => {
      const dir = await createTempDir();
      const filePath = join(dir, 'test.txt');

      await writeFile(
        filePath,
        'Project: {{PROJECT_NAME}}\nAuthor: {{AUTHOR}}',
        'utf8',
      );

      await replacePlaceholders(dir, {
        '{{PROJECT_NAME}}': 'my-app',
        '{{AUTHOR}}': 'John Doe',
      });

      const result = await readFile(filePath, 'utf8');
      expect(result).toBe('Project: my-app\nAuthor: John Doe');
    });

    it('should replace catalog placeholders', async () => {
      const dir = await createTempDir();
      const filePath = join(dir, 'package.json');

      await writeFile(
        filePath,
        JSON.stringify({
          dependencies: {
            typescript: '{{CATALOG:typescript}}',
            vitest: '{{CATALOG:vitest}}',
          },
        }),
        'utf8',
      );

      await replacePlaceholders(dir, {
        '{{CATALOG:typescript}}': '^5.6.3',
        '{{CATALOG:vitest}}': '^2.1.8',
      });

      const result = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(result);

      expect(parsed.dependencies.typescript).toBe('^5.6.3');
      expect(parsed.dependencies.vitest).toBe('^2.1.8');
    });

    it('should replace multiple occurrences of the same placeholder', async () => {
      const dir = await createTempDir();
      const filePath = join(dir, 'test.txt');

      await writeFile(
        filePath,
        '{{NAME}} is great. I love {{NAME}}! {{NAME}}',
        'utf8',
      );

      await replacePlaceholders(dir, {
        '{{NAME}}': 'Mullion',
      });

      const result = await readFile(filePath, 'utf8');
      expect(result).toBe('Mullion is great. I love Mullion! Mullion');
    });

    it('should skip binary files', async () => {
      const dir = await createTempDir();
      const pngPath = join(dir, 'image.png');
      const originalContent = Buffer.from([137, 80, 78, 71]); // PNG header

      await writeFile(pngPath, originalContent);

      // Try to replace (should skip)
      await replacePlaceholders(dir, {
        '{{NAME}}': 'test',
      });

      const result = await readFile(pngPath);
      expect(result).toEqual(originalContent);
    });

    it('should process files in subdirectories', async () => {
      const dir = await createTempDir();
      const subDir = join(dir, 'sub');
      const filePath = join(subDir, 'test.txt');

      // Create subdirectory structure
      const fs = await import('node:fs/promises');
      await fs.mkdir(subDir, {recursive: true});
      await writeFile(filePath, '{{NAME}}', 'utf8');

      await replacePlaceholders(dir, {
        '{{NAME}}': 'nested',
      });

      const result = await readFile(filePath, 'utf8');
      expect(result).toBe('nested');
    });

    it('should skip node_modules directory', async () => {
      const dir = await createTempDir();
      const nodeModules = join(dir, 'node_modules');
      const filePath = join(nodeModules, 'test.txt');

      const fs = await import('node:fs/promises');
      await fs.mkdir(nodeModules, {recursive: true});
      await writeFile(filePath, '{{NAME}}', 'utf8');

      await replacePlaceholders(dir, {
        '{{NAME}}': 'should-not-replace',
      });

      const result = await readFile(filePath, 'utf8');
      expect(result).toBe('{{NAME}}'); // Should remain unchanged
    });

    it('should skip .git directory', async () => {
      const dir = await createTempDir();
      const gitDir = join(dir, '.git');
      const filePath = join(gitDir, 'config');

      const fs = await import('node:fs/promises');
      await fs.mkdir(gitDir, {recursive: true});
      await writeFile(filePath, '{{NAME}}', 'utf8');

      await replacePlaceholders(dir, {
        '{{NAME}}': 'should-not-replace',
      });

      const result = await readFile(filePath, 'utf8');
      expect(result).toBe('{{NAME}}'); // Should remain unchanged
    });

    it('should not modify files without placeholders', async () => {
      const dir = await createTempDir();
      const filePath = join(dir, 'test.txt');
      const content = 'This is a regular file without placeholders';

      await writeFile(filePath, content, 'utf8');

      await replacePlaceholders(dir, {
        '{{NAME}}': 'test',
      });

      const result = await readFile(filePath, 'utf8');
      expect(result).toBe(content); // Should remain unchanged
    });

    it('should handle multiple replacements in the same file', async () => {
      const dir = await createTempDir();
      const filePath = join(dir, 'test.txt');

      await writeFile(filePath, '{{A}} and {{B}} and {{C}}', 'utf8');

      await replacePlaceholders(dir, {
        '{{A}}': '1',
        '{{B}}': '2',
        '{{C}}': '3',
      });

      const result = await readFile(filePath, 'utf8');
      expect(result).toBe('1 and 2 and 3');
    });
  });

  describe('ensureEnvExample', () => {
    it('should create .env.example if it does not exist', async () => {
      const dir = await createTempDir();

      await ensureEnvExample(dir, 'my-project');

      const envPath = join(dir, '.env.example');
      const content = await readFile(envPath, 'utf8');

      expect(content).toContain('# my-project environment');
      expect(content).toContain('NUXT_OPENAI_API_KEY=');
      expect(content).toContain('NUXT_ANTHROPIC_API_KEY=');
      expect(content).toContain('NUXT_OPENAI_STRICT_JSON_SCHEMA');
      expect(content).toContain('Leave keys empty to use mock mode');
    });

    it('should not overwrite existing .env.example', async () => {
      const dir = await createTempDir();
      const envPath = join(dir, '.env.example');
      const existingContent = 'CUSTOM_KEY=value\n';

      await writeFile(envPath, existingContent, 'utf8');

      await ensureEnvExample(dir, 'my-project');

      const content = await readFile(envPath, 'utf8');
      expect(content).toBe(existingContent); // Should remain unchanged
    });

    it('should create valid environment file format', async () => {
      const dir = await createTempDir();

      await ensureEnvExample(dir, 'test-app');

      const envPath = join(dir, '.env.example');
      const content = await readFile(envPath, 'utf8');
      const lines = content.split('\n');

      // Check format
      expect(lines[0]).toMatch(/^# test-app environment$/);
      expect(lines[1]).toMatch(/^# Leave keys empty/);
      expect(lines[2]).toBe('NUXT_OPENAI_API_KEY=');
      expect(lines[3]).toBe('NUXT_ANTHROPIC_API_KEY=');
      expect(lines[4]).toBe('# Optional: disable OpenAI strict JSON schema');
      expect(lines[5]).toBe('# NUXT_OPENAI_STRICT_JSON_SCHEMA=false');
      expect(lines[6]).toBe(''); // Empty line at end
    });

    it('should create Next.js env example when framework is next', async () => {
      const dir = await createTempDir();

      await ensureEnvExample(dir, 'next-app', 'next');

      const envPath = join(dir, '.env.example');
      const content = await readFile(envPath, 'utf8');

      expect(content).toContain('# next-app environment');
      expect(content).toContain('OPENAI_API_KEY=');
      expect(content).toContain('ANTHROPIC_API_KEY=');
      expect(content).toContain('OPENAI_STRICT_JSON_SCHEMA');
      expect(content).not.toContain('NUXT_OPENAI_API_KEY');
    });
  });

  describe('ensureReadme', () => {
    it('should create README.md if it does not exist', async () => {
      const dir = await createTempDir();

      await ensureReadme(dir, 'demo-app');

      const readmePath = join(dir, 'README.md');
      const content = await readFile(readmePath, 'utf8');

      expect(content).toContain('# demo-app');
      expect(content).toContain('## Quick start');
      expect(content).toContain('pnpm dev');
      expect(content).toContain('## Project structure');
      expect(content).toContain('schemas.ts');
    });

    it('should not overwrite existing README.md', async () => {
      const dir = await createTempDir();
      const readmePath = join(dir, 'README.md');
      const existingContent = '# Custom README\n';

      await writeFile(readmePath, existingContent, 'utf8');

      await ensureReadme(dir, 'demo-app');

      const content = await readFile(readmePath, 'utf8');
      expect(content).toBe(existingContent);
    });

    it('should create Next.js README when framework is next', async () => {
      const dir = await createTempDir();

      await ensureReadme(dir, 'next-demo', 'next');

      const readmePath = join(dir, 'README.md');
      const content = await readFile(readmePath, 'utf8');

      expect(content).toContain('# next-demo');
      expect(content).toContain('src/app/');
      expect(content).toContain('src/mullion/');
      expect(content).toContain('OPENAI_API_KEY');
      expect(content).toContain('next.config.mjs');
    });
  });
});
