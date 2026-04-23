# Architecture Overview

The `claude-agent-sdk-python` SDK provides a layered Python interface for interacting with the Claude Code CLI. It abstracts subprocess management, streaming I/O, control-protocol negotiation, session lifecycle, MCP tool hosting, and hook dispatch behind clean public APIs. The architecture is organized into a public surface (`claude_agent_sdk`), a stateful client layer (`ClaudeSDKClient`), an internal orchestration layer (`Query` + `InternalClient`), and a pluggable transport abstraction that currently ships one concrete implementation: `SubprocessCLITransport`.

At a high level, every interaction flows from user code → public API (`query()` or `ClaudeSDKClient`) → `Query` (control-protocol logic) → `Transport` (I/O) → Claude Code CLI subprocess → parsed `Message` objects back to the caller. This separation of concerns allows the transport to be replaced for testing or remote-execution scenarios without touching the protocol or message-parsing layers.

---

## High-Level Component Map

```graph TD
    A[User Code] --> B[Public API<br/>query / ClaudeSDKClient]
    B --> C[InternalClient]
    C --> D[Query<br/>Control Protocol]
    D --> E[Transport<br/>Abstract Interface]
    E --> F[SubprocessCLITransport]
    F --> G[Claude Code CLI<br/>subprocess]
    G -->|stream-json stdout| F
    F -->|dict messages| D
    D -->|parsed dicts| H[MessageParser]
    H -->|typed Messages| C
    C -->|typed Messages| B
    B -->|typed Messages| A
```

Sources: [src/claude_agent_sdk/__init__.py](../../../src/claude_agent_sdk/__init__.py), [src/claude_agent_sdk/client.py](../../../src/claude_agent_sdk/client.py), [src/claude_agent_sdk/_internal/client.py](../../../src/claude_agent_sdk/_internal/client.py), [src/claude_agent_sdk/_internal/transport/__init__.py](../../../src/claude_agent_sdk/_internal/transport/__init__.py), [src/claude_agent_sdk/_internal/transport/subprocess_cli.py](../../../src/claude_agent_sdk/_internal/transport/subprocess_cli.py)

---

## Layer 1 – Public API (`claude_agent_sdk`)

The package's `__init__.py` is the single public entry point. It re-exports every user-facing symbol from sub-modules and defines two top-level utilities: the `tool` decorator and `create_sdk_mcp_server`.

### Primary Entry Points

| Symbol | Source module | Purpose |
|---|---|---|
| `query()` | `claude_agent_sdk.query` | One-shot async query; yields `Message` objects |
| `ClaudeSDKClient` | `claude_agent_sdk.client` | Stateful bidirectional client |
| `create_sdk_mcp_server()` | `claude_agent_sdk.__init__` | Creates in-process MCP server |
| `tool()` | `claude_agent_sdk.__init__` | Decorator for defining MCP tool handlers |
| `Transport` | `claude_agent_sdk._internal.transport` | Abstract transport base class |

