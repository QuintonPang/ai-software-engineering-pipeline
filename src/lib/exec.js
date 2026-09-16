import { execFile, exec as execCallback } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCallback);
const execFileAsync = promisify(execFile);

export async function run(command, cwd) {
  return exec(command, {
    cwd,
    maxBuffer: 20 * 1024 * 1024,
    shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash"
  });
}

export async function git(args, cwd) {
  const { stdout } = await execFileAsync("git", args, { cwd, maxBuffer: 20 * 1024 * 1024 });
  return stdout.trim();
}
