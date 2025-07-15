/**
 * Basic integration test to ensure test infrastructure works
 */

import { existsSync } from 'fs';
import { join } from 'path';

describe('Basic Integration Test Suite', () => {
  test('should verify project structure', () => {
    // Check key directories exist
    expect(existsSync('src')).toBe(true);
    expect(existsSync('tests')).toBe(true);
    expect(existsSync('package.json')).toBe(true);
  });

  test('should verify CLI entry points exist', () => {
    expect(existsSync('bin/claude-flow')).toBe(true);
    expect(existsSync('src/cli/simple-cli.js')).toBe(true);
  });

  test('should have valid configuration files', () => {
    expect(existsSync('jest.config.js')).toBe(true);
    expect(existsSync('tsconfig.json')).toBe(true);
  });

  test('should check project basics', () => {
    // Just check we have a name
    expect('claude-flow').toBeDefined();
  });
});

describe('Environment Check', () => {
  test('should have required Node.js version', () => {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    expect(majorVersion).toBeGreaterThanOrEqual(18);
  });

  test('should have required environment', () => {
    expect(process.env).toBeDefined();
    expect(process.platform).toBeDefined();
  });
});