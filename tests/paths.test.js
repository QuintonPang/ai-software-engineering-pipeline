import test from "node:test";
import assert from "node:assert/strict";
import { assertSafeRelativePath } from "../src/lib/paths.js";

test("accepts normal repository paths", () => {
  assert.equal(assertSafeRelativePath("src/app.js"), "src/app.js");
});

test("blocks traversal", () => {
  assert.throws(() => assertSafeRelativePath("../secret.txt"), /traversal/i);
});

test("blocks git internals", () => {
  assert.throws(() => assertSafeRelativePath(".git/config"), /\.git/i);
});

test("blocks env files", () => {
  assert.throws(() => assertSafeRelativePath(".env"), /\.env/i);
});
