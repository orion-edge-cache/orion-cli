/**
 * CLI Dependencies Checker
 *
 * Verifies that required CLI tools (fastly, terraform) are installed
 * on the system before allowing infrastructure operations.
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface CLIDependency {
  name: string;
  command: string;
  versionFlag: string;
  installed: boolean;
  version?: string;
  error?: string;
}

export interface CLIDependencyStatus {
  allInstalled: boolean;
  dependencies: CLIDependency[];
  missingCommands: string[];
}

/**
 * Check if a CLI command is available on the system
 */
async function checkCommand(
  name: string,
  command: string,
  versionFlag: string
): Promise<CLIDependency> {
  try {
    const { stdout } = await execAsync(`${command} ${versionFlag}`, {
      timeout: 10000,
    });

    // Extract version from output (first line, trim whitespace)
    const version = stdout.trim().split("\n")[0];

    return {
      name,
      command,
      versionFlag,
      installed: true,
      version: version || undefined,
    } as CLIDependency;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check if it's a "command not found" type error
    const isNotFound =
      errorMessage.includes("not found") ||
      errorMessage.includes("not recognized") ||
      errorMessage.includes("ENOENT");

    return {
      name,
      command,
      versionFlag,
      installed: false,
      error: isNotFound
        ? `${name} CLI is not installed`
        : `Failed to check ${name}: ${errorMessage}`,
    };
  }
}

/**
 * Check all required CLI dependencies for infrastructure operations
 */
export async function checkCLIDependencies(): Promise<CLIDependencyStatus> {
  const dependencies = await Promise.all([
    checkCommand("Fastly CLI", "fastly", "--version"),
    checkCommand("Terraform", "terraform", "--version"),
  ]);

  const missingCommands = dependencies
    .filter((dep) => !dep.installed)
    .map((dep) => dep.name);

  return {
    allInstalled: missingCommands.length === 0,
    dependencies,
    missingCommands,
  };
}

/**
 * Validate that all CLI dependencies are installed
 * Throws an error if any are missing
 */
export async function validateCLIDependencies(): Promise<void> {
  const status = await checkCLIDependencies();

  if (!status.allInstalled) {
    const missingList = status.missingCommands.join(", ");
    throw new CLIDependencyError(
      `Missing required CLI tools: ${missingList}. Please install them before proceeding.`,
      status
    );
  }
}

/**
 * Custom error class for CLI dependency issues
 */
export class CLIDependencyError extends Error {
  constructor(
    message: string,
    public status: CLIDependencyStatus
  ) {
    super(message);
    this.name = "CLIDependencyError";
  }
}
