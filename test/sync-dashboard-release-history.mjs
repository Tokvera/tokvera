import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const dashboardDir = process.env.TOKVERA_DASHBOARD_DIR
  ? path.resolve(rootDir, process.env.TOKVERA_DASHBOARD_DIR)
  : path.resolve(rootDir, "..", "tokvera-dashboard");
const evidenceDir = process.env.TOKVERA_RELEASE_EVIDENCE_DIR
  ? path.resolve(rootDir, process.env.TOKVERA_RELEASE_EVIDENCE_DIR)
  : path.resolve(rootDir, "release-evidence");

function runCommand(command, args, cwd, extraEnv = {}) {
  const isWindowsPnpm = process.platform === "win32" && command === "pnpm";
  const executable = isWindowsPnpm ? "cmd.exe" : command;
  const executableArgs = isWindowsPnpm ? ["/d", "/s", "/c", "pnpm", ...args] : args;
  const result = spawnSync(executable, executableArgs, {
    cwd,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${executable} ${executableArgs.join(" ")}`);
  }
}

function main() {
  runCommand(
    "pnpm",
    ["release-history:refresh"],
    dashboardDir,
    { TOKVERA_RELEASE_EVIDENCE_DIR: evidenceDir }
  );
  runCommand(
    "pnpm",
    ["release-history:check"],
    dashboardDir,
    { TOKVERA_RELEASE_EVIDENCE_DIR: evidenceDir }
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
