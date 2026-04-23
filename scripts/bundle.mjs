/**
 * Bundle script that uses esbuild to produce a single-file bundle
 * with @repositories-wiki/common inlined.
 *
 * Usage: node scripts/bundle.mjs <package-name> <entry-file>
 * Example: node scripts/bundle.mjs mcp src/index.ts
 *          node scripts/bundle.mjs repository-wiki src/cli.ts src/index.ts
 */
import { build } from "esbuild";
import { readFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const args = process.argv.slice(2);
const packageName = args[0];
const entryFiles = args.slice(1);

if (!packageName || entryFiles.length === 0) {
  console.error("Usage: node scripts/bundle.mjs <package-name> <entry1.ts> [entry2.ts ...]");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const packageDir = join(repoRoot, "packages", packageName);

// Read package.json to determine external dependencies
const packageJson = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf-8"));
const externalDeps = Object.keys(packageJson.dependencies || {});

const entryPoints = entryFiles.map((f) => join(packageDir, f));

await build({
  entryPoints,
  outdir: join(packageDir, "dist"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: false,
  // Keep all real (published) dependencies external — only inline @repositories-wiki/*
  external: externalDeps,
});

console.log(`Bundled ${packageName}: ${entryFiles.join(", ")} → dist/`);
