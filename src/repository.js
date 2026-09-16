import fs from "node:fs/promises";
import path from "node:path";
import { git } from "./lib/exec.js";

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".tar", ".7z",
  ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4", ".mov", ".avi", ".exe", ".dll", ".so"
]);

function likelyText(file) {
  return !BINARY_EXTENSIONS.has(path.extname(file).toLowerCase());
}

export async function repositorySnapshot(cwd, limits) {
  const listed = await git(["ls-files"], cwd);
  const files = listed.split(/\r?\n/).filter(Boolean);
  const preferred = files
    .filter(likelyText)
    .filter((f) => !f.startsWith(".ai-pipeline/runs/"))
    .sort((a, b) => {
      const score = (f) => /(^|\/)(src|app|lib|server|api|test|tests|config|db|database)\//.test(f) ? 0 : 1;
      return score(a) - score(b) || a.localeCompare(b);
    })
    .slice(0, limits.maxFiles);

  let out = `# Repository file list\n${files.join("\n")}\n\n# Selected file contents\n`;
  for (const file of preferred) {
    if (out.length >= limits.maxContextChars) break;
    try {
      const content = await fs.readFile(path.join(cwd, file), "utf8");
      const clipped = content.slice(0, limits.maxFileChars);
      const next = `\n\n## FILE: ${file}\n\n${clipped}${content.length > clipped.length ? "\n...[truncated]" : ""}`;
      if (out.length + next.length > limits.maxContextChars) break;
      out += next;
    } catch {
      // Skip unreadable/non-text files.
    }
  }
  return out;
}
