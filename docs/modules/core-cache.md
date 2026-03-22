# Module: core/cache

## Overview

The `core/cache` module contains 1 file and exports 1 public symbol.  Dependencies: types, utils. Used by: core/analyzers.

## Files

- `src/core/cache/file-cache.ts` — 1 classes

## Public API

- `class` **AnalysisCache**

## Classes

### `AnalysisCache`

**Methods:**

- 🔓 `constructor(config, projectRoot)`
- 🔓 `get(contentHash)` → `unknown`
- 🔓 `set(contentHash, result)` → `void`
- 🔓 `clear()` → `void`
- 🔓 `getStats()`

## Dependencies

This module depends on:

- [`types`](./modules/types.md)
- [`utils`](./modules/utils.md)

## Used By

- [`core/analyzers`](./modules/core-analyzers.md)
