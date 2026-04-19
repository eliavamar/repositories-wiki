import { execSync } from "child_process";
import { logger as defaultLogger } from "@repositories-wiki/common";
import type { Logger } from "@repositories-wiki/common";

/**
 * Regex that matches valid npm package names (scoped and unscoped).
 *
 * Examples that pass:  `lodash`, `@langchain/openai`, `@sap-ai-sdk/langchain`
 * Examples that fail:  `; rm -rf /`, `foo && bar`
 */
const SAFE_PACKAGE_NAME = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i;

/**
 * Error thrown when a LangChain provider package cannot be installed.
 */
export class PackageInstallError extends Error {
  public readonly packageName: string;

  constructor(packageName: string, cause?: unknown) {
    super(
      `Failed to install package "${packageName}". ` +
        `Ensure you have network access and npm is available.`
    );
    this.name = "PackageInstallError";
    this.packageName = packageName;
    this.cause = cause;
  }
}

/**
 * Error thrown when a package name fails the safety check.
 */
export class UnsafePackageNameError extends Error {
  public readonly packageName: string;

  constructor(packageName: string) {
    super(
      `Refusing to install "${packageName}" — ` +
        `the name does not match the expected npm package name pattern.`
    );
    this.name = "UnsafePackageNameError";
    this.packageName = packageName;
  }
}


async function isPackageInstalled(packageName: string): Promise<boolean> {
  try {
    await import(packageName);
    return true;
  } catch {
    return false;
  }
}


export async function ensurePackageInstalled(
  packageName: string,
  logger: Logger = defaultLogger,
): Promise<void> {
  if (!SAFE_PACKAGE_NAME.test(packageName)) {
    throw new UnsafePackageNameError(packageName);
  }

  // Fast path: package is already installed
  if (await isPackageInstalled(packageName)) {
    return;
  }

  logger.info(
    `Package "${packageName}" not found. Installing... (one-time setup)`
  );

  try {
    execSync(`npm install ${packageName}`, {
      stdio: "pipe",
      timeout: 120_000, // 2 minute timeout
    });
  } catch (error) {
    throw new PackageInstallError(packageName, error);
  }

  // Verify the install succeeded
  if (!(await isPackageInstalled(packageName))) {
    throw new PackageInstallError(packageName);
  }

  logger.info(`Package "${packageName}" installed successfully.`);
}
