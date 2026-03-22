# Module: core

## Overview

The `core` module contains 1 file and exports 2 public symbols.  Dependencies: types, core/analyzers, core/generators, utils. Used by: cli.

## Files

- `src/core/pipeline.ts` — 2 functions

## Public API

- `function` **runPipeline**
- `function` **runAnalysisOnly**

## Key Functions

### `runPipeline(config: DocgenConfig)`

**Returns:** `Promise`

Async function `runPipeline(config: DocgenConfig)`. Returns `Promise`. ⚠️ High complexity.

### `runAnalysisOnly(config: DocgenConfig)`

**Returns:** `Promise`

Async function `runAnalysisOnly(config: DocgenConfig)`. Returns `Promise`.

## Dependencies

This module depends on:

- [`types`](./modules/types.md)
- [`core/analyzers`](./modules/core-analyzers.md)
- [`core/generators`](./modules/core-generators.md)
- [`utils`](./modules/utils.md)

## Used By

- [`cli`](./modules/cli.md)
