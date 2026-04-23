# Repositories Wiki Documentation

Generated from commit `fa0a4ae668aca418068794f5777d1e85449aff52`.

## Project Overview & Architecture

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Monorepo Structure & Build System](sections/project-overview-architecture/monorepo-structure-build-system.md) | high | `package.json`, `tsconfig.json`, `turbo.json`, `scripts/bundle.mjs`, `packages/common/package.json`, `packages/repository-wiki/package.json`, `packages/mcp/package.json` |
| [Architecture Overview & Data Flow](sections/project-overview-architecture/architecture-overview-data-flow.md) | high | `packages/repository-wiki/src/index.ts`, `packages/repository-wiki/src/pipeline/pipeline.ts`, `packages/repository-wiki/src/pipeline/types.ts`, `packages/repository-wiki/src/coding-agent/index.ts`, `packages/common/src/index.ts`, `packages/mcp/src/index.ts` |

## Common Package

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Shared Types, Git Service & Utilities](sections/common-package/shared-types-git-service-utilities.md) | medium | `packages/common/src/index.ts`, `packages/common/src/types.ts`, `packages/common/src/utils/git.ts`, `packages/common/src/utils/logger.ts`, `packages/common/package.json`, `packages/common/__tests__/utils/git.test.ts` |

## Wiki Generation Pipeline

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Pipeline Architecture & Execution](sections/wiki-generation-pipeline/pipeline-architecture-execution.md) | high | `packages/repository-wiki/src/pipeline/pipeline.ts`, `packages/repository-wiki/src/pipeline/types.ts`, `packages/repository-wiki/src/pipeline/index.ts`, `packages/repository-wiki/src/pipeline/steps/index.ts`, `packages/repository-wiki/src/cli.ts`, `packages/repository-wiki/src/index.ts` |
| [Pipeline Steps: From Repo Setup to Output](sections/wiki-generation-pipeline/pipeline-steps-from-repo-setup-to-output.md) | high | `packages/repository-wiki/src/pipeline/steps/setup-repository.step.ts`, `packages/repository-wiki/src/pipeline/steps/infer-files.step.ts`, `packages/repository-wiki/src/pipeline/steps/generate-structure.step.ts`, `packages/repository-wiki/src/pipeline/steps/generate-pages.step.ts`, `packages/repository-wiki/src/pipeline/steps/write-to-local.step.ts`, `packages/repository-wiki/src/pipeline/steps/push-to-github.step.ts`, `packages/repository-wiki/__tests__/pipeline/steps/write-to-local.test.ts` |
| [Prompts & LLM Interaction Strategy](sections/wiki-generation-pipeline/prompts-llm-interaction-strategy.md) | high | `packages/repository-wiki/src/pipeline/prompts.ts`, `packages/repository-wiki/src/utils/retry.ts`, `packages/repository-wiki/src/pipeline/steps/generate-structure.step.ts`, `packages/repository-wiki/src/pipeline/steps/generate-pages.step.ts`, `packages/repository-wiki/src/pipeline/steps/infer-files.step.ts`, `packages/repository-wiki/src/utils/consts.ts` |

## Coding Agent & LLM Providers

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Agent System & Model Registry](sections/coding-agent-llm-providers/agent-system-model-registry.md) | high | `packages/repository-wiki/src/coding-agent/index.ts`, `packages/repository-wiki/src/coding-agent/types.ts`, `packages/repository-wiki/src/coding-agent/agent/agent.ts`, `packages/repository-wiki/src/coding-agent/agent/agent-factory.ts`, `packages/repository-wiki/src/coding-agent/agent/model-registry.ts`, `packages/repository-wiki/src/coding-agent/utils/env-validator.ts` |
| [LLM Provider Adapters & Configuration](sections/coding-agent-llm-providers/llm-provider-adapters-configuration.md) | medium | `packages/repository-wiki/src/coding-agent/llms/llm-factory.ts`, `packages/repository-wiki/src/coding-agent/llms/provider-adapter.ts`, `packages/repository-wiki/src/coding-agent/llms/provider-config.ts`, `packages/repository-wiki/src/coding-agent/llms/utils.ts`, `packages/repository-wiki/src/coding-agent/utils/package-installer.ts`, `packages/repository-wiki/src/coding-agent/types.ts` |

## Tree-Sitter Code Analysis

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Tree-Sitter Signature Extraction Engine](sections/tree-sitter-code-analysis/tree-sitter-signature-extraction-engine.md) | high | `packages/repository-wiki/src/tree-sitter/tree-sitter-manager.ts`, `packages/repository-wiki/src/tree-sitter/extractor.ts`, `packages/repository-wiki/src/tree-sitter/grammar-loader.ts`, `packages/repository-wiki/src/tree-sitter/registry.ts`, `packages/repository-wiki/src/tree-sitter/types.ts`, `packages/repository-wiki/__tests__/tree-sitter/tree-sitter-manager.test.ts` |
| [Language Queries & Grammar Definitions](sections/tree-sitter-code-analysis/language-queries-grammar-definitions.md) | medium | `packages/repository-wiki/src/tree-sitter/language-queries/language-query.ts`, `packages/repository-wiki/src/tree-sitter/language-queries/typescript.ts`, `packages/repository-wiki/src/tree-sitter/language-queries/python.ts`, `packages/repository-wiki/src/tree-sitter/language-queries/java.ts`, `packages/repository-wiki/src/tree-sitter/language-queries/go.ts`, `packages/repository-wiki/src/tree-sitter/language-queries/javascript.ts`, `packages/repository-wiki/assets/grammars/tree-sitter-typescript.wasm` |

## Utilities & File Processing

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [File Walking, Tokenization & Retry Logic](sections/utilities-file-processing/file-walking-tokenization-retry-logic.md) | medium | `packages/repository-wiki/src/utils/files.ts`, `packages/repository-wiki/src/utils/tokenizer.ts`, `packages/repository-wiki/src/utils/retry.ts`, `packages/repository-wiki/src/utils/consts.ts`, `packages/repository-wiki/src/utils/types.ts` |

## MCP Server

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [MCP Server: Wiki & Source Browsing Tools](sections/mcp-server/mcp-server-wiki-source-browsing-tools.md) | high | `packages/mcp/src/index.ts`, `packages/mcp/src/config.ts`, `packages/mcp/src/repo-manager.ts`, `packages/mcp/src/tools/read-wiki-index.ts`, `packages/mcp/src/tools/read-wiki-pages.ts`, `packages/mcp/src/tools/read-source-file.ts`, `packages/mcp/package.json` |

## Example Wiki Outputs

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Generated Wiki Examples & Structure](sections/example-wiki-outputs/generated-wiki-examples-structure.md) | low | `examples/langchain/sections/architecture-overview`, `examples/claude-agent-sdk-python/sections/getting-started`, `examples/pi-mono/sections/architecture-overview`, `examples/langchain/sections/agents`, `examples/pi-mono/sections/agent-core-pi-agent-core` |
