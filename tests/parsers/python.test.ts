import * as path from 'path';
import * as fs from 'fs';
import { parsePythonFile } from '../../src/core/parsers/python';

const FIXTURES = path.join(__dirname, '..', '__fixtures__');

function parseFixture(subpath: string) {
  const filePath = path.join(FIXTURES, subpath);
  const content = fs.readFileSync(filePath, 'utf-8');
  return parsePythonFile(filePath, content, FIXTURES);
}

describe('Python Parser', () => {

  // ── FastAPI fixture ──────────────────────────────────────────────────────
  describe('product-api.py', () => {
    const result = parseFixture('python/product-api.py');

    it('should match snapshot', () => {
      expect(result).toMatchSnapshot();
    });

    it('should detect language as python', () => {
      expect(result.language).toBe('python');
    });

    it('should have no parse errors', () => {
      expect(result.parseErrors).toHaveLength(0);
    });

    // ── Functions ────────────────────────────────────────────────
    it('should extract top-level functions', () => {
      const names = result.functions.map(f => f.name);
      expect(names).toEqual(expect.arrayContaining([
        'calculate_discount', 'format_price',
      ]));
    });

    it('should extract function parameters with type hints', () => {
      const fn = result.functions.find(f => f.name === 'calculate_discount');
      expect(fn).toBeDefined();
      expect(fn!.params.some(p => p.name === 'price' && p.type === 'float')).toBe(true);
      expect(fn!.params.some(p => p.name === 'discount_percent' && p.type === 'float')).toBe(true);
    });

    it('should extract return type annotations', () => {
      const fn = result.functions.find(f => f.name === 'calculate_discount');
      expect(fn!.returnType).toBe('float');
    });

    it('should extract default parameter values', () => {
      const fn = result.functions.find(f => f.name === 'format_price');
      const currency = fn!.params.find(p => p.name === 'currency');
      expect(currency).toBeDefined();
      expect(currency!.defaultValue).toBe('"USD"');
      expect(currency!.isOptional).toBe(true);
    });

    it('should extract docstrings', () => {
      const fn = result.functions.find(f => f.name === 'calculate_discount');
      expect(fn?.existingDoc).toBeDefined();
      expect(fn!.existingDoc).toContain('percentage discount');
    });

    // ── Classes ─────────────────────────────────────────────────
    it('should extract the InventoryManager class', () => {
      const cls = result.classes.find(c => c.name === 'InventoryManager');
      expect(cls).toBeDefined();
    });

    it('should extract class docstring', () => {
      const cls = result.classes.find(c => c.name === 'InventoryManager');
      expect(cls!.existingDoc).toBeDefined();
      expect(cls!.existingDoc).toContain('inventory');
    });

    it('should extract class methods excluding self param', () => {
      const cls = result.classes.find(c => c.name === 'InventoryManager');
      const methodNames = cls!.methods.map(m => m.name);
      expect(methodNames).toEqual(expect.arrayContaining([
        '__init__', 'check_stock', 'restock',
        '_should_reorder', 'get_low_stock_products',
      ]));
      // self should be filtered from params
      for (const method of cls!.methods) {
        expect(method.params.some(p => p.name === 'self')).toBe(false);
      }
    });

    it('should detect async methods', () => {
      const cls = result.classes.find(c => c.name === 'InventoryManager');
      const checkStock = cls!.methods.find(m => m.name === 'check_stock');
      expect(checkStock!.isAsync).toBe(true);

      const shouldReorder = cls!.methods.find(m => m.name === '_should_reorder');
      expect(shouldReorder!.isAsync).toBe(false);
    });

    it('should detect private methods by underscore prefix', () => {
      const cls = result.classes.find(c => c.name === 'InventoryManager');
      const shouldReorder = cls!.methods.find(m => m.name === '_should_reorder');
      expect(shouldReorder!.isExported).toBe(false);
    });

    it('should extract class properties from self assignments', () => {
      const cls = result.classes.find(c => c.name === 'InventoryManager');
      const propNames = cls!.properties.map(p => p.name);
      expect(propNames).toEqual(expect.arrayContaining([
        '_db', '_warehouse_url', '_reorder_threshold',
      ]));
    });

    it('should mark _prefixed properties as private', () => {
      const cls = result.classes.find(c => c.name === 'InventoryManager');
      const db = cls!.properties.find(p => p.name === '_db');
      expect(db!.isPrivate).toBe(true);
    });

    // ── Pydantic classes ────────────────────────────────────────
    it('should extract Pydantic model classes', () => {
      const classNames = result.classes.map(c => c.name);
      expect(classNames).toEqual(expect.arrayContaining([
        'ProductCreate', 'ProductUpdate', 'ProductResponse',
      ]));
    });

    it('should detect superclass on Pydantic models', () => {
      const cls = result.classes.find(c => c.name === 'ProductCreate');
      expect(cls!.superClass).toBe('BaseModel');
    });

    // ── Imports ──────────────────────────────────────────────────
    it('should extract from...import statements', () => {
      const fastapi = result.imports.find(i => i.source === 'fastapi');
      expect(fastapi).toBeDefined();
      expect(fastapi!.specifiers).toEqual(expect.arrayContaining([
        'APIRouter', 'Depends', 'HTTPException', 'Query',
      ]));
    });

    it('should extract plain import statements', () => {
      const os = result.imports.find(i => i.source === 'os');
      expect(os).toBeDefined();
    });

    it('should detect relative imports', () => {
      const relative = result.imports.filter(i => i.isRelative);
      expect(relative.length).toBeGreaterThan(0);
      expect(relative.some(i => i.source === '.database')).toBe(true);
    });

    // ── FastAPI Endpoints ───────────────────────────────────────
    it('should detect FastAPI route decorators', () => {
      expect(result.apiEndpoints.length).toBeGreaterThanOrEqual(7);
    });

    it('should detect correct HTTP methods', () => {
      const methods = result.apiEndpoints.map(e => e.method);
      expect(methods).toEqual(expect.arrayContaining([
        'GET', 'POST', 'PUT', 'DELETE',
      ]));
    });

    it('should detect route paths', () => {
      const paths = result.apiEndpoints.map(e => e.path);
      expect(paths).toContain('/');
      expect(paths).toContain('/{product_id}');
      expect(paths).toContain('/{product_id}/stock');
      expect(paths).toContain('/{product_id}/restock');
    });

    it('should detect auth-required endpoints via Depends(get_current_user)', () => {
      const createEndpoint = result.apiEndpoints.find(
        e => e.method === 'POST' && e.path === '/'
      );
      expect(createEndpoint?.requiresAuth).toBe(true);

      const listEndpoint = result.apiEndpoints.find(
        e => e.method === 'GET' && e.path === '/'
      );
      expect(listEndpoint?.requiresAuth).toBe(false);
    });

    it('should link endpoints to handler function names', () => {
      const ep = result.apiEndpoints.find(e => e.path === '/{product_id}/stock');
      expect(ep?.handler).toBe('check_stock');
    });

    // ── Exports (Python convention) ─────────────────────────────
    it('should export public functions and classes', () => {
      const names = result.exports.map(e => e.name);
      expect(names).toContain('calculate_discount');
      expect(names).toContain('format_price');
      expect(names).toContain('InventoryManager');
      expect(names).toContain('ProductCreate');
    });

    it('should not export _prefixed classes', () => {
      // _InternalHelper shouldn't be in the fixture, but if it were
      // the parser should skip it
      const names = result.exports.map(e => e.name);
      expect(names).not.toContain('_InternalHelper');
    });
  });

  // ── Pure utility file ────────────────────────────────────────────────────
  describe('utils.py', () => {
    const result = parseFixture('python/utils.py');

    it('should match snapshot', () => {
      expect(result).toMatchSnapshot();
    });

    it('should extract all top-level functions', () => {
      const names = result.functions.map(f => f.name);
      expect(names).toEqual(expect.arrayContaining([
        'slugify', 'truncate', 'chunk_list',
      ]));
    });

    it('should extract the TextProcessor class', () => {
      const cls = result.classes.find(c => c.name === 'TextProcessor');
      expect(cls).toBeDefined();
      const methods = cls!.methods.map(m => m.name);
      expect(methods).toEqual(expect.arrayContaining([
        '__init__', 'clean', 'extract_emails', 'word_count',
      ]));
    });

    it('should detect the private _InternalHelper class', () => {
      const cls = result.classes.find(c => c.name === '_InternalHelper');
      expect(cls).toBeDefined();
      expect(cls!.isExported).toBe(false);
    });

    it('should not export _InternalHelper', () => {
      const names = result.exports.map(e => e.name);
      expect(names).not.toContain('_InternalHelper');
      expect(names).toContain('TextProcessor');
    });

    it('should have no API endpoints', () => {
      expect(result.apiEndpoints).toHaveLength(0);
    });

    it('should extract docstrings', () => {
      const slugify = result.functions.find(f => f.name === 'slugify');
      expect(slugify?.existingDoc).toContain('URL-friendly slug');
    });

    it('should detect default params', () => {
      const slugify = result.functions.find(f => f.name === 'slugify');
      const sep = slugify!.params.find(p => p.name === 'separator');
      expect(sep!.defaultValue).toBe('"-"');
      expect(sep!.isOptional).toBe(true);
    });
  });
});
