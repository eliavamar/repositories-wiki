# LangChain Framework Wiki

Generated from commit `bb77a4229fe4ae646e7c3e619ff21fb69b50521c`.

## Architecture Overview

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Repository Structure & Package Organization](sections/architecture-overview/repository-structure-package-organization.md) | high | `libs/Makefile`, `libs/core/pyproject.toml`, `libs/langchain/pyproject.toml`, `libs/langchain_v1/pyproject.toml`, `libs/text-splitters/pyproject.toml`, `libs/standard-tests/pyproject.toml`, `libs/model-profiles/pyproject.toml` |
| [Core Library (langchain-core) Overview](sections/architecture-overview/core-library-langchain-core-overview.md) | high | `libs/core/langchain_core/__init__.py`, `libs/core/langchain_core/version.py`, `libs/core/langchain_core/env.py`, `libs/core/langchain_core/globals.py`, `libs/core/langchain_core/exceptions.py`, `libs/core/langchain_core/sys_info.py` |
| [LangChain Classic (langchain) Package](sections/architecture-overview/langchain-classic-langchain-package.md) | medium | `libs/langchain/langchain_classic/__init__.py`, `libs/langchain/langchain_classic/_api/module_import.py`, `libs/langchain/langchain_classic/_api/deprecation.py`, `libs/langchain/langchain_classic/schema/__init__.py`, `libs/langchain/langchain_classic/hub.py`, `libs/langchain/pyproject.toml` |
| [LangChain v1 Package & Agent Framework](sections/architecture-overview/langchain-v1-package-agent-framework.md) | high | `libs/langchain_v1/langchain/__init__.py`, `libs/langchain_v1/langchain/agents/__init__.py`, `libs/langchain_v1/langchain/agents/factory.py`, `libs/langchain_v1/langchain/agents/structured_output.py`, `libs/langchain_v1/langchain/chat_models/__init__.py`, `libs/langchain_v1/pyproject.toml` |

## Runnable & LCEL (LangChain Expression Language)

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Runnable Interface & Base Classes](sections/runnable-lcel-langchain-expression-language/runnable-interface-base-classes.md) | high | `libs/core/langchain_core/runnables/__init__.py`, `libs/core/langchain_core/runnables/base.py`, `libs/core/langchain_core/runnables/config.py`, `libs/core/langchain_core/runnables/utils.py`, `libs/core/langchain_core/runnables/schema.py`, `libs/core/langchain_core/runnables/passthrough.py` |
| [Runnable Configuration & Execution Context](sections/runnable-lcel-langchain-expression-language/runnable-configuration-execution-context.md) | high | `libs/core/langchain_core/runnables/config.py`, `libs/core/langchain_core/runnables/configurable.py`, `libs/core/langchain_core/runnables/utils.py`, `libs/core/langchain_core/rate_limiters.py`, `libs/core/langchain_core/globals.py` |
| [Runnable Composition: Branch, Router, Fallbacks & Retry](sections/runnable-lcel-langchain-expression-language/runnable-composition-branch-router-fallbacks-retry.md) | medium | `libs/core/langchain_core/runnables/branch.py`, `libs/core/langchain_core/runnables/router.py`, `libs/core/langchain_core/runnables/fallbacks.py`, `libs/core/langchain_core/runnables/retry.py`, `libs/core/langchain_core/runnables/history.py` |
| [Streaming & Event System (astream_events)](sections/runnable-lcel-langchain-expression-language/streaming-event-system-astream-events.md) | medium | `libs/core/langchain_core/runnables/schema.py`, `libs/core/langchain_core/tracers/event_stream.py`, `libs/core/langchain_core/tracers/log_stream.py`, `libs/core/langchain_core/tracers/_streaming.py`, `libs/core/langchain_core/callbacks/streaming_stdout.py` |
| [Runnable Graph Visualization](sections/runnable-lcel-langchain-expression-language/runnable-graph-visualization.md) | low | `libs/core/langchain_core/runnables/graph.py`, `libs/core/langchain_core/runnables/graph_ascii.py`, `libs/core/langchain_core/runnables/graph_mermaid.py`, `libs/core/langchain_core/runnables/graph_png.py`, `libs/core/tests/unit_tests/runnables/test_graph.py` |

