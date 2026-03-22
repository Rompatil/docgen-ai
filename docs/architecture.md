# Architecture — @docgen/cli

## Overview

[AI summarization disabled — enable in config to get human-readable descriptions]

## Module Relationships

```mermaid
graph TD
  ai["ai\n(1 files)"]
  cli["cli\n(1 files)"]:::api
  config["config\n(1 files)"]:::config
  core_analyzers["core/analyzers\n(1 files)"]
  core_cache["core/cache\n(1 files)"]
  core_generators["core/generators\n(8 files)"]
  core_parsers["core/parsers\n(3 files)"]
  core["core\n(1 files)"]
  root["root\n(1 files)"]
  types["types\n(1 files)"]
  utils["utils\n(2 files)"]:::util
  ai --> types
  ai --> utils
  cli --> config
  cli --> core
  cli --> utils
  cli --> types
  config --> types
  core_analyzers --> types
  core_analyzers --> core_parsers
  core_analyzers --> utils
  core_analyzers --> core_cache
  core_cache --> types
  core_cache --> utils
  core_generators --> types
  core_generators --> utils
  core_generators --> ai
  core_parsers --> types
  core_parsers --> utils
  core --> types
  core --> core_analyzers
  core --> core_generators
  core --> utils

  classDef api fill:#e1f5fe,stroke:#0288d1
  classDef service fill:#f3e5f5,stroke:#7b1fa2
  classDef model fill:#e8f5e9,stroke:#388e3c
  classDef util fill:#fff3e0,stroke:#f57c00
  classDef config fill:#fce4ec,stroke:#c62828
  classDef ui fill:#e0f2f1,stroke:#00695c
  classDef mw fill:#f1f8e9,stroke:#558b2f
```

## Modules

### ai

- **Role:** General
- **Files:** 1
- **Lines:** 218
- **Exports:** `summarizeProject`, `summarizeModule`, `summarizeFunction`, `explainArchitecture`, `staticModuleSummary`, `staticFunctionSummary`
- **Depends on:** `types`, `utils`
- **Used by:** `core/generators`

### cli

- **Role:** api
- **Files:** 1
- **Lines:** 299
- **Exports:** None
- **Depends on:** `config`, `core`, `utils`, `types`

### config

- **Role:** config
- **Files:** 1
- **Lines:** 92
- **Exports:** `DEFAULT_CONFIG`, `loadConfig`, `generateConfigFile`
- **Depends on:** `types`
- **Used by:** `cli`

### core/analyzers

- **Role:** General
- **Files:** 1
- **Lines:** 240
- **Exports:** `analyzeProject`
- **Depends on:** `types`, `core/parsers`, `utils`, `core/cache`
- **Used by:** `core`

### core/cache

- **Role:** General
- **Files:** 1
- **Lines:** 60
- **Exports:** `AnalysisCache`
- **Depends on:** `types`, `utils`
- **Used by:** `core/analyzers`

### core/generators

- **Role:** General
- **Files:** 8
- **Lines:** 964
- **Exports:** `generateAPIDocs`, `generateArchitectureDocs`, `generateFunctionDocs`, `generateIntegrationsDocs`, `generateModuleDocs`, `generateReadme`, `generateReadme`, `generateArchitectureDocs`, `generateModuleDocs`, `generateAPIDocs`, `generateFunctionDocs`, `generateIntegrationsDocs`, `generateSetupDocs`, `runGenerators`, `generateSetupDocs`
- **Depends on:** `types`, `utils`, `ai`
- **Used by:** `core`

### core/parsers

- **Role:** General
- **Files:** 3
- **Lines:** 600
- **Exports:** `parseJavaScriptFile`, `parsePythonFile`, `parseFile`, `canParse`, `getSupportedLanguages`, `parseJavaScriptFile`, `parsePythonFile`
- **Depends on:** `types`, `utils`
- **Used by:** `core/analyzers`

### core

- **Role:** General
- **Files:** 1
- **Lines:** 65
- **Exports:** `runPipeline`, `runAnalysisOnly`
- **Depends on:** `types`, `core/analyzers`, `core/generators`, `utils`
- **Used by:** `cli`

### root

- **Role:** General
- **Files:** 1
- **Lines:** 20
- **Exports:** `loadConfig`, `generateConfigFile`, `DEFAULT_CONFIG`, `runPipeline`, `runAnalysisOnly`, `analyzeProject`, `runGenerators`, `parseFile`, `canParse`, `getSupportedLanguages`, `AnalysisCache`

### types

- **Role:** General
- **Files:** 1
- **Lines:** 231
- **Exports:** None
- **Used by:** `ai`, `cli`, `config`, `core/analyzers`, `core/cache`, `core/generators`, `core/parsers`, `core`

### utils

- **Role:** utility
- **Files:** 2
- **Lines:** 180
- **Exports:** `findFiles`, `hashContent`, `hashFile`, `detectLanguage`, `readFileContent`, `fileExists`, `ensureDir`, `inferModuleName`, `countLines`, `truncate`, `detectFrameworks`, `parsePackageJson`, `Logger`, `logger`, `logger`, `setLogLevel`, `createModuleLogger`, `enableFileLogging`
- **Used by:** `ai`, `cli`, `core/analyzers`, `core/cache`, `core/generators`, `core/parsers`, `core`

## Dependency Graph

```mermaid
graph LR
  src_ai --> src_types
  src_ai --> src_utils
  src_cli --> src_config
  src_cli --> src_core
  src_cli --> src_utils
  src_cli --> src_types
  src_config --> src_types
  src_core --> src_types
  src_core --> src_utils
  src_core --> src_ai
```

## External Integrations

### Framework

- **express** ^4.18.3

### Logging

- **winston** ^3.12.0

## Technology Stack

```mermaid
graph TB
  Client["Client"] --> API["API Layer"]
  API --> Services["Business Logic"]
```
