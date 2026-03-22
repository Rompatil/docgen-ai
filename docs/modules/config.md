# Module: config

> **Role:** config

## Overview

The `config` module contains 1 file and exports 3 public symbols. Serves as a **config** layer. Dependencies: types. Used by: cli.

## Files

- `src/config/loader.ts` — 2 functions

## Public API

- `variable` **DEFAULT_CONFIG**
- `function` **loadConfig**
- `function` **generateConfigFile**

## Key Functions

### `loadConfig(projectRoot: string, overrides: Partial)`

**Returns:** `DocgenConfig`

Function `loadConfig(projectRoot: string, overrides: Partial)`. Returns `DocgenConfig`. ⚠️ High complexity.

### `generateConfigFile(projectRoot: string)`

**Returns:** `string`

Function `generateConfigFile(projectRoot: string)`. Returns `string`.

## Dependencies

This module depends on:

- [`types`](./modules/types.md)

## Used By

- [`cli`](./modules/cli.md)