## Language Models

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Base Language Model Abstractions](sections/language-models/base-language-model-abstractions.md) | high | `libs/core/langchain_core/language_models/base.py`, `libs/core/langchain_core/language_models/__init__.py`, `libs/core/langchain_core/language_models/_utils.py`, `libs/core/langchain_core/language_models/model_profile.py`, `libs/core/langchain_core/caches.py` |
| [LLM Interface (BaseLLM / LLM)](sections/language-models/llm-interface-basellm-llm.md) | high | `libs/core/langchain_core/language_models/llms.py`, `libs/core/langchain_core/language_models/fake.py`, `libs/core/langchain_core/outputs/generation.py`, `libs/core/langchain_core/outputs/llm_result.py`, `libs/core/langchain_core/prompt_values.py` |
| [Chat Model Interface (BaseChatModel)](sections/language-models/chat-model-interface-basechatmodel.md) | high | `libs/core/langchain_core/language_models/chat_models.py`, `libs/core/langchain_core/language_models/fake_chat_models.py`, `libs/core/langchain_core/outputs/chat_generation.py`, `libs/core/langchain_core/outputs/chat_result.py`, `libs/core/langchain_core/outputs/__init__.py` |

## Messages System

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Message Types & Base Classes](sections/messages-system/message-types-base-classes.md) | high | `libs/core/langchain_core/messages/__init__.py`, `libs/core/langchain_core/messages/base.py`, `libs/core/langchain_core/messages/human.py`, `libs/core/langchain_core/messages/ai.py`, `libs/core/langchain_core/messages/system.py`, `libs/core/langchain_core/messages/tool.py`, `libs/core/langchain_core/messages/function.py` |
| [Content Blocks & Block Translators](sections/messages-system/content-blocks-block-translators.md) | medium | `libs/core/langchain_core/messages/content.py`, `libs/core/langchain_core/messages/block_translators/__init__.py`, `libs/core/langchain_core/messages/block_translators/openai.py`, `libs/core/langchain_core/messages/block_translators/anthropic.py`, `libs/core/langchain_core/messages/block_translators/google_genai.py`, `libs/core/langchain_core/messages/block_translators/langchain_v0.py` |
| [Message Utilities & Modifiers](sections/messages-system/message-utilities-modifiers.md) | low | `libs/core/langchain_core/messages/utils.py`, `libs/core/langchain_core/messages/modifier.py`, `libs/core/langchain_core/messages/chat.py`, `libs/core/langchain_core/utils/_merge.py`, `libs/core/langchain_core/chat_history.py` |

## Prompts & Templates

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Prompt Template Base & String Prompts](sections/prompts-templates/prompt-template-base-string-prompts.md) | high | `libs/core/langchain_core/prompts/__init__.py`, `libs/core/langchain_core/prompts/base.py`, `libs/core/langchain_core/prompts/prompt.py`, `libs/core/langchain_core/prompts/string.py`, `libs/core/langchain_core/prompt_values.py` |
| [Chat Prompt Templates & Structured Prompts](sections/prompts-templates/chat-prompt-templates-structured-prompts.md) | high | `libs/core/langchain_core/prompts/chat.py`, `libs/core/langchain_core/prompts/structured.py`, `libs/core/langchain_core/prompts/message.py`, `libs/core/langchain_core/prompts/image.py`, `libs/core/langchain_core/prompts/dict.py` |
| [Few-Shot Prompts & Example Selectors](sections/prompts-templates/few-shot-prompts-example-selectors.md) | medium | `libs/core/langchain_core/prompts/few_shot.py`, `libs/core/langchain_core/prompts/few_shot_with_templates.py`, `libs/core/langchain_core/example_selectors/__init__.py`, `libs/core/langchain_core/example_selectors/base.py`, `libs/core/langchain_core/example_selectors/semantic_similarity.py`, `libs/core/langchain_core/example_selectors/length_based.py` |

