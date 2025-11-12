import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('SvelteKit Project Initialization', () => {
  const projectRoot = process.cwd();

  it('should have package.json with SvelteKit dependencies', () => {
    const packageJsonPath = join(projectRoot, 'package.json');
    expect(existsSync(packageJsonPath), 'package.json should exist').toBe(true);

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Check for SvelteKit dependencies
    expect(packageJson.devDependencies?.['@sveltejs/kit']).toBeDefined();
    expect(packageJson.devDependencies?.['@sveltejs/adapter-auto']).toBeDefined();
    expect(packageJson.devDependencies?.['svelte']).toBeDefined();
  });

  it('should have svelte.config.js file', () => {
    const svelteConfigPath = join(projectRoot, 'svelte.config.js');
    expect(existsSync(svelteConfigPath), 'svelte.config.js should exist').toBe(true);

    const config = readFileSync(svelteConfigPath, 'utf-8');
    expect(config).toContain('@sveltejs/kit');
  });

  it('should have TypeScript configuration', () => {
    const tsConfigPath = join(projectRoot, 'tsconfig.json');
    expect(existsSync(tsConfigPath), 'tsconfig.json should exist').toBe(true);

    const tsConfig = JSON.parse(readFileSync(tsConfigPath, 'utf-8'));
    expect(tsConfig.compilerOptions?.moduleResolution).toBe('bundler');
  });

  it('should have src/routes/+page.svelte', () => {
    const pagePath = join(projectRoot, 'src', 'routes', '+page.svelte');
    expect(existsSync(pagePath), 'src/routes/+page.svelte should exist').toBe(true);
  });

  it('should have app.html in static directory', () => {
    const appHtmlPath = join(projectRoot, 'src', 'app.html');
    expect(existsSync(appHtmlPath), 'src/app.html should exist').toBe(true);

    const appHtml = readFileSync(appHtmlPath, 'utf-8');
    expect(appHtml).toContain('%sveltekit.body%');
  });

  it('should have vite.config.ts', () => {
    const viteConfigPath = join(projectRoot, 'vite.config.ts');
    expect(existsSync(viteConfigPath), 'vite.config.ts should exist').toBe(true);
  });

  it('package.json should have dev scripts', () => {
    const packageJsonPath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.scripts?.['dev']).toBe('vite dev');
    expect(packageJson.scripts?.['build']).toBe('vite build');
    expect(packageJson.scripts?.['preview']).toBe('vite preview');
    expect(packageJson.scripts?.['check']).toBe('svelte-kit sync && svelte-check --tsconfig ./tsconfig.json');
  });
});