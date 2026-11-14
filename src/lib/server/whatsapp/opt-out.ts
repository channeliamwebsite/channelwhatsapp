/**
 * Opt-out detection. Only a message that IS an opt-out keyword counts — not
 * one that merely contains the word ("I can't stop smiling" is not an opt-out).
 */
const KEYWORDS = new Set([
  "stop", "stop all", "stopall", "unsubscribe", "cancel", "end", "quit", "opt out", "optout", "opt-out",
  "stop updates", "stop messages", "stop promotions", "unsubscribe me",
]);

export function normalizeForOptOut(text: string) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[​-‍️]/g, "")
    .trim()
    .replace(/[.!?,;:'"()[\]{}*_~\-]+$/g, "")
    .replace(/^[.!?,;:'"()[\]{}*_~\-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isOptOutText(text: string | undefined | null) {
  if (!text) return false;
  const normalized = normalizeForOptOut(text);
  return normalized.length <= 30 && KEYWORDS.has(normalized);
}