## Output Parsers

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Output Parser Base & Common Parsers](sections/output-parsers/output-parser-base-common-parsers.md) | high | `libs/core/langchain_core/output_parsers/__init__.py`, `libs/core/langchain_core/output_parsers/base.py`, `libs/core/langchain_core/output_parsers/string.py`, `libs/core/langchain_core/output_parsers/json.py`, `libs/core/langchain_core/output_parsers/pydantic.py`, `libs/core/langchain_core/output_parsers/list.py`, `libs/core/langchain_core/output_parsers/xml.py` |
| [OpenAI Function & Tool Output Parsers](sections/output-parsers/openai-function-tool-output-parsers.md) | medium | `libs/core/langchain_core/output_parsers/openai_functions.py`, `libs/core/langchain_core/output_parsers/openai_tools.py`, `libs/core/langchain_core/output_parsers/transform.py`, `libs/core/langchain_core/output_parsers/format_instructions.py`, `libs/core/langchain_core/utils/function_calling.py` |

## Tools & Function Calling

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Tool System: BaseTool, @tool Decorator & StructuredTool](sections/tools-function-calling/tool-system-basetool-tool-decorator-structuredtool.md) | high | `libs/core/langchain_core/tools/__init__.py`, `libs/core/langchain_core/tools/base.py`, `libs/core/langchain_core/tools/convert.py`, `libs/core/langchain_core/tools/simple.py`, `libs/core/langchain_core/tools/structured.py`, `libs/core/langchain_core/tools/render.py` |
| [Tool Argument Injection & Runtime Context](sections/tools-function-calling/tool-argument-injection-runtime-context.md) | medium | `libs/core/langchain_core/tools/base.py`, `libs/core/langchain_core/tools/retriever.py`, `libs/core/langchain_core/utils/function_calling.py`, `libs/core/langchain_core/utils/pydantic.py`, `libs/core/langchain_core/utils/json_schema.py` |
| [Tool Node (langchain v1)](sections/tools-function-calling/tool-node-langchain-v1.md) | medium | `libs/langchain_v1/langchain/tools/__init__.py`, `libs/langchain_v1/langchain/tools/tool_node.py`, `libs/langchain_v1/langchain/agents/factory.py`, `libs/core/langchain_core/messages/tool.py`, `libs/core/langchain_core/tools/convert.py` |

## Agents

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Classic Agent Framework (langchain_classic)](sections/agents/classic-agent-framework-langchain-classic.md) | high | `libs/langchain/langchain_classic/agents/__init__.py`, `libs/langchain/langchain_classic/agents/agent.py`, `libs/langchain/langchain_classic/agents/initialize.py`, `libs/langchain/langchain_classic/agents/agent_types.py`, `libs/langchain/langchain_classic/agents/tool_calling_agent/base.py`, `libs/langchain/langchain_classic/agents/agent_iterator.py` |
| [Agent Types & Specialized Agents](sections/agents/agent-types-specialized-agents.md) | medium | `libs/langchain/langchain_classic/agents/openai_tools/base.py`, `libs/langchain/langchain_classic/agents/openai_functions_agent/base.py`, `libs/langchain/langchain_classic/agents/react/base.py`, `libs/langchain/langchain_classic/agents/structured_chat/base.py`, `libs/langchain/langchain_classic/agents/xml/base.py`, `libs/langchain/langchain_classic/agents/self_ask_with_search/base.py` |
| [Agent Output Parsers & Format Scratchpad](sections/agents/agent-output-parsers-format-scratchpad.md) | low | `libs/langchain/langchain_classic/agents/output_parsers/__init__.py`, `libs/langchain/langchain_classic/agents/output_parsers/tools.py`, `libs/langchain/langchain_classic/agents/output_parsers/openai_tools.py`, `libs/langchain/langchain_classic/agents/format_scratchpad/__init__.py`, `libs/langchain/langchain_classic/agents/format_scratchpad/tools.py`, `libs/core/langchain_core/agents.py` |
| [Agent Middleware System (langchain v1)](sections/agents/agent-middleware-system-langchain-v1.md) | high | `libs/langchain_v1/langchain/agents/middleware/__init__.py`, `libs/langchain_v1/langchain/agents/middleware/_execution.py`, `libs/langchain_v1/langchain/agents/middleware/types.py`, `libs/langchain_v1/langchain/agents/middleware/tool_retry.py`, `libs/langchain_v1/langchain/agents/middleware/model_retry.py`, `libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py`, `libs/langchain_v1/langchain/agents/middleware/summarization.py` |
| [Middleware Implementations](sections/agents/middleware-implementations.md) | medium | `libs/langchain_v1/langchain/agents/middleware/tool_selection.py`, `libs/langchain_v1/langchain/agents/middleware/tool_call_limit.py`, `libs/langchain_v1/langchain/agents/middleware/model_call_limit.py`, `libs/langchain_v1/langchain/agents/middleware/model_fallback.py`, `libs/langchain_v1/langchain/agents/middleware/pii.py`, `libs/langchain_v1/langchain/agents/middleware/context_editing.py`, `libs/langchain_v1/langchain/agents/middleware/shell_tool.py` |
| [Agent Toolkits](sections/agents/agent-toolkits.md) | medium | `libs/langchain/langchain_classic/agents/agent_toolkits/__init__.py`, `libs/langchain/langchain_classic/agents/agent_toolkits/base.py`, `libs/langchain/langchain_classic/agents/agent_toolkits/sql/base.py`, `libs/langchain/langchain_classic/agents/agent_toolkits/json/base.py`, `libs/langchain/langchain_classic/agents/agent_toolkits/vectorstore/base.py`, `libs/langchain/langchain_classic/agents/agent_toolkits/openapi/base.py` |

