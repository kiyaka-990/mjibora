// Deterministic PII redaction BEFORE any LLM call. Regex-based, no model.
const PATTERNS: Array<[RegExp, string]> = [
  [/2547\d{8}/g, "[PHONE]"],
  [/\b07\d{8}\b/g, "[PHONE]"],
  [/\b\d{10,12}\b/g, "[ID-REDIRECT]"],
  [/[\w.+-]+@[\w-]+\.[\w.]+/g, "[EMAIL]"],
  [/\b[A-Z]\w+\s(?:St|Road|Rd|Ave|Close)\b/g, "[STREET]"],
];

export function redact(text: string): { safe: string; redacted: boolean } {
  let safe = text;
  let hit = false;
  for (const [re, tag] of PATTERNS) {
    if (re.test(safe)) {
      hit = true;
      safe = safe.replace(re, tag);
    }
  }
  return { safe, redacted: hit };
}
