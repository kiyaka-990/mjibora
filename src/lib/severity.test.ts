// Guardrail tests: prove the LLM can never downgrade severity below the
// keyword floor, in both English and Swahili. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { severityFloor, enforceFloor } from "./severity.ts";

test("English critical floor: burst water pipe flooding a road", () => {
  const floor = severityFloor("There has been a burst water pipe flooding Moi Avenue, the road is collapsing.");
  assert.equal(enforceFloor("low", floor), "critical");
  assert.equal(enforceFloor("medium", floor), "critical");
  assert.equal(enforceFloor("high", floor), "critical");
});

test("Swahili critical floor: bomba limepasuka (burst pipe)", () => {
  const floor = severityFloor("Bomba la maji limepasuka karibu na dukani, maji yanamwagika kila mahali.");
  assert.equal(enforceFloor("low", floor), "critical");
  assert.equal(enforceFloor("high", floor), "critical");
});

test("Swahili critical floor: moto (fire) forces critical even if LLM proposes low", () => {
  const floor = severityFloor("Kuna moto unateketeza nyumba katika mtaa wa Kambi");
  assert.equal(enforceFloor("low", floor), "critical");
});

test("Swahili high floor: hakuna maji (no water)", () => {
  const floor = severityFloor("Hakuna maji kwa siku tatu katika eneo letu");
  assert.equal(enforceFloor("low", floor), "high");
});

test("Swahili medium floor: takataka (garbage)", () => {
  const floor = severityFloor("Takataka imejaa kwa siku nzima karibu na shule");
  assert.equal(enforceFloor("low", floor), "medium");
});

test("English medium floor: pothole", () => {
  const floor = severityFloor("There is a big pothole on Kenyatta Road");
  assert.equal(enforceFloor("low", floor), "medium");
});

test("LLM can raise but never lower: proposed critical kept", () => {
  const floor = severityFloor("Kuna takataka karibu na nyumba");
  assert.equal(enforceFloor("critical", floor), "critical");
});

test("No keywords: floor stays low, LLM judgment stands", () => {
  const floor = severityFloor("The officer was rude to me at the counter");
  assert.equal(floor, "low");
  assert.equal(enforceFloor("medium", floor), "medium");
});

test("English PII redaction before LLM", () => {
  const { redact } = await import("./redact.ts");
  const r = redact("Call me at 0712345678 or email john.doe@example.com on Moi Avenue");
  assert.ok(r.redacted);
  assert.ok(!r.safe.includes("0712345678"));
  assert.ok(!r.safe.includes("john.doe@example.com"));
});

test("Redaction never mutates redact-tag output", () => {
  const { redact } = await import("./redact.ts");
  const once = redact("Call 0712345678");
  const twice = redact(once.safe);
  assert.equal(once.safe, twice.safe);
});
