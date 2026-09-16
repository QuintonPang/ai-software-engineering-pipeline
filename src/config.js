function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function loadConfig() {
  return {
    openAiApiKey: required("OPENAI_API_KEY"),
    openAiModel: process.env.OPENAI_MODEL?.trim() || "gpt-5.3-codex",
    githubToken: required("GITHUB_TOKEN"),
    githubRepository: required("GITHUB_REPOSITORY"),
    testCommand: process.env.PIPELINE_TEST_COMMAND?.trim() || "npm test",
    maxFiles: intEnv("PIPELINE_MAX_FILES", 120),
    maxFileChars: intEnv("PIPELINE_MAX_FILE_CHARS", 12_000),
    maxContextChars: intEnv("PIPELINE_MAX_CONTEXT_CHARS", 220_000),
    dryRun: (process.env.DRY_RUN || "false").toLowerCase() === "true"
  };
}
