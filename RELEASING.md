# Release Process

This repository uses [Changesets](https://github.com/changesets/changesets) for version management and GitHub Actions for automated publishing.

## Packages

| Package | Published to npm | Description |
|---|---|---|
| `@repositories-wiki/repository-wiki` | Yes | CLI tool for generating wiki from source code |
| `@repositories-wiki/mcp` | Yes | MCP server for browsing wiki indexes and source files |
| `@repositories-wiki/common` | No (private) | Shared types, utilities, constants — bundled into the above packages |

`common` is never published to npm. Its code is inlined into `repository-wiki` and `mcp` at build time using esbuild.

## Day-to-Day Workflow

### 1. Create a changeset when making changes

After making code changes on your feature branch, run:

```bash
npx changeset
```

This interactive prompt will ask you to:
- **Select packages** that changed (use arrow keys + **Space** to select, **Enter** to confirm)
- **Choose bump type** (`patch`, `minor`, or `major`)
- **Write a summary** (this becomes the CHANGELOG entry)

It creates a `.changeset/<random-name>.md` file. Commit it with your code changes.

> Note: `common` won't appear in the changeset prompt — it's ignored since it's not published.
> Only select `@repositories-wiki/repository-wiki` and/or `@repositories-wiki/mcp`.

**Alternative — create the changeset file manually:**

```bash
cat > .changeset/my-change.md << 'EOF'
---
"@repositories-wiki/repository-wiki": patch
---

Fix timeout issue in wiki generation
EOF
```

### 2. Open a PR

```bash
git push -u origin my-branch
```

The **CI workflow** runs automatically on every PR — it builds and tests all packages.

### 3. Merge the PR

Merge to `main`. The changeset `.md` files accumulate on main until you decide to release.

## Releasing

### One-time setup

1. **npm token**: Go to [npmjs.com](https://www.npmjs.com) > Access Tokens > Generate (type: **Automation**)
2. **GitHub secret**: Go to repo Settings > Secrets and variables > Actions > New repository secret > name it `NPM_TOKEN`
3. **npm org**: Create the `@repositories-wiki` organization at [npmjs.com/org/create](https://www.npmjs.com/org/create) (free for public packages)

### Triggering a release

When you're ready to release, trigger the workflow manually:

**Option A — GitHub UI:**

Go to **Actions** tab > **Release** workflow > **Run workflow** > select `main` > click **Run workflow**

**Option B — CLI:**

```bash
gh workflow run release.yml --ref main
```

### What the release workflow does

In a single run, it:

1. Checks out `main` and builds all packages (esbuild bundles `common` into each consumer)
2. Runs `changeset version` — bumps versions in `package.json` files and generates `CHANGELOG.md` entries
3. Commits and pushes the version bumps to `main`
4. Runs `changeset publish` — publishes `repository-wiki` and `mcp` to npm
5. Creates git tags and GitHub Releases for each published package

## Build Pipeline

```
tsc (common)           → produces dist/ for local dev type resolution
       ↓
tsc --noEmit (mcp)     → type-checks only (no output)
tsc --noEmit (wiki)    → type-checks only (no output)
       ↓
esbuild (mcp)          → bundles src/ → dist/index.js (common inlined)
esbuild (wiki)         → bundles src/ → dist/cli.js + dist/index.js (common inlined)
```

- `tsc` is used for type-checking only
- `esbuild` produces the publishable output with `@repositories-wiki/common` inlined
- All other dependencies (e.g., `simple-git`, `commander`) remain external

## Semver Guide

- **patch** (`1.0.0` -> `1.0.1`): Bug fixes, minor tweaks
- **minor** (`1.0.0` -> `1.1.0`): New features, backward-compatible changes
- **major** (`1.0.0` -> `2.0.0`): Breaking changes

## Useful Commands

```bash
# Check what changesets are pending
npx changeset status

# Build all packages (with Turborepo caching)
npm run build

# Run tests
npm run test

# Clean all build artifacts
npm run clean
```

## Monorepo Structure

```
repositories-wiki/
  packages/
    common/              # Shared library (private, bundled into consumers)
    repository-wiki/     # CLI tool (depends on common)
    mcp/                 # MCP server (depends on common)
  scripts/
    bundle.mjs           # esbuild bundler that inlines common
  turbo.json             # Turborepo task pipeline
  .changeset/            # Changeset config + pending changesets
  .github/workflows/
    ci.yml               # Build + test on PRs
    release.yml          # Manual release workflow (workflow_dispatch)
```

Build order is managed by Turborepo: `common` builds first (via `^build`), then `repository-wiki` and `mcp` in parallel.