## Chains

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Chain Base Classes & Core Chains](sections/chains/chain-base-classes-core-chains.md) | high | `libs/langchain/langchain_classic/chains/__init__.py`, `libs/langchain/langchain_classic/chains/base.py`, `libs/langchain/langchain_classic/chains/llm.py`, `libs/langchain/langchain_classic/chains/sequential.py`, `libs/langchain/langchain_classic/chains/retrieval.py`, `libs/langchain/langchain_classic/chains/history_aware_retriever.py` |
| [Specialized Chains (QA, Summarization, SQL, Graph)](sections/chains/specialized-chains-qa-summarization-sql-graph.md) | medium | `libs/langchain/langchain_classic/chains/question_answering/chain.py`, `libs/langchain/langchain_classic/chains/summarize/chain.py`, `libs/langchain/langchain_classic/chains/sql_database/query.py`, `libs/langchain/langchain_classic/chains/graph_qa/cypher.py`, `libs/langchain/langchain_classic/chains/combine_documents/stuff.py`, `libs/langchain/langchain_classic/chains/combine_documents/map_reduce.py` |

## Document Loading & Processing

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Document Model & Loaders](sections/document-loading-processing/document-model-loaders.md) | medium | `libs/core/langchain_core/documents/__init__.py`, `libs/core/langchain_core/documents/base.py`, `libs/core/langchain_core/document_loaders/__init__.py`, `libs/core/langchain_core/document_loaders/base.py`, `libs/core/langchain_core/document_loaders/blob_loaders.py`, `libs/core/langchain_core/document_loaders/langsmith.py` |
| [Text Splitters](sections/document-loading-processing/text-splitters.md) | medium | `libs/text-splitters/langchain_text_splitters/__init__.py`, `libs/text-splitters/langchain_text_splitters/base.py`, `libs/text-splitters/langchain_text_splitters/character.py`, `libs/text-splitters/langchain_text_splitters/markdown.py`, `libs/text-splitters/langchain_text_splitters/html.py`, `libs/text-splitters/langchain_text_splitters/python.py` |
| [Document Transformers & Compressors](sections/document-loading-processing/document-transformers-compressors.md) | low | `libs/core/langchain_core/documents/transformers.py`, `libs/core/langchain_core/documents/compressor.py`, `libs/langchain/langchain_classic/document_transformers/__init__.py`, `libs/langchain/langchain_classic/document_transformers/embeddings_redundant_filter.py`, `libs/langchain/langchain_classic/document_transformers/long_context_reorder.py` |

## Embeddings & Vector Stores

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Embeddings Interface](sections/embeddings-vector-stores/embeddings-interface.md) | medium | `libs/core/langchain_core/embeddings/__init__.py`, `libs/core/langchain_core/embeddings/embeddings.py`, `libs/core/langchain_core/embeddings/fake.py`, `libs/core/langchain_core/cross_encoders.py`, `libs/langchain/langchain_classic/embeddings/cache.py` |
| [Vector Store Interface & Retriever](sections/embeddings-vector-stores/vector-store-interface-retriever.md) | high | `libs/core/langchain_core/vectorstores/__init__.py`, `libs/core/langchain_core/vectorstores/base.py`, `libs/core/langchain_core/vectorstores/in_memory.py`, `libs/core/langchain_core/vectorstores/utils.py`, `libs/core/langchain_core/retrievers.py` |

