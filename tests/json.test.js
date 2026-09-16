import test from "node:test";
import assert from "node:assert/strict";
import { extractJson } from "../src/lib/json.js";

test("parses plain JSON", () => {
  assert.deepEqual(extractJson('{"ok":true}'), { ok: true });
});

test("parses fenced JSON", () => {
  assert.deepEqual(extractJson('```json\n{"ok":true}\n```'), { ok: true });
});

test("rejects invalid JSON", () => {
  assert.throws(() => extractJson("not json"), /valid JSON/i);
});
