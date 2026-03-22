/**
 * ============================================================================
 * PYTHON PARSER (Regex-based for Node.js environment)
 * ============================================================================
 *
 * Extracts functions, classes, imports, and FastAPI/Flask endpoints from Python.
 * Uses pattern matching since we can't use Python's ast module from Node.js.
 */

import * as path from 'path';
import {
  AnalyzedFile, FunctionInfo, ClassInfo, ParameterInfo,
  ImportInfo, ExportInfo, APIEndpoint,
} from '../../types/definitions';
import { hashContent, countLines } from '../../utils/helpers';

export function parsePythonFile(
  filePath: string,
  content: string,
  rootDir: string
): AnalyzedFile {
  const relativePath = path.relative(rootDir, filePath);
  const lines = content.split('\n');

  const result: AnalyzedFile = {
    filePath, relativePath, language: 'python',
    lineCount: countLines(content),
    contentHash: hashContent(content),
    functions: [], classes: [], imports: [], exports: [],
    apiEndpoints: [], comments: [], parseErrors: [],
  };

  try {
    result.functions = extractFunctions(lines, content);
    result.classes = extractClasses(lines, content);
    result.imports = extractImports(lines);
    result.exports = inferExports(result.functions, result.classes);
    result.apiEndpoints = detectEndpoints(lines, filePath);
    result.comments = lines
      .map((line, i) => ({ line, idx: i }))
      .filter(({ line }) => line.trim().startsWith('#'))
      .map(({ line, idx }) => ({
        type: 'line' as const,
        text: line.trim().substring(1).trim(),
        line: idx + 1,
      }));
  } catch (err: any) {
    result.parseErrors.push({ filePath: relativePath, message: err.message, severity: 'warning' });
  }

  return result;
}

// ─── Functions ───────────────────────────────────────────────────────────────

function extractFunctions(lines: string[], _content: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];

  for (let i = 0; i < lines.length; i++) {
    const defMatch = lines[i].match(/^(\s*)(async\s+)?def\s+(\w+)\(/);
    if (!defMatch) continue;

    // Skip indented defs (class methods — captured with their class)
    if (defMatch[1].length > 0) continue;

    const isAsync = !!defMatch[2];
    const name = defMatch[3];

    // Collect the full signature across lines by tracking paren depth
    let depth = 0;
    const sigLines: string[] = [];
    for (let j = i; j < lines.length; j++) {
      sigLines.push(lines[j]);
      for (const ch of lines[j]) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
      }
      if (depth <= 0) break;
    }

    const fullSig = sigLines.join(' ');

    // Extract params between outer parens using depth tracking
    const openIdx = fullSig.indexOf('(');
    let closeIdx = -1, d = 0;
    for (let k = openIdx; k < fullSig.length; k++) {
      if (fullSig[k] === '(') d++;
      else if (fullSig[k] === ')') { d--; if (d === 0) { closeIdx = k; break; } }
    }

    const paramsStr = closeIdx >= 0 ? fullSig.substring(openIdx + 1, closeIdx) : '';
    const afterClose = closeIdx >= 0 ? fullSig.substring(closeIdx + 1) : '';
    const retMatch = afterClose.match(/\s*->\s*(.+?)\s*:/);
    const returnType = retMatch?.[1].trim();

    const startLine = i + 1;
    const endLine = findBlockEnd(lines, i);
    const decorators = getDecorators(lines, i);
    const docstring = getDocstring(lines, startLine);
    const body = lines.slice(i, endLine).join('\n');

    functions.push({
      name,
      params: parseParams(paramsStr),
      returnType: returnType || undefined,
      isExported: !name.startsWith('_'),
      isAsync, startLine, endLine,
      complexity: estimateComplexity(body),
      existingDoc: docstring,
      body: body.length < 2000 ? body : undefined,
      decorators,
    });
  }

  return functions;
}

// ─── Classes ─────────────────────────────────────────────────────────────────

function extractClasses(lines: string[], content: string): ClassInfo[] {
  const classes: ClassInfo[] = [];
  const re = /^class\s+(\w+)(?:\(([^)]*)\))?\s*:/gm;
  let match;

  while ((match = re.exec(content)) !== null) {
    const name = match[1];
    const bases = match[2]?.split(',').map(b => b.trim()).filter(Boolean) || [];
    const startLine = content.substring(0, match.index).split('\n').length;
    const endLine = findBlockEnd(lines, startLine - 1);
    const classBody = lines.slice(startLine, endLine).join('\n');

    // Extract methods
    const methods: FunctionInfo[] = [];
    const methodRe = /^\s+(async\s+)?def\s+(\w+)\(([^)]*)\)(?:\s*->\s*(.+))?\s*:/gm;
    let mMatch;
    while ((mMatch = methodRe.exec(classBody)) !== null) {
      const mName = mMatch[2];
      const mParams = parseParams(mMatch[3]).filter(p => p.name !== 'self' && p.name !== 'cls');
      methods.push({
        name: mName, className: name,
        params: mParams,
        returnType: mMatch[4]?.trim() || undefined,
        isExported: !mName.startsWith('_'),
        isAsync: !!mMatch[1],
        startLine: startLine + classBody.substring(0, mMatch.index).split('\n').length,
        endLine: startLine + classBody.substring(0, mMatch.index).split('\n').length + 5,
        complexity: 1, decorators: [],
      });
    }

    // Extract properties (self.xxx = ...)
    const props: Array<{ name: string; type?: string; isStatic: boolean; isPrivate: boolean }> = [];
    const propRe = /self\.(\w+)\s*(?::\s*(\w+))?\s*=/g;
    let pMatch;
    const seen = new Set<string>();
    while ((pMatch = propRe.exec(classBody)) !== null) {
      if (!seen.has(pMatch[1])) {
        seen.add(pMatch[1]);
        props.push({ name: pMatch[1], type: pMatch[2], isStatic: false, isPrivate: pMatch[1].startsWith('_') });
      }
    }

    classes.push({
      name,
      superClass: bases[0] || undefined,
      implements: [],
      methods, properties: props,
      isExported: !name.startsWith('_'),
      startLine, endLine,
      existingDoc: getDocstring(lines, startLine),
      decorators: getDecorators(lines, startLine - 1),
    });
  }

  return classes;
}

