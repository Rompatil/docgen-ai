import * as path from 'path';
import * as fs from 'fs';
import { parseJavaScriptFile } from '../../src/core/parsers/javascript';

const FIXTURES = path.join(__dirname, '..', '__fixtures__');

function parseFixture(subpath: string) {
  const filePath = path.join(FIXTURES, subpath);
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseJavaScriptFile(filePath, content, FIXTURES);
}

describe('TypeScript Parser', () => {

  // ── Rich service file ────────────────────────────────────────────────────
  describe('task-service.ts', () => {
    const result = parseFixture('typescript/task-service.ts');

    it('should match snapshot', () => {
      expect(result).toMatchSnapshot();
    });

    it('should detect language as typescript', () => {
      expect(result.language).toBe('typescript');
    });

    it('should have no parse errors', () => {
      expect(result.parseErrors).toHaveLength(0);
    });

    // ── Class extraction ────────────────────────────────────────
    it('should extract the TaskService class', () => {
      const cls = result.classes.find(c => c.name === 'TaskService');
      expect(cls).toBeDefined();
    });

    it('should detect the @Injectable decorator', () => {
      const cls = result.classes.find(c => c.name === 'TaskService');
      expect(cls!.decorators).toEqual(expect.arrayContaining([
        expect.stringContaining('@Injectable'),
      ]));
    });

    it('should extract all class methods', () => {
      const cls = result.classes.find(c => c.name === 'TaskService');
      const methodNames = cls!.methods.map(m => m.name);
      expect(methodNames).toEqual(expect.arrayContaining([
        'findByUser', 'findById', 'create', 'update',
        'delete', 'assign', 'markComplete', 'getStats', 'onEvent',
      ]));
    });

    it('should detect async methods', () => {
      const cls = result.classes.find(c => c.name === 'TaskService');
      const findByUser = cls!.methods.find(m => m.name === 'findByUser');
      expect(findByUser!.isAsync).toBe(true);

      const onEvent = cls!.methods.find(m => m.name === 'onEvent');
      expect(onEvent!.isAsync).toBe(false);
    });

    it('should extract method parameters', () => {
      const cls = result.classes.find(c => c.name === 'TaskService');
      const create = cls!.methods.find(m => m.name === 'create');
      expect(create!.params.length).toBeGreaterThanOrEqual(2);
      expect(create!.params.some(p => p.name === 'userId')).toBe(true);
    });

    it('should extract method return types', () => {
      const cls = result.classes.find(c => c.name === 'TaskService');
      const findById = cls!.methods.find(m => m.name === 'findById');
      expect(findById!.returnType).toBeDefined();
      expect(findById!.returnType).toContain('Promise');
    });

    it('should extract class properties', () => {
      const cls = result.classes.find(c => c.name === 'TaskService');
      const propNames = cls!.properties.map(p => p.name);
      expect(propNames).toEqual(expect.arrayContaining(['logger', 'events']));
    });

    // ── Standalone functions ────────────────────────────────────
    it('should extract exported standalone functions', () => {
      const names = result.functions.map(f => f.name);
      expect(names).toContain('isOverdue');
      expect(names).toContain('formatTaskResponse');
    });

    it('should detect return types on standalone functions', () => {
      const isOverdue = result.functions.find(f => f.name === 'isOverdue');
      expect(isOverdue!.returnType).toBe('boolean');
    });

    it('should detect default parameter values', () => {
      const format = result.functions.find(f => f.name === 'formatTaskResponse');
      const includeDetails = format!.params.find(p => p.name === 'includeDetails');
      expect(includeDetails).toBeDefined();
      expect(includeDetails!.isOptional).toBe(true);
    });

    // ── Imports ─────────────────────────────────────────────────
    it('should extract ES module imports', () => {
      expect(result.imports.length).toBeGreaterThan(0);

      const nestImport = result.imports.find(i => i.source === '@nestjs/common');
      expect(nestImport).toBeDefined();
      expect(nestImport!.specifiers).toContain('Injectable');
      expect(nestImport!.isRelative).toBe(false);
    });

    it('should distinguish relative and external imports', () => {
      const relative = result.imports.filter(i => i.isRelative);
      const external = result.imports.filter(i => !i.isRelative);
      expect(relative.length).toBeGreaterThan(0);
      expect(external.length).toBeGreaterThan(0);
    });

    // ── Exports ─────────────────────────────────────────────────
    it('should detect exported types and interfaces', () => {
      const typeExports = result.exports.filter(e => e.type === 'type');
      const names = typeExports.map(e => e.name);
      expect(names).toEqual(expect.arrayContaining([
        'TaskQueryOptions', 'PaginatedResult',
      ]));
    });

    it('should detect exported class', () => {
      const classExport = result.exports.find(e => e.name === 'TaskService');
      expect(classExport).toBeDefined();
      expect(classExport!.type).toBe('class');
    });

    it('should detect exported functions', () => {
      const funcExports = result.exports.filter(e => e.type === 'function');
      const names = funcExports.map(e => e.name);
      expect(names).toEqual(expect.arrayContaining(['isOverdue', 'formatTaskResponse']));
    });
  });

  // ── Barrel/re-export file ────────────────────────────────────────────────
  describe('barrel-exports.ts', () => {
    const result = parseFixture('typescript/barrel-exports.ts');

    it('should match snapshot', () => {
      expect(result).toMatchSnapshot();
    });

    it('should detect re-exports', () => {
      const names = result.exports.map(e => e.name);
      expect(names).toEqual(expect.arrayContaining([
        'TaskService', 'CacheService',
      ]));
    });

    it('should detect type exports', () => {
      const typeExport = result.exports.find(e => e.name === 'ServiceName');
      expect(typeExport).toBeDefined();
      expect(typeExport!.type).toBe('type');
    });

    it('should detect variable exports', () => {
      const names = result.exports.map(e => e.name);
      expect(names).toEqual(expect.arrayContaining([
        'DEFAULT_TIMEOUT', 'MAX_RETRIES',
      ]));
    });

    it('should have no functions or classes', () => {
      expect(result.functions).toHaveLength(0);
      expect(result.classes).toHaveLength(0);
    });
  });
});
