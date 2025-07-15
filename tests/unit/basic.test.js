/**
 * Basic smoke test to ensure test infrastructure works
 */

describe('Basic Test Suite', () => {
  test('should pass basic assertion', () => {
    expect(true).toBe(true);
  });

  test('should perform basic math', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle strings', () => {
    expect('claude-flow').toContain('claude');
  });

  test('should handle arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  test('should handle objects', () => {
    const obj = { name: 'claude-flow', version: '2.0.0' };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('claude-flow');
  });
});

describe('Environment Check', () => {
  test('should have Node.js version', () => {
    expect(process.version).toBeDefined();
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    expect(majorVersion).toBeGreaterThanOrEqual(18);
  });

  test('should have required environment', () => {
    expect(process.env).toBeDefined();
    expect(process.platform).toBeDefined();
  });
});