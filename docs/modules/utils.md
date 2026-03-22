# Module: utils

> **Role:** utility

## Overview

The `utils` module contains 2 files and exports 18 public symbols. Serves as a **utility** layer. Dependencies: none. Used by: ai, cli, core/analyzers, core/cache, core/generators, core/parsers, core.

## Files

- `src/utils/helpers.ts` — 13 functions
- `src/utils/logger.ts` — 3 functions, 1 classes

## Public API

- `function` **findFiles**
- `function` **hashContent**
- `function` **hashFile**
- `function` **detectLanguage**
- `function` **readFileContent**
- `function` **fileExists**
- `function` **ensureDir**
- `function` **inferModuleName**
- `function` **countLines**
- `function` **truncate**
- `function` **detectFrameworks**
- `function` **parsePackageJson**
- `class` **Logger**
- `variable` **logger**
- `default` **logger** (default)
- `function` **setLogLevel**
- `function` **createModuleLogger**
- `function` **enableFileLogging**

## Key Functions

### `findFiles(rootDir: string, includePatterns: array, excludePatterns: array)`

**Returns:** `array`

Function `findFiles(rootDir: string, includePatterns: array, excludePatterns: array)`. Returns `array`. ⚠️ High complexity.

### `hashContent(content: string)`

**Returns:** `string`

Function `hashContent(content: string)`. Returns `string`.

### `hashFile(filePath: string)`

**Returns:** `string`

Function `hashFile(filePath: string)`. Returns `string`.

### `detectLanguage(filePath: string)`

**Returns:** `string`

Function `detectLanguage(filePath: string)`. Returns `string`.

### `readFileContent(filePath: string)`

**Returns:** `string`

Function `readFileContent(filePath: string)`. Returns `string`.

### `fileExists(filePath: string)`

**Returns:** `boolean`

Function `fileExists(filePath: string)`. Returns `boolean`.

### `ensureDir(dirPath: string)`

**Returns:** `void`

Function `ensureDir(dirPath: string)`. Returns `void`.

### `inferModuleName(relativePath: string, depth)`

**Returns:** `string`

Function `inferModuleName(relativePath: string, depth)`. Returns `string`.

### `countLines(content: string)`

**Returns:** `number`

Function `countLines(content: string)`. Returns `number`.

### `truncate(text: string, maxLength: number)`

**Returns:** `string`

Function `truncate(text: string, maxLength: number)`. Returns `string`.

### `detectFrameworks(rootDir: string)`

**Returns:** `Array`

Function `detectFrameworks(rootDir: string)`. Returns `Array`. ⚠️ High complexity.

### `parsePackageJson(rootDir: string)`

**Returns:** `unknown`

Function `parsePackageJson(rootDir: string)`. Returns `unknown`.

### `setLogLevel(level: string)`

**Returns:** `void`

Function `setLogLevel(level: string)`. Returns `void`.

### `createModuleLogger(moduleName: string)`

**Returns:** `Logger`

Function `createModuleLogger(moduleName: string)`. Returns `Logger`.

### `enableFileLogging(outputDir: string)`

**Returns:** `void`

Function `enableFileLogging(outputDir: string)`. Returns `void`.

## Classes

### `Logger`

**Methods:**

- 🔓 `constructor(level, prefix)`
- 🔓 `shouldLog(level)` → `boolean`
- 🔓 `write(level, message, context)` → `void`
- 🔓 `debug(msg, ctx)`
- 🔓 `info(msg, ctx)`
- 🔓 `warn(msg, ctx)`
- 🔓 `error(msg, ctx)`
- 🔓 `child(prefix)` → `Logger`
- 🔓 `setLevel(level)`
- 🔓 `enableFileLogging(dir)`

## Used By

- [`ai`](./modules/ai.md)
- [`cli`](./modules/cli.md)
- [`core/analyzers`](./modules/core-analyzers.md)
- [`core/cache`](./modules/core-cache.md)
- [`core/generators`](./modules/core-generators.md)
- [`core/parsers`](./modules/core-parsers.md)
- [`core`](./modules/core.md)
