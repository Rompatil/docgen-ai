import * as path from 'path';
import { parseFile, canParse, getSupportedLanguages } from '../../src/core/parsers/registry';

const FIXTURES = path.join(__dirname, '..', '__fixtures__');

describe('Parser Registry', () => {

  it('should list supported languages', () => {
    const langs = getSupportedLanguages();
    expect(langs).toContain('javascript');
    expect(langs).toContain('typescript');
    expect(langs).toContain('python');
  });

  it('should report .ts files as parseable', () => {
    expect(canParse('src/app.ts')).toBe(true);
  });

  it('should report .js files as parseable', () => {
    expect(canParse('routes/users.js')).toBe(true);
  });

  it('should report .py files as parseable', () => {
    expect(canParse('api/views.py')).toBe(true);
  });

  it('should report .css files as not parseable', () => {
    expect(canParse('styles/main.css')).toBe(false);
  });

  it('should report .json files as not parseable', () => {
    expect(canParse('package.json')).toBe(false);
  });

  it('should parse a JS fixture via the registry', () => {
    const filePath = path.join(FIXTURES, 'javascript/user-routes.js');
    const result = parseFile(filePath, FIXTURES);
    expect(result).not.toBeNull();
    expect(result!.language).toBe('javascript');
    expect(result!.functions.length).toBeGreaterThan(0);
  });

  it('should parse a TS fixture via the registry', () => {
    const filePath = path.join(FIXTURES, 'typescript/task-service.ts');
    const result = parseFile(filePath, FIXTURES);
    expect(result).not.toBeNull();
    expect(result!.language).toBe('typescript');
    expect(result!.classes.length).toBeGreaterThan(0);
  });

  it('should parse a Python fixture via the registry', () => {
    const filePath = path.join(FIXTURES, 'python/product-api.py');
    const result = parseFile(filePath, FIXTURES);
    expect(result).not.toBeNull();
    expect(result!.language).toBe('python');
    expect(result!.apiEndpoints.length).toBeGreaterThan(0);
  });

  it('should return null for unsupported file types', () => {
    const result = parseFile('/tmp/style.css', '/tmp');
    expect(result).toBeNull();
  });

  it('should return null for nonexistent files', () => {
    const result = parseFile('/tmp/does-not-exist.ts', '/tmp');
    expect(result).toBeNull();
  });
});
