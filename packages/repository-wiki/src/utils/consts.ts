
export const CONCURRENCY_LIMIT = 100;
export const MAX_RETRIES = 5;
export const MAX_GENERATE_FILE_PRELOADED_TOKENS = 20_000;
export const MAX_STRUCTURE_PRELOADED_TOKENS = 50_000;
export const TOKENIZER_MODEL = "gpt-4o";
export const MAX_TREE_ITEMS = 1000;
export const FETCH_CODING_CLIENT_TIMEOUT = 5 * 60 * 1000;// 5 minute timeout for long AI responses
export const REPOSITORY_WIKI_DIR = "repository-wiki";
export const AGENTS_MD_FILENAME = "AGENTS.md";
export const WALK_EXCLUSIONS = new Set([
  // Build/output directories
  "dist", "build", "out", "bin", "obj", "target",
  ".next", ".nuxt", ".output", ".svelte-kit",
  // Dependency/cache directories
  "node_modules", "bower_components", "vendor",
  "venv", "env", ".venv",
  ".tox", ".mypy_cache", ".pytest_cache", ".ruff_cache",
  ".yarn", ".pnp.cjs", ".pnp.loader.mjs",
  // IDE/editor directories
  ".idea", ".vscode",
  // Other generated/temporary
  "__pycache__", "coverage",
  ".terraform", ".cache", ".turbo", ".nx",
  ".parcel-cache", ".docusaurus",
  "tmp", ".tmp", "logs",
]);
