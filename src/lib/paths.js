import path from "node:path";

export function assertSafeRelativePath(filePath) {
  if (!filePath || filePath.includes("\0")) throw new Error("Invalid empty or NUL-containing path");
  if (path.isAbsolute(filePath)) throw new Error(`Absolute path is not allowed: ${filePath}`);

  const normalized = path.posix.normalize(filePath.replaceAll("\\", "/"));
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`Path traversal is not allowed: ${filePath}`);
  }
  if (normalized === ".git" || normalized.startsWith(".git/")) {
    throw new Error(`Writing inside .git is not allowed: ${filePath}`);
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === ".env" || segment.startsWith(".env."))) {
    throw new Error(`Writing .env files is blocked: ${filePath}`);
  }
  return normalized;
}
