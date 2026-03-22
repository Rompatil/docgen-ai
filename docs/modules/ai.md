# Module: ai

## Overview

The `ai` module contains 1 file and exports 6 public symbols.  Dependencies: types, utils. Used by: core/generators.

## Files

- `src/ai/reasoner.ts` — 8 functions

## Public API

- `function` **summarizeProject**
- `function` **summarizeModule**
- `function` **summarizeFunction**
- `function` **explainArchitecture**
- `function` **staticModuleSummary**
- `function` **staticFunctionSummary**

## Key Functions

### `summarizeProject(analysis: ProjectAnalysis, config: AIConfig)`

**Returns:** `Promise`

Async function `summarizeProject(analysis: ProjectAnalysis, config: AIConfig)`. Returns `Promise`.

### `summarizeModule(module: ModuleInfo, config: AIConfig)`

**Returns:** `Promise`

Async function `summarizeModule(module: ModuleInfo, config: AIConfig)`. Returns `Promise`.

### `summarizeFunction(func: FunctionInfo, config: AIConfig)`

**Returns:** `Promise`

Async function `summarizeFunction(func: FunctionInfo, config: AIConfig)`. Returns `Promise`. ⚠️ High complexity.

### `explainArchitecture(analysis: ProjectAnalysis, config: AIConfig)`

**Returns:** `Promise`

Async function `explainArchitecture(analysis: ProjectAnalysis, config: AIConfig)`. Returns `Promise`.

### `staticModuleSummary(module: ModuleInfo)`

**Returns:** `string`

Function `staticModuleSummary(module: ModuleInfo)`. Returns `string`. ⚠️ High complexity.

### `staticFunctionSummary(func: FunctionInfo)`

**Returns:** `string`

Function `staticFunctionSummary(func: FunctionInfo)`. Returns `string`.

## Dependencies

This module depends on:

- [`types`](./modules/types.md)
- [`utils`](./modules/utils.md)

## Used By

- [`core/generators`](./modules/core-generators.md)
