import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('TypeScript Configuration', () => {
  const projectRoot = process.cwd();

  it('should have tsconfig.json with proper compiler options', () => {
    const tsConfigPath = join(projectRoot, 'tsconfig.json');
    expect(existsSync(tsConfigPath), 'tsconfig.json should exist').toBe(true);

    const tsConfig = JSON.parse(readFileSync(tsConfigPath, 'utf-8'));

    // Check essential TypeScript compiler options
    expect(tsConfig.compilerOptions).toBeDefined();
    expect(tsConfig.compilerOptions?.strict).toBe(true);
    expect(tsConfig.compilerOptions?.moduleResolution).toBe('bundler');
    expect(tsConfig.compilerOptions?.sourceMap).toBe(true);
    expect(tsConfig.compilerOptions?.skipLibCheck).toBe(true);
  });

  it('should extend .svelte-kit/tsconfig.json', () => {
    const tsConfigPath = join(projectRoot, 'tsconfig.json');
    const tsConfig = JSON.parse(readFileSync(tsConfigPath, 'utf-8'));

    expect(tsConfig.extends).toBe('./.svelte-kit/tsconfig.json');
  });

  it('should have TypeScript as a dependency', () => {
    const packageJsonPath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.devDependencies?.['typescript']).toBeDefined();
    expect(packageJson.devDependencies?.['svelte-check']).toBeDefined();
  });

  it('should have TypeScript check script', () => {
    const packageJsonPath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.scripts?.['check']).toBeDefined();
    expect(packageJson.scripts?.['check']).toContain('svelte-check');
  });

  it('should have .svelte-kit directory and tsconfig.json', () => {
    const svelteKitTsConfigPath = join(projectRoot, '.svelte-kit', 'tsconfig.json');
    expect(existsSync(svelteKitTsConfigPath), '.svelte-kit/tsconfig.json should exist').toBe(true);
  });

  it('should have app.d.ts for SvelteKit types', () => {
    const appDtsPath = join(projectRoot, 'src', 'app.d.ts');
    expect(existsSync(appDtsPath), 'src/app.d.ts should exist').toBe(true);

    const appDts = readFileSync(appDtsPath, 'utf-8');
    expect(appDts).toContain('svelte.dev');
  });

  it('should have valid TypeScript configuration that can be parsed', () => {
    // This test ensures the tsconfig.json is valid JSON and can be used by TypeScript
    const tsConfigPath = join(projectRoot, 'tsconfig.json');
    const tsConfigContent = readFileSync(tsConfigPath, 'utf-8');

    expect(() => JSON.parse(tsConfigContent)).not.toThrow();
  });
});