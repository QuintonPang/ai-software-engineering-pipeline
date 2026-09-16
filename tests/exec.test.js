import test from "node:test";
import assert from "node:assert/strict";
import { sanitizedEnv } from "../src/lib/exec.js";

test("removes secret-like environment variables before running generated code", () => {
  const result = sanitizedEnv({
    PATH: "/usr/bin",
    NODE_ENV: "test",
    OPENAI_API_KEY: "secret",
    GITHUB_TOKEN: "secret",
    DATABASE_PASSWORD: "secret",
    ACTIONS_RUNTIME_TOKEN: "secret"
  });

  assert.equal(result.PATH, "/usr/bin");
  assert.equal(result.NODE_ENV, "test");
  assert.equal(result.OPENAI_API_KEY, undefined);
  assert.equal(result.GITHUB_TOKEN, undefined);
  assert.equal(result.DATABASE_PASSWORD, undefined);
  assert.equal(result.ACTIONS_RUNTIME_TOKEN, undefined);
});
