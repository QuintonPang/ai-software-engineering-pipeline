import { execFile, exec as execCallback } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCallback);
const execFileAsync = promisify(execFile);
const SENSITIVE_ENV_NAME = /(token|secret|password|passwd|api[_-]?key|private[_-]?key|credential|authorization|auth)/i;

export function sanitizedEnv(source = process.env) {
  return Object.fromEntries(
    Object.entries(source).filter(([key, value]) => value !== undefined && !SENSITIVE_ENV_NAME.test(key))
  );
}

export async function run(command, cwd, { env = process.env } = {}) {
  return exec(command, {
    cwd,
    env,
    maxBuffer: 20 * 1024 * 1024,
    shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash"
  });
}

export async function git(args, cwd) {
  const { stdout } = await execFileAsync("git", args, { cwd, maxBuffer: 20 * 1024 * 1024 });
  return stdout.trim();
}
