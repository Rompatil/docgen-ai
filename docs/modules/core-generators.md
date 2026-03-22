# Module: core/generators

## Overview

The `core/generators` module contains 8 files and exports 15 public symbols.  Dependencies: types, utils, ai. Used by: core.

## Files

- `src/core/generators/api.ts` — 4 functions
- `src/core/generators/architecture.ts` — 6 functions
- `src/core/generators/functions.ts` — 4 functions
- `src/core/generators/integrations.ts` — 1 functions
- `src/core/generators/modules.ts` — 4 functions
- `src/core/generators/readme.ts` — 3 functions
- `src/core/generators/registry.ts` — 2 functions
- `src/core/generators/setup.ts` — 1 functions

## Public API

- `function` **generateAPIDocs**
- `function` **generateArchitectureDocs**
- `function` **generateFunctionDocs**
- `function` **generateIntegrationsDocs**
- `function` **generateModuleDocs**
- `function` **generateReadme**
- `variable` **generateReadme**
- `variable` **generateArchitectureDocs**
- `variable` **generateModuleDocs**
- `variable` **generateAPIDocs**
- `variable` **generateFunctionDocs**
- `variable` **generateIntegrationsDocs**
- `variable` **generateSetupDocs**
- `function` **runGenerators**
- `function` **generateSetupDocs**

## Key Functions

### `generateAPIDocs(analysis: ProjectAnalysis, config: DocgenConfig)`

**Returns:** `Promise`

Async function `generateAPIDocs(analysis: ProjectAnalysis, config: DocgenConfig)`. Returns `Promise`.

### `generateArchitectureDocs(analysis: ProjectAnalysis, config: DocgenConfig)`

**Returns:** `Promise`

Async function `generateArchitectureDocs(analysis: ProjectAnalysis, config: DocgenConfig)`. Returns `Promise`. ⚠️ High complexity.

### `generateFunctionDocs(analysis: ProjectAnalysis, config: DocgenConfig)`

**Returns:** `Promise`

Async function `generateFunctionDocs(analysis: ProjectAnalysis, config: DocgenConfig)`. Returns `Promise`. ⚠️ High complexity.

### `generateIntegrationsDocs(analysis: ProjectAnalysis, config: DocgenConfig)`

**Returns:** `Promise`

Async function `generateIntegrationsDocs(analysis: ProjectAnalysis, config: DocgenConfig)`. Returns `Promise`. ⚠️ High complexity.

### `generateModuleDocs(analysis: ProjectAnalysis, config: DocgenConfig)`

**Returns:** `Promise`

Async function `generateModuleDocs(analysis: ProjectAnalysis, config: DocgenConfig)`. Returns `Promise`.

### `generateReadme(analysis: ProjectAnalysis, config: DocgenConfig)`

**Returns:** `Promise`

Async function `generateReadme(analysis: ProjectAnalysis, config: DocgenConfig)`. Returns `Promise`. ⚠️ High complexity.

### `runGenerators(analysis: ProjectAnalysis, config: DocgenConfig)`

**Returns:** `Promise`

Async function `runGenerators(analysis: ProjectAnalysis, config: DocgenConfig)`. Returns `Promise`.

### `generateSetupDocs(analysis: ProjectAnalysis, config: DocgenConfig)`

**Returns:** `Promise`

Async function `generateSetupDocs(analysis: ProjectAnalysis, config: DocgenConfig)`. Returns `Promise`. ⚠️ High complexity.

## Dependencies

This module depends on:

- [`types`](./modules/types.md)
- [`utils`](./modules/utils.md)
- [`ai`](./modules/ai.md)

## Used By

- [`core`](./modules/core.md)