Sources: [src/claude_agent_sdk/__init__.py:1-50](../../../src/claude_agent_sdk/__init__.py#L1-L50)

### In-Process MCP Server Factory

`create_sdk_mcp_server()` builds an MCP `Server` instance entirely in-process. Tools registered via `@tool(...)` are stored in a `tool_map` dict; `list_tools` and `call_tool` handlers are registered on the MCP server object. The resulting `McpSdkServerConfig` (type `"sdk"`) is passed to `ClaudeAgentOptions.mcp_servers` and is intercepted by the transport layer before the CLI is invoked so that the `instance` field is never serialized to the subprocess.

```python
# Simplified internal flow inside create_sdk_mcp_server()
tool_map = {tool_def.name: tool_def for tool_def in tools}

@server.list_tools()
async def list_tools() -> list[Tool]:
    return cached_tool_list

@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> Any:
    result = await tool_map[name].handler(arguments)
    ...
    return CallToolResult(content=content, isError=result.get("is_error", False))
```

Sources: [src/claude_agent_sdk/__init__.py:195-310](../../../src/claude_agent_sdk/__init__.py#L195-L310)

### JSON Schema Derivation

The `_python_type_to_json_schema()` and `_typeddict_to_json_schema()` helpers convert Python type annotations (including `TypedDict`, `Annotated`, `Optional`, `list`, `dict`, and primitives) into JSON Schema dictionaries at server-creation time, caching the result in `cached_tool_list` so it is computed only once per server.

Sources: [src/claude_agent_sdk/__init__.py:138-195](../../../src/claude_agent_sdk/__init__.py#L138-L195)

---

## Layer 2 – Client Layer

Two client classes exist at this layer, serving different usage patterns.

### `ClaudeSDKClient` (Stateful / Bidirectional)

`ClaudeSDKClient` is the public stateful client. It maintains a persistent connection to the CLI subprocess across multiple `query()` calls and exposes fine-grained control methods.

```graph TD
    A[User Code] --> B[ClaudeSDKClient.connect]
    B --> C[materialize_resume_session]
    C --> D[_connect_inner]
    D --> E[SubprocessCLITransport.connect]
    D --> F[Query.start]
    F --> G[Query.initialize]
    G --> H[Ready for queries]
    H --> I[ClaudeSDKClient.query]
    I --> J[transport.write]
    H --> K[ClaudeSDKClient.receive_messages]
    K --> L[Query.receive_messages]
    L --> M[MessageParser.parse_message]
    M --> N[Typed Message stream]
```

Sources: [src/claude_agent_sdk/client.py:60-200](../../../src/claude_agent_sdk/client.py#L60-L200)

#### Key Methods

| Method | Description |
|---|---|
| `connect(prompt)` | Spawns subprocess, initializes Query, optionally sends initial prompt |
| `query(prompt, session_id)` | Sends a new user message over the open connection |
| `receive_messages()` | Async iterator over all incoming `Message` objects |
| `receive_response()` | Convenience iterator that stops after the first `ResultMessage` |
| `interrupt()` | Sends interrupt signal via Query |
| `set_permission_mode(mode)` | Changes tool permission mode mid-conversation |
| `get_mcp_status()` | Queries live MCP server connection status |
| `get_context_usage()` | Returns context window usage breakdown |
| `disconnect()` | Closes Query, transport, and cleans up temp dirs |

Sources: [src/claude_agent_sdk/client.py:170-380](../../../src/claude_agent_sdk/client.py#L170-L380)

#### Async Context Manager

`ClaudeSDKClient` implements `__aenter__` / `__aexit__`, automatically calling `connect()` with an empty stream on entry and `disconnect()` on exit (regardless of exceptions).

Sources: [src/claude_agent_sdk/client.py:385-396](../../../src/claude_agent_sdk/client.py#L385-L396)

### `InternalClient` (Stateless / One-Shot)

`InternalClient` is used internally by `query()`. It creates a fresh transport and `Query` per call, streams all messages, and tears everything down on completion. The outer generator wraps the inner one to guarantee cleanup ordering: the subprocess is terminated *before* any temporary `CLAUDE_CONFIG_DIR` is removed.

```python
# Cleanup ordering guarantee in InternalClient.process_query()
async for msg in inner:
    yield msg
finally:
    await inner.aclose()       # subprocess terminated here
    if materialized is not None:
        await materialized.cleanup()  # temp dir removed after
```

Sources: [src/claude_agent_sdk/_internal/client.py:40-75](../../../src/claude_agent_sdk/_internal/client.py#L40-L75)

---

## Layer 3 – Transport Abstraction

### Abstract `Transport` Interface

`Transport` is an abstract base class that defines the contract for all I/O backends. It lives in `_internal/transport/__init__.py` and is re-exported from the public package surface.

| Method | Signature | Purpose |
|---|---|---|
| `connect()` | `async → None` | Establish connection / spawn process |
| `write(data)` | `async str → None` | Send raw string data (JSON + newline) |
| `read_messages()` | `→ AsyncIterator[dict]` | Yield parsed JSON messages |
| `close()` | `async → None` | Tear down connection and resources |
| `is_ready()` | `→ bool` | Check readiness |
| `end_input()` | `async → None` | Signal end of input stream (EOF on stdin) |

Sources: [src/claude_agent_sdk/_internal/transport/__init__.py:1-65](../../../src/claude_agent_sdk/_internal/transport/__init__.py#L1-L65)

### `SubprocessCLITransport` (Concrete Implementation)

`SubprocessCLITransport` is the only shipped transport. It manages the full lifecycle of a Claude Code CLI subprocess using `anyio`.

```graph TD
    A[connect called] --> B[_find_cli<br/>bundled or PATH]
    B --> C[_check_claude_version]
    C --> D[_build_command<br/>assemble argv]
    D --> E[anyio.open_process<br/>stdin/stdout PIPE]
    E --> F[TextReceiveStream stdout]
    E --> G[TextSendStream stdin]
    E --> H[TextReceiveStream stderr<br/>optional]
    H --> I[_handle_stderr task]
    F --> J[read_messages loop]
    J --> K[JSON buffer accumulation]
    K --> L[yield parsed dict]
```

Sources: [src/claude_agent_sdk/_internal/transport/subprocess_cli.py:55-180](../../../src/claude_agent_sdk/_internal/transport/subprocess_cli.py#L55-L180)

#### CLI Discovery

The transport searches for the Claude Code binary in this priority order:

1. `_find_bundled_cli()` – looks for `claude` / `claude.exe` in `_bundled/` relative to the package
2. `shutil.which("claude")` – system PATH
3. Known fallback locations (`~/.npm-global/bin/claude`, `/usr/local/bin/claude`, etc.)

Sources: [src/claude_agent_sdk/_internal/transport/subprocess_cli.py:60-110](../../../src/claude_agent_sdk/_internal/transport/subprocess_cli.py#L60-L110)

#### Command-Line Assembly (`_build_command`)

`_build_command()` translates `ClaudeAgentOptions` fields into CLI arguments. Key behaviors:

- Always appends `--output-format stream-json --verbose --input-format stream-json`
- Strips the `instance` key from SDK MCP server configs before serializing to `--mcp-config`
- Merges `sandbox` settings into the `--settings` JSON blob when both are provided
- Injects `Skill` / `Skill(name)` patterns into `--allowedTools` when `skills` is set
- Agents are **never** passed as a CLI flag; they are sent via the `initialize` control-protocol message

Sources: [src/claude_agent_sdk/_internal/transport/subprocess_cli.py:155-290](../../../src/claude_agent_sdk/_internal/transport/subprocess_cli.py#L155-L290)

#### Environment Variable Injection

The subprocess environment is assembled by merging (in order):

1. Inherited process environment (with `CLAUDECODE` stripped)
2. `CLAUDE_CODE_ENTRYPOINT=sdk-py`
3. `options.env` overrides
4. `CLAUDE_AGENT_SDK_VERSION=<version>`
5. Active OpenTelemetry W3C trace context (`TRACEPARENT`, `TRACESTATE`) when available

Sources: [src/claude_agent_sdk/_internal/transport/subprocess_cli.py:295-340](../../../src/claude_agent_sdk/_internal/transport/subprocess_cli.py#L295-L340)

#### JSON Streaming and Buffer Management

stdout is read line-by-line via `TextReceiveStream`. Because `TextReceiveStream` may truncate long lines, the transport implements a speculative-parse buffer:

- Accumulates partial JSON in `json_buffer`
- Attempts `json.loads()` after each chunk
- Raises `CLIJSONDecodeError` if buffer exceeds `max_buffer_size` (default 1 MB)
- Non-JSON lines (e.g., sandbox debug output) are discarded when the buffer is empty

Sources: [src/claude_agent_sdk/_internal/transport/subprocess_cli.py:370-430](../../../src/claude_agent_sdk/_internal/transport/subprocess_cli.py#L370-L430)

#### Graceful Shutdown Sequence

```graph TD
    A[close called] --> B[Cancel stderr task group]
    B --> C[Acquire write lock]
    C --> D[Set ready=False]
    D --> E[Close stdin stream]
    E --> F[Wait up to 5s for<br/>graceful exit]
    F -->|timeout| G[SIGTERM]
    G -->|timeout| H[SIGKILL]
    H --> I[Null all handles]
```

Sources: [src/claude_agent_sdk/_internal/transport/subprocess_cli.py:220-275](../../../src/claude_agent_sdk/_internal/transport/subprocess_cli.py#L220-L275)

---

## Layer 4 – Message Parsing

### `parse_message()`

`parse_message()` in `_internal/message_parser.py` converts raw `dict` objects (from the transport) into strongly-typed `Message` dataclass instances. It uses Python 3.10+ structural pattern matching (`match`/`case`) on the `type` field.

#### Supported Message Types

| `type` field | Returned type | Notes |
|---|---|---|
| `"user"` | `UserMessage` | Handles `TextBlock`, `ToolUseBlock`, `ToolResultBlock` content |
| `"assistant"` | `AssistantMessage` | Handles `TextBlock`, `ThinkingBlock`, `ToolUseBlock`, `ServerToolUseBlock`, etc. |
| `"system"` | `SystemMessage` / task subtypes | Dispatches on `subtype` field |
| `"result"` | `ResultMessage` | Terminal message with cost, usage, stop reason |
| `"stream_event"` | `StreamEvent` | Low-level streaming events |
| `"rate_limit_event"` | `RateLimitEvent` | Rate limit status updates |
| unknown | `None` | Forward-compatible: unknown types are silently skipped |

Sources: [src/claude_agent_sdk/_internal/message_parser.py:1-220](../../../src/claude_agent_sdk/_internal/message_parser.py#L1-L220)

#### System Message Subtypes

`system` messages are further dispatched by `subtype`:

| `subtype` | Returned type |
|---|---|
| `"task_started"` | `TaskStartedMessage` |
| `"task_progress"` | `TaskProgressMessage` |
| `"task_notification"` | `TaskNotificationMessage` |
| `"mirror_error"` | `MirrorErrorMessage` |
| anything else | `SystemMessage` |

Sources: [src/claude_agent_sdk/_internal/message_parser.py:110-165](../../../src/claude_agent_sdk/_internal/message_parser.py#L110-L165)

### Forward Compatibility

Unknown `type` values return `None` from `parse_message()`. Both `ClaudeSDKClient.receive_messages()` and `InternalClient._process_query_inner()` skip `None` results, ensuring that new CLI message types in future Claude Code versions do not crash older SDK versions.

Sources: [src/claude_agent_sdk/_internal/message_parser.py:210-215](../../../src/claude_agent_sdk/_internal/message_parser.py#L210-L215), [src/claude_agent_sdk/client.py:175-185](../../../src/claude_agent_sdk/client.py#L175-L185)

---

## Data Flow: End-to-End Query Sequence

The following sequence diagram shows a full `query()` call using `InternalClient`.

```sequenceDiagram
    participant UC as User Code
    participant IC as InternalClient
    participant TR as SubprocessCLITransport
    participant CLI as Claude Code CLI
    participant MP as MessageParser

    UC->>+IC: process_query(prompt, options)
    IC->>IC: validate_session_store_options()
    IC->>IC: materialize_resume_session()
    IC->>+TR: connect()
    TR->>TR: _find_cli()
    TR->>TR: _build_command()
    TR->>+CLI: anyio.open_process(cmd)
    CLI-->>TR: stdin/stdout/stderr streams
    TR-->>-IC: connected
    IC->>+IC: Query(transport, ...)
    IC->>IC: query.start()
    IC->>CLI: initialize message (via stdin)
    CLI-->>IC: initialized ack
    IC->>CLI: user message (via stdin)
    IC->>IC: query.wait_for_result_and_end_input()
    loop stream messages
        CLI-->>TR: JSON line (stdout)
        TR-->>IC: dict message
        IC->>+MP: parse_message(dict)
        MP-->>-IC: typed Message
        IC-->>UC: yield Message
    end
    IC->>IC: query.close()
    TR->>CLI: close stdin → wait → SIGTERM if needed
    IC->>IC: materialized.cleanup()
    IC-->>-UC: generator exhausted
```

Sources: [src/claude_agent_sdk/_internal/client.py:40-165](../../../src/claude_agent_sdk/_internal/client.py#L40-L165), [src/claude_agent_sdk/_internal/transport/subprocess_cli.py:180-290](../../../src/claude_agent_sdk/_internal/transport/subprocess_cli.py#L180-L290)

---

## Session Management Integration

Both `ClaudeSDKClient` and `InternalClient` integrate with an optional `SessionStore`. When `options.session_store` is set:

1. `materialize_resume_session()` loads the session from the store into a temporary `CLAUDE_CONFIG_DIR`
2. `apply_materialized_options()` overrides `resume`/`continue`/`env` on the options copy so the subprocess reads from the temp dir
3. A `TranscriptMirrorBatcher` is attached to the `Query` to mirror new messages back into the store
4. On any mirror failure, `query.report_mirror_error()` synthesizes a `MirrorErrorMessage` in the stream

The temp dir is always cleaned up in the outermost `finally` block, after the subprocess has been fully terminated.

Sources: [src/claude_agent_sdk/client.py:95-145](../../../src/claude_agent_sdk/client.py#L95-L145), [src/claude_agent_sdk/_internal/client.py:40-75](../../../src/claude_agent_sdk/_internal/client.py#L40-L75)

---

## Hook and Permission System

Hooks are configured via `ClaudeAgentOptions.hooks` as a `dict[HookEvent, list[HookMatcher]]`. Both `ClaudeSDKClient` and `InternalClient` call `_convert_hooks_to_internal_format()` to transform `HookMatcher` objects into the plain-dict format expected by the internal `Query` class.

The `can_use_tool` callback enforces two invariants:
- It requires an `AsyncIterable` prompt (streaming mode), not a plain string
- It is mutually exclusive with `permission_prompt_tool_name`

When `can_use_tool` is set, `permission_prompt_tool_name` is automatically set to `"stdio"` on a copy of the options, enabling the control-protocol permission flow.

Sources: [src/claude_agent_sdk/client.py:55-80](../../../src/claude_agent_sdk/client.py#L55-L80), [src/claude_agent_sdk/_internal/client.py:80-105](../../../src/claude_agent_sdk/_internal/client.py#L80-L105)

---

## Error Hierarchy

The SDK defines a small hierarchy of typed errors (imported from `_errors`):

| Exception | Typical cause |
|---|---|
| `ClaudeSDKError` | Base class for all SDK errors |
| `CLINotFoundError` | Claude Code binary not found |
| `CLIConnectionError` | Failed to start or write to subprocess |
| `CLIJSONDecodeError` | JSON buffer overflow or parse failure |
| `ProcessError` | Subprocess exited with non-zero exit code |

Sources: [src/claude_agent_sdk/__init__.py:25-31](../../../src/claude_agent_sdk/__init__.py#L25-L31), [src/claude_agent_sdk/_internal/transport/subprocess_cli.py:15-20](../../../src/claude_agent_sdk/_internal/transport/subprocess_cli.py#L15-L20)

---

## Summary

The SDK's architecture follows a strict layered design: a thin public API delegates to a client layer that orchestrates a `Query` control-protocol handler, which in turn drives a pluggable `Transport`. The only concrete transport (`SubprocessCLITransport`) manages the full Claude Code CLI subprocess lifecycle including binary discovery, command-line assembly, environment injection, streaming JSON I/O with buffer management, and graceful shutdown. Message parsing is isolated in `MessageParser`, which converts raw CLI JSON into a closed set of typed `Message` dataclasses while remaining forward-compatible with unknown message types. Optional cross-cutting concerns—session stores, MCP servers, hooks, and OpenTelemetry tracing—are integrated at well-defined seams without coupling the core I/O path.