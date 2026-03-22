/**
 * ============================================================================
 * PYTHON PARSER — Tree-Sitter AST
 * ============================================================================
 *
 * Uses web-tree-sitter (WASM) for real AST parsing of Python files.
 * This replaces the regex-based parser with proper structural analysis.
 *
 * WHY tree-sitter instead of regex?
 * - Regex breaks on multi-line strings, nested parens, edge cases
 * - Tree-sitter gives a real parse tree, same as Python's own `ast` module
 * - Handles decorators, async, type hints, f-strings, walrus operator
 * - Zero false positives from code inside strings or comments
 *
 * ARCHITECTURE:
 * 1. Initialize tree-sitter once (WASM load is async, cached after first call)
 * 2. Parse file → SyntaxTree
 * 3. Walk root children looking for: function_definition, class_definition,
 *    import_statement, import_from_statement, decorated_definition
 * 4. Extract metadata from each node using field names
 * 5. Return the same AnalyzedFile shape as every other parser
 *
 * FALLBACK: If tree-sitter fails to init (missing WASM, old Node, etc.),
 * we fall back to the regex parser automatically.
 */

import * as path from 'path';
import {
  AnalyzedFile, FunctionInfo, ClassInfo, ParameterInfo,
  ImportInfo, ExportInfo, APIEndpoint, CommentInfo, PropertyInfo,
} from '../../types/definitions';
import { hashContent, countLines } from '../../utils/helpers';
import { logger } from '../../utils/logger';

const log = logger.child('PythonTS');

// ─── Tree-Sitter Initialization ──────────────────────────────────────────────

/**
 * We load tree-sitter lazily and cache the parser instance.
 * This avoids async init at module load time.
 */
let parserInstance: any = null;
let initFailed = false;