## Retrievers & Indexing

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Retriever Base & Advanced Retrievers](sections/retrievers-indexing/retriever-base-advanced-retrievers.md) | high | `libs/core/langchain_core/retrievers.py`, `libs/langchain/langchain_classic/retrievers/__init__.py`, `libs/langchain/langchain_classic/retrievers/multi_query.py`, `libs/langchain/langchain_classic/retrievers/multi_vector.py`, `libs/langchain/langchain_classic/retrievers/parent_document_retriever.py`, `libs/langchain/langchain_classic/retrievers/contextual_compression.py`, `libs/langchain/langchain_classic/retrievers/ensemble.py` |
| [Self-Query Retriever & Document Compressors](sections/retrievers-indexing/self-query-retriever-document-compressors.md) | medium | `libs/langchain/langchain_classic/retrievers/self_query/base.py`, `libs/langchain/langchain_classic/chains/query_constructor/base.py`, `libs/langchain/langchain_classic/chains/query_constructor/parser.py`, `libs/langchain/langchain_classic/retrievers/document_compressors/__init__.py`, `libs/langchain/langchain_classic/retrievers/document_compressors/base.py`, `libs/core/langchain_core/structured_query.py` |
| [Indexing API & Record Management](sections/retrievers-indexing/indexing-api-record-management.md) | medium | `libs/core/langchain_core/indexing/__init__.py`, `libs/core/langchain_core/indexing/api.py`, `libs/core/langchain_core/indexing/base.py`, `libs/core/langchain_core/indexing/in_memory.py`, `libs/langchain/langchain_classic/indexes/_sql_record_manager.py` |

## Callbacks, Tracing & Observability

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Callback System Architecture](sections/callbacks-tracing-observability/callback-system-architecture.md) | high | `libs/core/langchain_core/callbacks/__init__.py`, `libs/core/langchain_core/callbacks/base.py`, `libs/core/langchain_core/callbacks/manager.py`, `libs/core/langchain_core/callbacks/stdout.py`, `libs/core/langchain_core/callbacks/file.py`, `libs/core/langchain_core/callbacks/usage.py` |
| [Tracing & LangSmith Integration](sections/callbacks-tracing-observability/tracing-langsmith-integration.md) | medium | `libs/core/langchain_core/tracers/__init__.py`, `libs/core/langchain_core/tracers/base.py`, `libs/core/langchain_core/tracers/core.py`, `libs/core/langchain_core/tracers/langchain.py`, `libs/core/langchain_core/tracers/context.py`, `libs/core/langchain_core/tracers/schemas.py`, `libs/core/langchain_core/tracers/run_collector.py` |

## Serialization & Loading

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Serialization Framework (Serializable, dump, load)](sections/serialization-loading/serialization-framework-serializable-dump-load.md) | medium | `libs/core/langchain_core/load/serializable.py`, `libs/core/langchain_core/load/dump.py`, `libs/core/langchain_core/load/load.py`, `libs/core/langchain_core/load/mapping.py`, `libs/core/langchain_core/load/validators.py`, `libs/core/langchain_core/load/_validation.py` |

## Memory System

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Memory Types & Chat History](sections/memory-system/memory-types-chat-history.md) | medium | `libs/langchain/langchain_classic/memory/__init__.py`, `libs/langchain/langchain_classic/memory/buffer.py`, `libs/langchain/langchain_classic/memory/summary.py`, `libs/langchain/langchain_classic/memory/chat_memory.py`, `libs/core/langchain_core/chat_history.py`, `libs/langchain/langchain_classic/memory/vectorstore.py`, `libs/core/langchain_core/stores.py` |

