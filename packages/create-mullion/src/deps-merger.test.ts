import {describe, expect, it} from 'vitest';
import {mergePackageJson, type PackageJson} from './deps-merger.js';

describe('deps-merger', () => {
  describe('mergePackageJson', () => {
    it('should merge dependencies from multiple sources', () => {
      const base: PackageJson = {
        name: 'base',
        version: '1.0.0',
        dependencies: {
          nuxt: '^4.0.0',
          zod: '^3.23.0',
        },
      };

      const overlay: PackageJson = {
        dependencies: {
          '@ai-sdk/openai': '^1.0.0',
          zod: '^4.0.0', // Should override base
        },
      };

      const result = mergePackageJson('test-project', [base, overlay]);

      expect(result.dependencies).toEqual({
        nuxt: '^4.0.0',
        zod: '^4.0.0', // Overlay wins
        '@ai-sdk/openai': '^1.0.0',
      });
    });

    it('should merge devDependencies', () => {
      const base: PackageJson = {
        devDependencies: {
          typescript: '^5.0.0',
        },
      };

      const overlay: PackageJson = {
        devDependencies: {
          vitest: '^1.0.0',
        },
      };

      const result = mergePackageJson('test-project', [base, overlay]);

      expect(result.devDependencies).toEqual({
        typescript: '^5.0.0',
        vitest: '^1.0.0',
      });
    });

    it('should merge peerDependencies', () => {
      const base: PackageJson = {
        peerDependencies: {
          react: '^18.0.0',
        },
      };

      const overlay: PackageJson = {
        peerDependencies: {
          vue: '^3.0.0',
        },
      };

      const result = mergePackageJson('test-project', [base, overlay]);

      expect(result.peerDependencies).toEqual({
        react: '^18.0.0',
        vue: '^3.0.0',
      });
    });

    it('should merge scripts', () => {
      const base: PackageJson = {
        scripts: {
          dev: 'nuxt dev',
          build: 'nuxt build',
        },
      };

      const overlay: PackageJson = {
        scripts: {
          test: 'vitest',
          build: 'echo override', // Should override
        },
      };

      const result = mergePackageJson('test-project', [base, overlay]);

      expect(result.scripts).toEqual({
        dev: 'nuxt dev',
        build: 'echo override', // Overlay wins
        test: 'vitest',
      });
    });

    it('should set project name and sanitize it', () => {
      const result = mergePackageJson('My Test Project!', [{}]);

      expect(result.name).toBe('my-test-project-');
    });

    it('should sanitize project names with spaces and special chars', () => {
      const testCases = [
        {input: 'My Project', expected: 'my-project'},
        {input: 'test@app#1', expected: 'test-app-1'},
        {input: 'PROJECT_NAME', expected: 'project_name'},
        {input: '  SpaceAround  ', expected: 'spacearound'},
        {input: 'foo/bar', expected: 'foo/bar'}, // / is allowed
      ];

      for (const {input, expected} of testCases) {
        const result = mergePackageJson(input, [{}]);
        expect(result.name).toBe(expected);
      }
    });

    it('should set private to true by default', () => {
      const result = mergePackageJson('test', [{}]);
      expect(result.private).toBe(true);
    });

    it('should respect private flag if set in base', () => {
      const base: PackageJson = {
        private: false,
      };

      const result = mergePackageJson('test', [base]);
      expect(result.private).toBe(false);
    });

    it('should handle undefined slices gracefully', () => {
      const base: PackageJson = {
        dependencies: {
          foo: '1.0.0',
        },
      };

      const result = mergePackageJson('test', [base, undefined, undefined]);

      expect(result.dependencies).toEqual({
        foo: '1.0.0',
      });
    });

    it('should not merge non-mergeable keys from later slices', () => {
      const base: PackageJson = {
        version: '1.0.0',
        type: 'module',
      };

      const overlay: PackageJson = {
        version: '2.0.0', // Should NOT override
        description: 'Test', // Should be added
      };

      const result = mergePackageJson('test', [base, overlay]);

      expect(result.version).toBe('1.0.0'); // Base wins
      expect(result.description).toBe('Test'); // New key added
    });

    it('should merge multiple slices in order', () => {
      const base: PackageJson = {
        dependencies: {
          a: '1.0.0',
        },
      };

      const overlay1: PackageJson = {
        dependencies: {
          b: '2.0.0',
          a: '1.5.0', // Override
        },
      };

      const overlay2: PackageJson = {
        dependencies: {
          c: '3.0.0',
          a: '2.0.0', // Final override
        },
      };

      const result = mergePackageJson('test', [base, overlay1, overlay2]);

      expect(result.dependencies).toEqual({
        a: '2.0.0', // Last one wins
        b: '2.0.0',
        c: '3.0.0',
      });
    });

    it('should handle empty slices', () => {
      const result = mergePackageJson('test', []);

      expect(result.name).toBe('test');
      expect(result.private).toBe(true);
    });

    it('should preserve custom fields from base', () => {
      const base: PackageJson = {
        author: 'Test Author',
        license: 'MIT',
        repository: 'https://github.com/test/test',
      };

      const result = mergePackageJson('test', [base]);

      expect(result.author).toBe('Test Author');
      expect(result.license).toBe('MIT');
      expect(result.repository).toBe('https://github.com/test/test');
    });
  });
});