async function getParser(): Promise<any> {
  if (parserInstance) return parserInstance;
  if (initFailed) return null;

  try {
    const { Parser, Language } = require('web-tree-sitter');
    await Parser.init();

    // Resolve WASM path relative to the package
    const wasmPath = require.resolve('tree-sitter-python/tree-sitter-python.wasm');
    const Python = await Language.load(wasmPath);

    const parser = new Parser();
    parser.setLanguage(Python);
    parserInstance = parser;
    log.info('Tree-sitter Python parser initialized');
    return parser;
  } catch (err: any) {
    log.warn(`Tree-sitter init failed, will use regex fallback: ${err.message}`);
    initFailed = true;
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a Python file using tree-sitter AST.
 * Falls back to regex parser if tree-sitter unavailable.
 */
export async function parsePythonFileAsync(
  filePath: string,
  content: string,
  rootDir: string
): Promise<AnalyzedFile> {
  const parser = await getParser();
  if (!parser) {
    // Fallback to regex parser
    const { parsePythonFile: regexParse } = require('./python-regex');
    return regexParse(filePath, content, rootDir);
  }

  return parseWithTreeSitter(parser, filePath, content, rootDir);
}

/**
 * Synchronous wrapper — uses cached parser if available, else regex fallback.
 * This maintains the same signature as the JS parser for the registry.
 */
export function parsePythonFile(
  filePath: string,
  content: string,
  rootDir: string
): AnalyzedFile {
  if (parserInstance) {
    return parseWithTreeSitter(parserInstance, filePath, content, rootDir);
  }

  // Tree-sitter not ready — use regex fallback.
  // Call parsePythonFileAsync() or warmup() to pre-initialize tree-sitter.
  const { parsePythonFile: regexParse } = require('./python-regex');
  return regexParse(filePath, content, rootDir);
}

// ─── Core Parser ─────────────────────────────────────────────────────────────

function parseWithTreeSitter(
  parser: any,
  filePath: string,
  content: string,
  rootDir: string
): AnalyzedFile {
  const relativePath = path.relative(rootDir, filePath);
  const lines = content.split('\n');
  const tree = parser.parse(content);
  const root = tree.rootNode;

  const result: AnalyzedFile = {
    filePath, relativePath, language: 'python',
    lineCount: countLines(content),
    contentHash: hashContent(content),
    functions: [], classes: [], imports: [], exports: [],
    apiEndpoints: [], comments: [], parseErrors: [],
  };

  // Walk all top-level children
  for (const child of root.children) {
    try {
      switch (child.type) {
        case 'function_definition':
          result.functions.push(extractFunction(child, lines, []));
          break;

        case 'class_definition':
          result.classes.push(extractClass(child, lines));
          break;

        case 'import_statement':
          result.imports.push(extractImport(child));
          break;

        case 'import_from_statement':
          result.imports.push(extractFromImport(child));
          break;

        case 'decorated_definition': {
          const decorators = extractDecorators(child);
          const inner = child.children.find(
            (c: any) => c.type === 'function_definition' || c.type === 'class_definition'
          );

          if (inner?.type === 'function_definition') {
            const func = extractFunction(inner, lines, decorators);
            result.functions.push(func);

            // Check for FastAPI/Flask route decorators
            const endpoint = detectEndpoint(decorators, inner, filePath, lines);
            if (endpoint) result.apiEndpoints.push(endpoint);
          }

          if (inner?.type === 'class_definition') {
            const cls = extractClass(inner, lines);
            cls.decorators = decorators;
            result.classes.push(cls);
          }
          break;
        }

        case 'comment':
          result.comments.push({
            type: 'line',
            text: child.text.replace(/^#\s*/, ''),
            line: child.startPosition.row + 1,
          });
          break;

        case 'expression_statement': {
          // Catch module-level docstrings
          const expr = child.children[0];
          if (expr?.type === 'string') {
            result.comments.push({
              type: 'docstring',
              text: stripQuotes(expr.text),
              line: child.startPosition.row + 1,
            });
          }
          break;
        }
      }
    } catch (err: any) {
      result.parseErrors.push({
        filePath: relativePath,
        line: child.startPosition?.row + 1,
        message: `Node parse error (${child.type}): ${err.message}`,
        severity: 'warning',
      });
    }
  }

  // Build exports from public functions and classes
  result.exports = inferExports(result.functions, result.classes);

  return result;
}

// ─── Function Extraction ─────────────────────────────────────────────────────

function extractFunction(node: any, lines: string[], decorators: string[]): FunctionInfo {
  const name = node.childForFieldName('name')?.text || 'anonymous';
  const paramsNode = node.childForFieldName('parameters');
  const returnNode = node.childForFieldName('return_type');
  const bodyNode = node.childForFieldName('body');

  // Check if first keyword is 'async'
  const isAsync = node.children[0]?.type === 'async' ||
    node.children.some((c: any) => c.type === 'async');

  const startLine = node.startPosition.row + 1;
  const endLine = node.endPosition.row + 1;
  const body = lines.slice(startLine - 1, endLine).join('\n');

  // Extract docstring from body
  const docstring = extractDocstring(bodyNode);

  return {
    name,
    params: extractParams(paramsNode),
    returnType: returnNode ? returnNode.text : undefined,
    isExported: !name.startsWith('_'),
    isAsync,
    startLine,
    endLine,
    complexity: estimateComplexity(bodyNode),
    existingDoc: docstring,
    body: body.length < 2000 ? body : undefined,
    decorators,
  };
}

// ─── Parameter Extraction ────────────────────────────────────────────────────

/**
 * Extract parameters from a parameters node.
 *
 * Tree-sitter parameter nodes can be:
 *   identifier                  → simple name
 *   typed_parameter             → name: Type
 *   default_parameter           → name = value
 *   typed_default_parameter     → name: Type = value
 *   list_splat_pattern          → *args
 *   dictionary_splat_pattern    → **kwargs
 */
function extractParams(paramsNode: any): ParameterInfo[] {
  if (!paramsNode) return [];

  const params: ParameterInfo[] = [];

  for (const child of paramsNode.children) {
    switch (child.type) {
      case 'identifier': {
        // Skip 'self' and 'cls'
        if (child.text === 'self' || child.text === 'cls') continue;
        params.push({ name: child.text, isOptional: false });
        break;
      }

      case 'typed_parameter': {
        const name = child.children.find((c: any) => c.type === 'identifier')?.text;
        if (name === 'self' || name === 'cls') continue;
        const type = child.childForFieldName('type')?.text;
        if (name) params.push({ name, type, isOptional: false });
        break;
      }

      case 'default_parameter': {
        const name = child.childForFieldName('name')?.text;
        const value = child.childForFieldName('value')?.text;
        if (name === 'self' || name === 'cls') continue;
        if (name) params.push({
          name,
          defaultValue: value ? formatDefaultValue(value) : undefined,
          isOptional: true,
        });
        break;
      }

      case 'typed_default_parameter': {
        const name = child.childForFieldName('name')?.text;
        const type = child.childForFieldName('type')?.text;
        const value = child.childForFieldName('value')?.text;
        if (name === 'self' || name === 'cls') continue;
        if (name) params.push({
          name, type,
          defaultValue: value ? formatDefaultValue(value) : undefined,
          isOptional: true,
        });
        break;
      }

      case 'list_splat_pattern': {
        const name = child.children.find((c: any) => c.type === 'identifier')?.text;
        if (name) params.push({ name: `*${name}`, isOptional: true });
        break;
      }

      case 'dictionary_splat_pattern': {
        const name = child.children.find((c: any) => c.type === 'identifier')?.text;
        if (name) params.push({ name: `**${name}`, isOptional: true });
        break;
      }
    }
  }

  return params;
}

function formatDefaultValue(value: string): string {
  // Keep quotes for strings, raw for everything else
  return value;
}

// ─── Class Extraction ────────────────────────────────────────────────────────

function extractClass(node: any, lines: string[]): ClassInfo {
  const name = node.childForFieldName('name')?.text || 'Anonymous';
  const bodyNode = node.childForFieldName('body');
  const superclassNode = node.childForFieldName('superclasses');

  // Extract superclass(es)
  let superClass: string | undefined;
  if (superclassNode) {
    const bases = superclassNode.children
      .filter((c: any) => c.type === 'identifier' || c.type === 'attribute')
      .map((c: any) => c.text);
    superClass = bases[0];
  }

  // Extract methods and properties from class body
  const methods: FunctionInfo[] = [];
  const properties: PropertyInfo[] = [];
  const seenProps = new Set<string>();

  if (bodyNode) {
    for (const member of bodyNode.children) {
      if (member.type === 'function_definition') {
        const method = extractFunction(member, lines, []);
        method.className = name;
        methods.push(method);
        // Extract self.xxx = from method bodies
        extractSelfAssignments(member, properties, seenProps);
      }

      if (member.type === 'decorated_definition') {
        const decorators = extractDecorators(member);
        const funcNode = member.children.find((c: any) => c.type === 'function_definition');
        if (funcNode) {
          const method = extractFunction(funcNode, lines, decorators);
          method.className = name;
          methods.push(method);
          extractSelfAssignments(funcNode, properties, seenProps);
        }
      }

      // Class-level assignments: field: Type = value
      if (member.type === 'expression_statement') {
        const assign = member.children[0];
        if (assign?.type === 'assignment') {
          const left = assign.childForFieldName('left');
          if (left?.type === 'identifier' && !seenProps.has(left.text)) {
            seenProps.add(left.text);
            const typeNode = assign.childForFieldName('type');
            properties.push({
              name: left.text,
              type: typeNode?.text,
              isStatic: false,
              isPrivate: left.text.startsWith('_'),
            });
          }
        }
      }
    }
  }

  const docstring = extractDocstring(bodyNode);

  return {
    name,
    superClass,
    implements: [],
    methods,
    properties,
    isExported: !name.startsWith('_'),
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    existingDoc: docstring,
    decorators: [],
  };
}

/**
 * Walk a function body to find self.xxx = assignments.
 * This is how Python declares instance properties.
 */
function extractSelfAssignments(
  funcNode: any,
  properties: PropertyInfo[],
  seen: Set<string>
): void {
  const walk = (node: any) => {
    if (!node) return;
    if (node.type === 'assignment') {
      const left = node.childForFieldName('left');
      if (left?.type === 'attribute') {
        const obj = left.childForFieldName('object');
        const attr = left.childForFieldName('attribute');
        if (obj?.text === 'self' && attr && !seen.has(attr.text)) {
          seen.add(attr.text);
          properties.push({
            name: attr.text,
            isStatic: false,
            isPrivate: attr.text.startsWith('_'),
          });
        }
      }
    }
    for (const child of node.children || []) {
      walk(child);
    }
  };
  walk(funcNode.childForFieldName('body'));
}

// ─── Import Extraction ───────────────────────────────────────────────────────

function extractImport(node: any): ImportInfo {
  // import os / import os as alias
  const names = node.children
    .filter((c: any) => c.type === 'dotted_name' || c.type === 'aliased_import')
    .map((c: any) => {
      if (c.type === 'aliased_import') {
        return c.childForFieldName('name')?.text || c.text;
      }
      return c.text;
    });

  return {
    source: names[0] || node.text.replace('import ', '').trim(),
    specifiers: [],
    isRelative: false,
    defaultImport: names[0],
  };
}

function extractFromImport(node: any): ImportInfo {
  const moduleNode = node.childForFieldName('module_name');
  const source = moduleNode?.text || '';

  const specifiers: string[] = [];
  for (const child of node.children) {
    if (child.type === 'dotted_name' && child !== moduleNode) {
      specifiers.push(child.text);
    }
    if (child.type === 'aliased_import') {
      specifiers.push(child.childForFieldName('name')?.text || child.text);
    }
    // from x import a, b, c — the names are in an import_list or directly
    if (child.type === 'import_list') {
      for (const item of child.children) {
        if (item.type === 'dotted_name' || item.type === 'identifier') {
          specifiers.push(item.text);
        }
        if (item.type === 'aliased_import') {
          specifiers.push(item.childForFieldName('name')?.text || item.text);
        }
      }
    }
  }

  return {
    source,
    specifiers: specifiers.filter(s => s && s !== ',' && s !== '(' && s !== ')'),
    isRelative: source.startsWith('.'),
  };
}

// ─── Decorator Extraction ────────────────────────────────────────────────────

function extractDecorators(decoratedNode: any): string[] {
  return decoratedNode.children
    .filter((c: any) => c.type === 'decorator')
    .map((c: any) => c.text);
}

// ─── Endpoint Detection ──────────────────────────────────────────────────────

/**
 * Detect FastAPI/Flask route endpoints from decorators.
 *
 * Patterns:
 *   @router.get("/path")      — FastAPI
 *   @app.post("/path")        — FastAPI/Flask
 *   @app.route("/path", ...)  — Flask
 */
function detectEndpoint(
  decorators: string[],
  funcNode: any,
  filePath: string,
  lines: string[]
): APIEndpoint | null {
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

  for (const dec of decorators) {
    // FastAPI pattern: @router.get("/path") or @app.post("/path")
    for (const method of httpMethods) {
      const re = new RegExp(`@\\w+\\.${method}\\(["']([^"']+)["']`);
      const match = dec.match(re);
      if (match) {
        const handler = funcNode.childForFieldName('name')?.text || 'unknown';
        const paramsText = funcNode.childForFieldName('parameters')?.text || '';

        const requiresAuth = paramsText.includes('current_user') ||
          (paramsText.includes('Depends') && paramsText.includes('auth'));

        return {
          method: method.toUpperCase(),
          path: match[1],
          handler,
          middleware: [],
          requiresAuth,
          filePath,
          line: funcNode.startPosition.row + 1,
        };
      }
    }

    // Flask pattern: @app.route("/path", methods=["GET"])
    const flaskMatch = dec.match(/@\w+\.route\(["']([^"']+)["'](?:.*methods=\[([^\]]+)\])?/);
    if (flaskMatch) {
      const handler = funcNode.childForFieldName('name')?.text || 'unknown';
      const methods = flaskMatch[2]
        ? flaskMatch[2].replace(/["'\s]/g, '').split(',')
        : ['GET'];

      // Return first method; caller can expand if needed
      return {
        method: methods[0].toUpperCase(),
        path: flaskMatch[1],
        handler,
        middleware: [],
        requiresAuth: false,
        filePath,
        line: funcNode.startPosition.row + 1,
      };
    }
  }

  return null;
}

// ─── Docstring Extraction ────────────────────────────────────────────────────

function extractDocstring(bodyNode: any): string | undefined {
  if (!bodyNode) return undefined;

  // First statement in body — if it's a string expression, it's a docstring
  const first = bodyNode.children.find(
    (c: any) => c.type === 'expression_statement'
  );
  if (!first) return undefined;

  const expr = first.children[0];
  if (expr?.type === 'string') {
    return stripQuotes(expr.text);
  }
  return undefined;
}

function stripQuotes(text: string): string {
  // Remove triple quotes (""" or ''')
  if (text.startsWith('"""') && text.endsWith('"""')) {
    return text.slice(3, -3).trim();
  }
  if (text.startsWith("'''") && text.endsWith("'''")) {
    return text.slice(3, -3).trim();
  }
  // Single quotes
  if ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).trim();
  }
  return text.trim();
}

// ─── Complexity Estimation ───────────────────────────────────────────────────

/**
 * Estimate cyclomatic complexity by counting branching nodes.
 * Tree-sitter makes this trivial — just walk and count.
 */
function estimateComplexity(bodyNode: any): number {
  if (!bodyNode) return 1;

  let complexity = 1;
  const branchTypes = new Set([
    'if_statement', 'elif_clause', 'for_statement',
    'while_statement', 'except_clause', 'with_statement',
    'conditional_expression',  // ternary: x if cond else y
    'boolean_operator',        // and / or
    'case_clause',             // match/case (Python 3.10+)
  ]);

  const walk = (node: any) => {
    if (branchTypes.has(node.type)) complexity++;
    for (const child of node.children || []) {
      walk(child);
    }
  };
  walk(bodyNode);

  return complexity;
}

// ─── Export Inference ─────────────────────────────────────────────────────────

function inferExports(functions: FunctionInfo[], classes: ClassInfo[]): ExportInfo[] {
  return [
    ...functions
      .filter(f => !f.name.startsWith('_'))
      .map(f => ({ name: f.name, type: 'function' as const, isDefault: false })),
    ...classes
      .filter(c => !c.name.startsWith('_'))
      .map(c => ({ name: c.name, type: 'class' as const, isDefault: false })),
  ];
}