## Partner Integrations

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Partner Package Architecture & OpenAI Integration](sections/partner-integrations/partner-package-architecture-openai-integration.md) | high | `libs/partners/openai/langchain_openai/__init__.py`, `libs/partners/openai/langchain_openai/chat_models/base.py`, `libs/partners/openai/langchain_openai/embeddings/base.py`, `libs/partners/openai/langchain_openai/llms/base.py`, `libs/partners/openai/langchain_openai/chat_models/azure.py`, `libs/partners/openai/pyproject.toml` |
| [Anthropic Integration & Provider Middleware](sections/partner-integrations/anthropic-integration-provider-middleware.md) | medium | `libs/partners/anthropic/langchain_anthropic/__init__.py`, `libs/partners/anthropic/langchain_anthropic/chat_models.py`, `libs/partners/anthropic/langchain_anthropic/middleware/__init__.py`, `libs/partners/anthropic/langchain_anthropic/middleware/prompt_caching.py`, `libs/partners/anthropic/langchain_anthropic/middleware/file_search.py`, `libs/partners/anthropic/langchain_anthropic/experimental.py` |
| [Additional Partner Packages](sections/partner-integrations/additional-partner-packages.md) | low | `libs/partners/groq/langchain_groq/chat_models.py`, `libs/partners/mistralai/langchain_mistralai/chat_models.py`, `libs/partners/ollama/langchain_ollama/chat_models.py`, `libs/partners/fireworks/langchain_fireworks/chat_models.py`, `libs/partners/huggingface/langchain_huggingface/chat_models/huggingface.py`, `libs/partners/chroma/langchain_chroma/vectorstores.py`, `libs/partners/qdrant/langchain_qdrant/vectorstores.py` |

## Evaluation & Testing

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Evaluation Framework](sections/evaluation-testing/evaluation-framework.md) | medium | `libs/langchain/langchain_classic/evaluation/__init__.py`, `libs/langchain/langchain_classic/evaluation/schema.py`, `libs/langchain/langchain_classic/evaluation/qa/eval_chain.py`, `libs/langchain/langchain_classic/evaluation/criteria/eval_chain.py`, `libs/langchain/langchain_classic/evaluation/scoring/eval_chain.py`, `libs/langchain/langchain_classic/smith/evaluation/__init__.py` |
| [Standard Tests for Integrations](sections/evaluation-testing/standard-tests-for-integrations.md) | medium | `libs/standard-tests/langchain_tests/__init__.py`, `libs/standard-tests/langchain_tests/base.py`, `libs/standard-tests/langchain_tests/unit_tests/chat_models.py`, `libs/standard-tests/langchain_tests/integration_tests/chat_models.py`, `libs/standard-tests/langchain_tests/unit_tests/embeddings.py`, `libs/standard-tests/langchain_tests/integration_tests/vectorstores.py` |

## Security & Utilities

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Security: SSRF Protection & Transport Policies](sections/security-utilities/security-ssrf-protection-transport-policies.md) | medium | `libs/core/langchain_core/_security/__init__.py`, `libs/core/langchain_core/_security/_ssrf_protection.py`, `libs/core/langchain_core/_security/_policy.py`, `libs/core/langchain_core/_security/_transport.py`, `libs/core/langchain_core/_security/_exceptions.py` |
| [API Lifecycle: Deprecation & Beta Decorators](sections/security-utilities/api-lifecycle-deprecation-beta-decorators.md) | low | `libs/core/langchain_core/_api/__init__.py`, `libs/core/langchain_core/_api/deprecation.py`, `libs/core/langchain_core/_api/beta_decorator.py`, `libs/core/langchain_core/_api/internal.py`, `libs/core/langchain_core/_api/path.py` |
| [Utility Modules](sections/security-utilities/utility-modules.md) | low | `libs/core/langchain_core/utils/__init__.py`, `libs/core/langchain_core/utils/pydantic.py`, `libs/core/langchain_core/utils/json_schema.py`, `libs/core/langchain_core/utils/function_calling.py`, `libs/core/langchain_core/utils/json.py`, `libs/core/langchain_core/utils/env.py` |

## Output Types & Data Models

| Page | Importance | Relevant Source Files |
|------|------------|----------------------|
| [Generation, LLMResult & Output Data Models](sections/output-types-data-models/generation-llmresult-output-data-models.md) | medium | `libs/core/langchain_core/outputs/__init__.py`, `libs/core/langchain_core/outputs/generation.py`, `libs/core/langchain_core/outputs/chat_generation.py`, `libs/core/langchain_core/outputs/llm_result.py`, `libs/core/langchain_core/outputs/chat_result.py`, `libs/core/langchain_core/outputs/run_info.py` |
