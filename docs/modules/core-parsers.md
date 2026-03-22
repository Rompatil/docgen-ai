# Module: core/parsers

## Overview

The `core/parsers` module contains 3 files and exports 7 public symbols.  Dependencies: types, utils. Used by: core/analyzers.

## Files

- `src/core/parsers/javascript.ts` — 14 functions
- `src/core/parsers/python.ts` — 11 functions
- `src/core/parsers/registry.ts` — 3 functions

## Public API

- `function` **parseJavaScriptFile**
- `function` **parsePythonFile**
- `function` **parseFile**
- `function` **canParse**
- `function` **getSupportedLanguages**
- `variable` **parseJavaScriptFile**
- `variable` **parsePythonFile**

## Key Functions

### `parseJavaScriptFile(filePath: string, content: string, rootDir: string)`

**Returns:** `AnalyzedFile`

Function `parseJavaScriptFile(filePath: string, content: string, rootDir: string)`. Returns `AnalyzedFile`. ⚠️ High complexity.

### `parsePythonFile(filePath: string, content: string, rootDir: string)`

**Returns:** `AnalyzedFile`

Function `parsePythonFile(filePath: string, content: string, rootDir: string)`. Returns `AnalyzedFile`.

### `parseFile(filePath: string, rootDir: string)`

**Returns:** `unknown`

Function `parseFile(filePath: string, rootDir: string)`. Returns `unknown`.

### `canParse(filePath: string)`

**Returns:** `boolean`

Function `canParse(filePath: string)`. Returns `boolean`.

### `getSupportedLanguages()`

**Returns:** `array`

Function `getSupportedLanguages()`. Returns `array`.

## Dependencies

This module depends on:

- [`types`](./modules/types.md)
- [`utils`](./modules/utils.md)

## Used By

- [`core/analyzers`](./modules/core-analyzers.md)
