/* One matcher for every search box in the app.
 *
 * A search is a list of keywords, and a record matches when EVERY keyword is
 * found somewhere in it — "708 triart" finds the 708 line from Triart, whichever
 * field each word lives in. Until now each box ran a plain substring test on
 * the whole query, so the moment a second word was typed, nothing matched
 * unless one field happened to contain the words in that exact order (Zak,
 * 2026-09-12: "all search boxes in the entire software need to use each
 * keyword"). A box that finds nothing on the second word is worse than no box:
 * it says the record is not there.
 *
 * Case-insensitive, accent-insensitive ("Iberinox" matches "Iberínox"), and
 * whitespace inside the query only separates words. Numbers written with or
 * without their separators both match: "3343" finds "3,343.00".
 *
 *   matchesAllWords(['708 Solids', 'Triart', '2026-09-01'], '708 triart')  → true
 *   matchesAllWords('Triart', '708 triart')                                → false
 */

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** The query as keywords: lower-cased, accent-stripped, empty when blank. */
export const searchWords = (query) => fold(query).split(/\s+/).filter(Boolean);

/** Every keyword in `query` appears somewhere in `fields` (a string, or a list
 *  of strings — nested lists are flattened, blanks ignored). Blank query = match. */
export const matchesAllWords = (fields, query) => {
  const words = Array.isArray(query) ? query : searchWords(query);
  if (!words.length) return true;
  const hay = fold(Array.isArray(fields) ? fields.flat(Infinity).filter((f) => f != null && f !== '').join(' ') : fields);
  const bare = hay.replace(/[\s,]/g, '');
  return words.every((w) => hay.includes(w) || bare.includes(w.replace(/[\s,]/g, '')));
};

export default matchesAllWords;
