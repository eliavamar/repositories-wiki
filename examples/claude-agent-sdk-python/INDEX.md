# Claude Agent SDK for Python

Generated from commit `1def06644f5ff365339929fa67ab40f4eba92f91`.

## Getting Started

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Overview & Quick Start](sections/getting-started/overview-quick-start.md) | high | `src/claude_agent_sdk/__init__.py`, `pyproject.toml`, `examples/quick_start.py`, `src/claude_agent_sdk/_version.py`, `src/claude_agent_sdk/query.py` |
| [Configuration & Options](sections/getting-started/configuration-options.md) | high | `src/claude_agent_sdk/types.py`, `src/claude_agent_sdk/_internal/transport/subprocess_cli.py`, `examples/setting_sources.py`, `examples/system_prompt.py`, `examples/max_budget_usd.py` |

## Core API

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Query API (One-Shot Requests)](sections/core-api/query-api-one-shot-requests.md) | high | `src/claude_agent_sdk/query.py`, `src/claude_agent_sdk/_internal/query.py`, `src/claude_agent_sdk/_internal/client.py`, `src/claude_agent_sdk/types.py`, `examples/quick_start.py`, `tests/test_query.py` |
| [Streaming Client (Bidirectional Conversations)](sections/core-api/streaming-client-bidirectional-conversations.md) | high | `src/claude_agent_sdk/client.py`, `src/claude_agent_sdk/_internal/client.py`, `examples/streaming_mode.py`, `examples/streaming_mode_trio.py`, `examples/streaming_mode_ipython.py`, `tests/test_streaming_client.py`, `tests/test_client.py` |
| [Message Types & Content Blocks](sections/core-api/message-types-content-blocks.md) | high | `src/claude_agent_sdk/types.py`, `src/claude_agent_sdk/_internal/message_parser.py`, `tests/test_message_parser.py`, `tests/test_types.py`, `src/claude_agent_sdk/__init__.py` |
| [Error Handling](sections/core-api/error-handling.md) | medium | `src/claude_agent_sdk/_errors.py`, `src/claude_agent_sdk/_internal/transport/subprocess_cli.py`, `src/claude_agent_sdk/_internal/client.py`, `tests/test_errors.py`, `tests/test_transport.py` |

## Architecture & Internals

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Architecture Overview](sections/architecture-internals/architecture-overview.md) | high | `src/claude_agent_sdk/__init__.py`, `src/claude_agent_sdk/client.py`, `src/claude_agent_sdk/_internal/client.py`, `src/claude_agent_sdk/_internal/transport/__init__.py`, `src/claude_agent_sdk/_internal/transport/subprocess_cli.py`, `src/claude_agent_sdk/_internal/message_parser.py` |
| [Transport Layer & Subprocess CLI](sections/architecture-internals/transport-layer-subprocess-cli.md) | medium | `src/claude_agent_sdk/_internal/transport/__init__.py`, `src/claude_agent_sdk/_internal/transport/subprocess_cli.py`, `src/claude_agent_sdk/_internal/client.py`, `tests/test_transport.py`, `tests/test_subprocess_buffering.py`, `scripts/download_cli.py` |

## Hooks & Permissions

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Hook System](sections/hooks-permissions/hook-system.md) | high | `src/claude_agent_sdk/types.py`, `src/claude_agent_sdk/_internal/client.py`, `examples/hooks.py`, `e2e-tests/test_hooks.py`, `e2e-tests/test_hook_events.py`, `tests/test_tool_callbacks.py` |
| [Tool Permissions & Callbacks](sections/hooks-permissions/tool-permissions-callbacks.md) | medium | `src/claude_agent_sdk/types.py`, `examples/tool_permission_callback.py`, `examples/tools_option.py`, `e2e-tests/test_tool_permissions.py`, `tests/test_tool_callbacks.py` |
| [Dynamic Control (Runtime Changes)](sections/hooks-permissions/dynamic-control-runtime-changes.md) | medium | `src/claude_agent_sdk/client.py`, `e2e-tests/test_dynamic_control.py`, `examples/include_partial_messages.py`, `e2e-tests/test_include_partial_messages.py`, `src/claude_agent_sdk/types.py` |

## Session Management

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Sessions & Conversation History](sections/session-management/sessions-conversation-history.md) | high | `src/claude_agent_sdk/_internal/sessions.py`, `src/claude_agent_sdk/_internal/session_resume.py`, `src/claude_agent_sdk/_internal/session_import.py`, `tests/test_sessions.py`, `tests/test_session_resume.py`, `tests/test_session_import.py` |
| [Session Stores](sections/session-management/session-stores.md) | high | `src/claude_agent_sdk/_internal/session_store.py`, `src/claude_agent_sdk/types.py`, `examples/session_stores/redis_session_store.py`, `examples/session_stores/s3_session_store.py`, `examples/session_stores/postgres_session_store.py`, `src/claude_agent_sdk/_internal/session_store_validation.py`, `tests/test_session_helpers_store.py` |
| [Session Store Conformance Testing](sections/session-management/session-store-conformance-testing.md) | medium | `src/claude_agent_sdk/testing/session_store_conformance.py`, `src/claude_agent_sdk/testing/__init__.py`, `tests/test_session_store_conformance.py`, `tests/test_example_redis_session_store.py`, `tests/test_example_s3_session_store.py`, `tests/test_example_postgres_session_store.py` |
| [Session Mutations & Summaries](sections/session-management/session-mutations-summaries.md) | medium | `src/claude_agent_sdk/_internal/session_mutations.py`, `src/claude_agent_sdk/_internal/session_summary.py`, `tests/test_session_mutations.py`, `tests/test_session_summary.py`, `src/claude_agent_sdk/__init__.py` |

## MCP Tools & Agents

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [MCP Server Integration & SDK Tools](sections/mcp-tools-agents/mcp-server-integration-sdk-tools.md) | high | `src/claude_agent_sdk/__init__.py`, `src/claude_agent_sdk/types.py`, `examples/mcp_calculator.py`, `e2e-tests/test_sdk_mcp_tools.py`, `tests/test_sdk_mcp_integration.py`, `tests/test_mcp_large_output.py` |
| [Agents & Plugins](sections/mcp-tools-agents/agents-plugins.md) | medium | `src/claude_agent_sdk/types.py`, `examples/agents.py`, `examples/filesystem_agents.py`, `examples/plugin_example.py`, `examples/plugins/demo-plugin/commands/`, `e2e-tests/test_agents_and_settings.py` |

## Development & Testing

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Testing & CI Infrastructure](sections/development-testing/testing-ci-infrastructure.md) | medium | `tests/conftest.py`, `e2e-tests/conftest.py`, `pyproject.toml`, `Dockerfile.test`, `scripts/test-docker.sh`, `tests/test_integration.py` |
| [Build, Release & Scripts](sections/development-testing/build-release-scripts.md) | low | `pyproject.toml`, `scripts/build_wheel.py`, `scripts/download_cli.py`, `scripts/update_version.py`, `scripts/update_cli_version.py`, `scripts/check_pypi_quota.py`, `tests/test_build_wheel.py` |
