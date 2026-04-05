import { execSync } from "child_process";

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


async function isPackageInstalled(packageName: string): Promise<boolean> {
  try {
    await import(packageName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures the given npm package is installed.
 *
 * 1. Attempts a dynamic import to check if the package already exists in node_modules.
 * 2. If not found, runs `npm install <package>` via child_process.
 * 3. Verifies the install succeeded by importing again.
 *
 * The installation only happens once — subsequent calls resolve instantly.
 *
 * @throws {PackageInstallError} if the package cannot be installed
 */
export async function ensurePackageInstalled(
  packageName: string
): Promise<void> {
  // Fast path: package is already installed
  if (await isPackageInstalled(packageName)) {
    return;
  }

  console.log(
    `[coding-agent-v2] Package "${packageName}" not found. Installing... (one-time setup)`
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

  console.log(
    `[coding-agent-v2] Package "${packageName}" installed successfully.`
  );
}
