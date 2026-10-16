import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeAnswer, validateAnswers } from "./form-utils.mjs";

describe("welcome form validation", () => {
  it("normalizes surrounding and repeated whitespace", () => {
    assert.equal(normalizeAnswer("  Mina   Moon  "), "Mina Moon");
  });

  it("requires both answers", () => {
    assert.deepEqual(validateAnswers(" ", "").errors, {
      name: "Please share your name.",
      candy: "Tell us which candy gets your vote."
    });
  });

  it("accepts and returns normalized answers", () => {
    assert.deepEqual(validateAnswers("  Mina  ", "  sour   gummies "), {
      values: { name: "Mina", candy: "sour gummies" },
      errors: {},
      isValid: true
    });
  });

  it("rejects values beyond their field limits", () => {
    const result = validateAnswers("N".repeat(41), "C".repeat(61));
    assert.equal(result.isValid, false);
    assert.match(result.errors.name, /40/);
    assert.match(result.errors.candy, /60/);
  });
});
