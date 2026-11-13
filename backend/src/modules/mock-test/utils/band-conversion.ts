// Approximate, publicly-known IELTS raw-score-to-band conversion tables.
// IDP/Cambridge/British Council do not publish their exact internal
// table (it shifts slightly test administration to test administration),
// but these are the standard tables used across virtually every IELTS
// prep platform and are accurate to within ~0.5 band of the real
// conversion. Both tables assume the real IELTS format of exactly 40
// questions -- scores from a mock test section with a different question
// count are scaled to a 40-question equivalent first.

const LISTENING_TABLE: { min: number; band: number }[] = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 32, band: 7.5 },
  { min: 30, band: 7 },
  { min: 26, band: 6.5 },
  { min: 23, band: 6 },
  { min: 18, band: 5.5 },
  { min: 16, band: 5 },
  { min: 13, band: 4.5 },
  { min: 11, band: 4 },
  { min: 9, band: 3.5 },
  { min: 6, band: 3 },
  { min: 4, band: 2.5 },
  { min: 3, band: 2 },
  { min: 1, band: 1 },
  { min: 0, band: 0 },
];

// Academic Reading. (General Training Reading uses a slightly more
// lenient table at the lower-middle bands -- add a second table if the
// platform ever needs to distinguish Academic vs General Training tests.)
const ACADEMIC_READING_TABLE: { min: number; band: number }[] = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 33, band: 7.5 },
  { min: 30, band: 7 },
  { min: 27, band: 6.5 },
  { min: 23, band: 6 },
  { min: 19, band: 5.5 },
  { min: 15, band: 5 },
  { min: 13, band: 4.5 },
  { min: 10, band: 4 },
  { min: 8, band: 3.5 },
  { min: 6, band: 3 },
  { min: 4, band: 2.5 },
  { min: 3, band: 2 },
  { min: 1, band: 1 },
  { min: 0, band: 0 },
];

function lookupBand(table: { min: number; band: number }[], scaledScore: number): number {
  const rounded = Math.round(scaledScore);
  for (const row of table) {
    if (rounded >= row.min) return row.band;
  }
  return 0;
}

/**
 * Converts a raw correct/total score from a mock test section into a real
 * IELTS-style 0-9 band, using the official-format tables above (which
 * assume 40 questions). Mock test sections can have any number of
 * questions, so the raw score is scaled to a 40-question equivalent first.
 */
export function rawScoreToBand(type: "LISTENING" | "READING", correct: number, total: number): number {
  if (total <= 0) return 0;
  const scaledTo40 = (correct / total) * 40;
  const table = type === "LISTENING" ? LISTENING_TABLE : ACADEMIC_READING_TABLE;
  return lookupBand(table, scaledTo40);
}
