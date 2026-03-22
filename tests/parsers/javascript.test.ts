import * as path from 'path';
import * as fs from 'fs';
import { parseJavaScriptFile } from '../../src/core/parsers/javascript';

const FIXTURES = path.join(__dirname, '..', '__fixtures__');

function parseFixture(subpath: string) {
  const filePath = path.join(FIXTURES, subpath);
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseJavaScriptFile(filePath, content, FIXTURES);
}

describe('JavaScript Parser', () => {
  describe('user-routes.js', () => {
    const result = parseFixture('javascript/user-routes.js');

    it('should match snapshot', () => {
      expect(result).toMatchSnapshot();
    });

    it('should detect language as javascript', () => {
      expect(result.language).toBe('javascript');
    });

    it('should have no parse errors', () => {
      expect(result.parseErrors).toHaveLength(0);
    });

    it('should extract named functions', () => {
      const names = result.functions.map(f => f.name);
      expect(names).toContain('formatUser');
      expect(names).toContain('isAdmin');
    });

    it('should extract function parameters', () => {
      const fn = result.functions.find(f => f.name === 'formatUser');
      expect(fn).toBeDefined();
      expect(fn!.params).toHaveLength(1);
      expect(fn!.params[0].name).toBe('user');
    });

    it('should capture JSDoc on functions', () => {
      const fn = result.functions.find(f => f.name === 'formatUser');
      expect(fn?.existingDoc).toBeDefined();
      expect(fn!.existingDoc).toContain('Format a user object');
    });

    it('should detect all 5 Express endpoints', () => {
      expect(result.apiEndpoints).toHaveLength(5);
    });

    it('should detect correct HTTP methods', () => {
      const methods = result.apiEndpoints.map(e => e.method);
      expect(methods).toEqual(expect.arrayContaining(['GET', 'POST', 'PUT', 'DELETE']));
    });

    it('should detect route paths', () => {
      const paths = result.apiEndpoints.map(e => e.path);
      expect(paths).toContain('/users');
      expect(paths).toContain('/users/:id');
    });

    it('should detect authenticate middleware on all routes', () => {
      expect(result.apiEndpoints.every(e => e.requiresAuth)).toBe(true);
    });

    it('should detect multi-middleware chains', () => {
      const post = result.apiEndpoints.find(e => e.method === 'POST');
      expect(post?.middleware).toContain('authenticate');
      expect(post?.middleware).toContain('validate');
    });

    it('should extract JSDoc and line comments', () => {
      expect(result.comments.length).toBeGreaterThan(0);
      expect(result.comments.some(c => c.type === 'jsdoc')).toBe(true);
      expect(result.comments.some(c => c.type === 'line')).toBe(true);
    });

    it('should produce a 16-char content hash', () => {
      expect(result.contentHash).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should count non-blank lines', () => {
      expect(result.lineCount).toBeGreaterThan(40);
    });
  });
});
