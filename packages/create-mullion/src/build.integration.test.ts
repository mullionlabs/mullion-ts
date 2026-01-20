import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'pathe';
import {describe, expect, it, afterEach} from 'vitest';
import {spawn} from 'node:child_process';
import {generateProject, type GenerateOptions} from './generator.js';

describe('build integration tests', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    // Clean up temp directories after each test
    for (const dir of tempDirs) {
      await rm(dir, {recursive: true, force: true});
    }
    tempDirs.length = 0;
  });

  async function createTempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'create-mullion-build-'));
    tempDirs.push(dir);
    return dir;
  }

  async function execCommand(
    command: string,
    args: string[],
    cwd: string,
    timeout = 120000, // 2 minutes default
  ): Promise<{stdout: string; stderr: string; exitCode: number}> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      // Set timeout
      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      child.on('close', (exitCode) => {
        clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr,
          exitCode: exitCode ?? 1,
        });
      });
    });
  }

  describe('generated project builds', () => {
    it('should generate and build a Nuxt RAG minimal project', async () => {
      const targetDir = await createTempDir();

      const options: GenerateOptions = {
        projectName: 'test-build-rag-minimal',
        targetDir,
        framework: 'nuxt',
        scenario: 'rag',
        ui: 'minimal',
        install: true, // Need to install to build
        git: false,
      };

      await generateProject(options);

      // Try to build the project
      const result = await execCommand(
        'pnpm',
        ['run', 'build'],
        targetDir,
        180000,
      );

      // Check build succeeded
      expect(result.exitCode).toBe(0);
      expect(result.stdout + result.stderr).toContain('build');
    }, // Longer timeout for this test since it involves building
    200000); // 200 seconds

    it('should generate and build a Nuxt RAG shadcn project', async () => {
      const targetDir = await createTempDir();

      const options: GenerateOptions = {
        projectName: 'test-build-rag-shadcn',
        targetDir,
        framework: 'nuxt',
        scenario: 'rag',
        ui: 'shadcn',
        install: true,
        git: false,
      };

      await generateProject(options);

      // Try to build the project
      const result = await execCommand(
        'pnpm',
        ['run', 'build'],
        targetDir,
        180000,
      );

      // Check build succeeded
      expect(result.exitCode).toBe(0);
    }, 200000);

    it('should generate and build a Nuxt helpdesk minimal project', async () => {
      const targetDir = await createTempDir();

      const options: GenerateOptions = {
        projectName: 'test-build-helpdesk-minimal',
        targetDir,
        framework: 'nuxt',
        scenario: 'helpdesk',
        ui: 'minimal',
        install: true,
        git: false,
      };

      await generateProject(options);

      // Try to build the project
      const result = await execCommand(
        'pnpm',
        ['run', 'build'],
        targetDir,
        180000,
      );

      // Check build succeeded
      expect(result.exitCode).toBe(0);
    }, 200000);

    it('should generate and build a Nuxt helpdesk shadcn project', async () => {
      const targetDir = await createTempDir();

      const options: GenerateOptions = {
        projectName: 'test-build-helpdesk-shadcn',
        targetDir,
        framework: 'nuxt',
        scenario: 'helpdesk',
        ui: 'shadcn',
        install: true,
        git: false,
      };

      await generateProject(options);

      // Try to build the project
      const result = await execCommand(
        'pnpm',
        ['run', 'build'],
        targetDir,
        180000,
      );

      // Check build succeeded
      expect(result.exitCode).toBe(0);
    }, 200000);

    it.skip('should generate a project that passes type checking', async () => {
      // TODO: Re-enable when base template includes typecheck script
      // This test is currently skipped because the base Nuxt template
      // doesn't include a typecheck script by default
      const targetDir = await createTempDir();

      const options: GenerateOptions = {
        projectName: 'test-typecheck',
        targetDir,
        framework: 'nuxt',
        scenario: 'rag',
        ui: 'minimal',
        install: true,
        git: false,
      };

      await generateProject(options);

      // Try to run type checking
      const result = await execCommand(
        'pnpm',
        ['run', 'typecheck'],
        targetDir,
        120000,
      );

      expect(result.exitCode).toBe(0);
    }, 150000);
  });

  describe('generated project structure validation', () => {
    it('should generate a project with correct Nuxt 4 structure', async () => {
      const targetDir = await createTempDir();

      const options: GenerateOptions = {
        projectName: 'test-structure',
        targetDir,
        framework: 'nuxt',
        scenario: 'rag',
        ui: 'minimal',
        install: false, // Skip install for structure check
        git: false,
      };

      await generateProject(options);

      // Verify Nuxt 4 directory structure
      const {stat} = await import('node:fs/promises');

      // Check app directory
      const appStats = await stat(join(targetDir, 'app'));
      expect(appStats.isDirectory()).toBe(true);

      // Check server directory
      const serverStats = await stat(join(targetDir, 'server'));
      expect(serverStats.isDirectory()).toBe(true);

      // Check nuxt.config.ts
      const configStats = await stat(join(targetDir, 'nuxt.config.ts'));
      expect(configStats.isFile()).toBe(true);
    }, 30000);
  });
});