// ─── Imports ─────────────────────────────────────────────────────────────────

function extractImports(lines: string[]): ImportInfo[] {
  const imports: ImportInfo[] = [];
  for (const line of lines) {
    const t = line.trim();
    const fromMatch = t.match(/^from\s+([\w.]+)\s+import\s+(.+)/);
    if (fromMatch) {
      imports.push({
        source: fromMatch[1],
        specifiers: fromMatch[2].split(',').map(s => s.trim().split(/\s+as\s+/)[0]),
        isRelative: fromMatch[1].startsWith('.'),
      });
      continue;
    }
    const impMatch = t.match(/^import\s+([\w.]+)(?:\s+as\s+(\w+))?/);
    if (impMatch) {
      imports.push({
        source: impMatch[1], specifiers: [],
        isRelative: false, defaultImport: impMatch[2] || impMatch[1],
      });
    }
  }
  return imports;
}

// ─── API Endpoints ───────────────────────────────────────────────────────────

function detectEndpoints(lines: string[], filePath: string): APIEndpoint[] {
  const endpoints: APIEndpoint[] = [];
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    for (const method of httpMethods) {
      const re = new RegExp(`@\\w+\\.${method}\\(["']([^"']+)["']`);
      const m = line.match(re);
      if (m) {
        let handler = 'unknown';
        for (let j = i + 1; j < lines.length; j++) {
          const fm = lines[j].match(/(?:async\s+)?def\s+(\w+)/);
          if (fm) { handler = fm[1]; break; }
          if (!lines[j].trim().startsWith('@')) break;
        }
        const requiresAuth = lines.slice(i, Math.min(i + 5, lines.length))
          .some(l => l.includes('Depends') && (l.includes('auth') || l.includes('current_user')));
        endpoints.push({
          method: method.toUpperCase(), path: m[1],
          handler, middleware: [], requiresAuth,
          filePath, line: i + 1,
        });
      }
    }

    // Flask @app.route
    const flaskMatch = line.match(/@\w+\.route\(["']([^"']+)["'](?:.*methods=\[([^\]]+)\])?/);
    if (flaskMatch) {
      const methods = flaskMatch[2] ? flaskMatch[2].replace(/["'\s]/g, '').split(',') : ['GET'];
      let handler = 'unknown';
      for (let j = i + 1; j < lines.length; j++) {
        const fm = lines[j].match(/def\s+(\w+)/);
        if (fm) { handler = fm[1]; break; }
      }
      for (const m of methods) {
        endpoints.push({
          method: m.toUpperCase(), path: flaskMatch[1],
          handler, middleware: [], requiresAuth: false,
          filePath, line: i + 1,
        });
      }
    }
  }
  return endpoints;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseParams(str: string): ParameterInfo[] {
  if (!str.trim()) return [];
  return str.split(',').map(p => {
    const m = p.trim().match(/^(\*{0,2}\w+)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?$/);
    if (m) return { name: m[1], type: m[2]?.trim(), defaultValue: m[3]?.trim(), isOptional: !!m[3] };
    return { name: p.trim(), isOptional: false };
  });
}

function findBlockEnd(lines: string[], startIdx: number): number {
  const baseIndent = (lines[startIdx]?.match(/^(\s*)/)?.[1].length) || 0;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const indent = (lines[i].match(/^(\s*)/)?.[1].length) || 0;
    if (indent <= baseIndent && lines[i].trim() !== '') return i;
  }
  return lines.length;
}

function getDocstring(lines: string[], startLine: number): string | undefined {
  for (let i = startLine; i < Math.min(startLine + 3, lines.length); i++) {
    const line = lines[i].trim();
    const quote = line.startsWith('"""') ? '"""' : line.startsWith("'''") ? "'''" : null;
    if (!quote) continue;
    if (line.endsWith(quote) && line.length > 6) return line.slice(3, -3).trim();
    const docLines = [line.slice(3)];
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim().endsWith(quote)) {
        docLines.push(lines[j].trim().slice(0, -3));
        return docLines.join('\n').trim();
      }
      docLines.push(lines[j].trim());
    }
  }
  return undefined;
}

function getDecorators(lines: string[], funcLineIdx: number): string[] {
  const decs: string[] = [];
  for (let i = funcLineIdx - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('@')) decs.unshift(line);
    else if (line !== '' && !line.startsWith('#')) break;
  }
  return decs;
}

function inferExports(functions: FunctionInfo[], classes: ClassInfo[]): ExportInfo[] {
  return [
    ...functions.filter(f => !f.name.startsWith('_')).map(f => ({ name: f.name, type: 'function' as const, isDefault: false })),
    ...classes.filter(c => !c.name.startsWith('_')).map(c => ({ name: c.name, type: 'class' as const, isDefault: false })),
  ];
}

function estimateComplexity(code: string): number {
  let c = 1;
  for (const kw of ['if ', 'elif ', 'for ', 'while ', 'except ', 'and ', 'or ']) {
    const matches = code.match(new RegExp(`\\b${kw.trim()}\\b`, 'g'));
    if (matches) c += matches.length;
  }
  return c;
}
