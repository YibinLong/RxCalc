import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

describe('Environment Variables Setup', () => {
  const projectRoot = process.cwd();

  beforeAll(() => {
    // Load environment variables from .env file for testing
    config({ path: join(projectRoot, '.env') });
  });

  it('should have .env file', () => {
    const envPath = join(projectRoot, '.env');
    expect(existsSync(envPath), '.env file should exist').toBe(true);
  });

  it('should have .env.example file', () => {
    const envExamplePath = join(projectRoot, '.env.example');
    expect(existsSync(envExamplePath), '.env.example file should exist').toBe(true);
  });

  it('should have .env file with OPENAI_API_KEY', () => {
    const envPath = join(projectRoot, '.env');
    const envContent = readFileSync(envPath, 'utf-8');

    expect(envContent).toContain('OPENAI_API_KEY');
    expect(envContent.split('\n').filter(line => line.trim() && !line.startsWith('#')).length).toBeGreaterThan(0);
  });

  it('should have .env.example with all required variables', () => {
    const envExamplePath = join(projectRoot, '.env.example');
    const envExampleContent = readFileSync(envExamplePath, 'utf-8');

    // Check for essential API keys
    expect(envExampleContent).toContain('OPENAI_API_KEY');
    expect(envExampleContent).toContain('RXNORM_API_KEY');

    // Check for GCP configuration
    expect(envExampleContent).toContain('GCP_PROJECT_ID');
    expect(envExampleContent).toContain('GCP_SERVICE_ACCOUNT_KEY_PATH');

    // Check for API URLs
    expect(envExampleContent).toContain('RXNORM_API_BASE_URL');
    expect(envExampleContent).toContain('FDA_NDC_API_BASE_URL');

    // Check for application configuration
    expect(envExampleContent).toContain('NODE_ENV');
    expect(envExampleContent).toContain('PORT');

    // Check for feature flags
    expect(envExampleContent).toContain('ENABLE_AI_FEATURES');
    expect(envExampleContent).toContain('ENABLE_MULTI_PACK_SUPPORT');

    // Check for security configuration
    expect(envExampleContent).toContain('CORS_ORIGIN');
    expect(envExampleContent).toContain('SESSION_SECRET');
    expect(envExampleContent).toContain('JWT_SECRET');
  });

  it('should have environment variables loaded in process.env', () => {
    // Test that OPENAI_API_KEY is loaded (this should be available from .env)
    expect(process.env.OPENAI_API_KEY).toBeDefined();
    expect(process.env.OPENAI_API_KEY?.length).toBeGreaterThan(10);
  });

  it('should have example values in .env.example file', () => {
    const envExamplePath = join(projectRoot, '.env.example');
    const envExampleContent = readFileSync(envExamplePath, 'utf-8');

    // Check that example values are provided (not empty)
    expect(envExampleContent).toContain('sk-your-openai-api-key-here');
    expect(envExampleContent).toContain('your-rxnorm-api-key-here');
    expect(envExampleContent).toContain('your-gcp-project-id');
    expect(envExampleContent).toContain('http://localhost:5173');
  });

  it('should have proper documentation comments in .env.example', () => {
    const envExamplePath = join(projectRoot, '.env.example');
    const envExampleContent = readFileSync(envExamplePath, 'utf-8');

    // Check for section comments
    expect(envExampleContent).toContain('# API Keys');
    expect(envExampleContent).toContain('# Google Cloud Platform');
    expect(envExampleContent).toContain('# Application Configuration');
    expect(envExampleContent).toContain('# External API URLs');
    expect(envExampleContent).toContain('# Security');
  });

  it('should have non-empty .env file structure', () => {
    const envPath = join(projectRoot, '.env');
    const envContent = readFileSync(envPath, 'utf-8');

    // Should contain at least one non-comment, non-empty line
    const nonEmptyLines = envContent.split('\n').filter(line =>
      line.trim() && !line.startsWith('#')
    );

    expect(nonEmptyLines.length).toBeGreaterThan(0);
  });
});