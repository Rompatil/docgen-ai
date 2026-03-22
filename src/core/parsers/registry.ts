/**
 * Parser Registry — routes files to the correct language parser.
 */

import { AnalyzedFile } from '../../types/definitions';
import { parseJavaScriptFile } from './javascript';
import { parsePythonFile } from './python';
import { detectLanguage, readFileContent } from '../../utils/helpers';
import { logger } from '../../utils/logger';

const log = logger.child('Parser');

const PARSERS: Record<string, (filePath: string, content: string, rootDir: string) => AnalyzedFile> = {
  javascript: parseJavaScriptFile,
  typescript: parseJavaScriptFile,
  python: parsePythonFile,
};

export function parseFile(filePath: string, rootDir: string): AnalyzedFile | null {
  const language = detectLanguage(filePath);
  const parser = PARSERS[language];
  if (!parser) { log.debug(`No parser for: ${language}`, { filePath }); return null; }
  try {
    return parser(filePath, readFileContent(filePath), rootDir);
  } catch (err: any) {
    log.error(`Parse failed: ${filePath}`, { error: err.message });
    return null;
  }
}

export function canParse(filePath: string): boolean {
  return detectLanguage(filePath) in PARSERS;
}

export function getSupportedLanguages(): string[] {
  return Object.keys(PARSERS);
}

export { parseJavaScriptFile } from './javascript';
export { parsePythonFile, parsePythonFileAsync } from './python';

/**
 * Pre-initialize tree-sitter for Python (call once at startup).
 * After this, parsePythonFile uses tree-sitter synchronously.
 */
export async function warmup(): Promise<void> {
  const { parsePythonFileAsync } = require('./python');
  // Parse a trivial file to trigger WASM loading
  await parsePythonFileAsync('/dev/null', 'pass\n', '/');
}
