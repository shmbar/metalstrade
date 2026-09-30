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
 *
 * A comma means EITHER (client, 2026-09-30: "tried searching 2 grades together,
 * didn't allow"). "708, 202" lists the 708 rows and the 202 rows; the words on each
 * side of a comma still narrow as above ("708 triart, 202" = the 708 line from
 * Triart, or anything 202). A comma BETWEEN TWO DIGITS stays a thousands separator,
 * so "144,131.40" and "3,343" still find their figure. ; and | work as a comma does.
 *
 *   matchesAllWords('202 Turnings', '708, 202')                            → true
 */

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// The break between two alternatives inside a word list. A NUL: never typed, never in a field.
const EITHER = '\u0000';

/** The query as keywords: lower-cased, accent-stripped, empty when blank. A query with
 *  alternatives ("708, 202") comes back as one list with EITHER between them, so every
 *  caller keeps passing a plain string[] to matchesAllWords. */
export const searchWords = (query) => fold(query)
  .replace(/(\d),(?=\d)/g, '$1\u0002')            // a figure's own commas are not breaks
  .split(/[,;|]/)
  .map((alt) => alt.replace(/\u0002/g, ',').split(/\s+/).filter(Boolean))
  .filter((alt) => alt.length)
  .flatMap((alt, i) => (i ? [EITHER, ...alt] : alt));

/** Every keyword in `query` appears somewhere in `fields` (a string, or a list
 *  of strings — nested lists are flattened, blanks ignored) — or, with commas, every
 *  keyword of ANY one alternative does. Blank query = match.
 *  Figures are compared without their separators and currency signs, so an amount
 *  typed the way the table shows it ("$144,131.40") finds it. */
export const matchesAllWords = (fields, query) => {
  const words = Array.isArray(query) ? query : searchWords(query);
  if (!words.length) return true;
  const list = Array.isArray(fields) ? fields.flat(Infinity).filter((f) => f != null && f !== '') : [fields];
  const hay = fold(list.join(' '));
  // Separators come out of each field on its own; the fields stay apart, so the end of
  // one figure and the start of the next can never read as a third ("…131.4" + "1…").
  const bare = list.map((f) => fold(f).replace(/[\s,$€£]/g, '')).join('\u0001');
  const has = (w) => hay.includes(w) || bare.includes(w.replace(/[\s,$€£]/g, ''));
  let all = true;                       // the alternative being read has matched so far
  for (const w of words) {
    if (w === EITHER) {
      if (all) return true;
      all = true;
    } else if (all && !has(w)) all = false;
  }
  return all;
};

/** What an empty table says under a search that found nothing because its words were
 *  all required ("708 202" — no row is both). Null when that is not the reason. */
export const searchHint = (query) => {
  const words = searchWords(query);
  if (!words.length || words.includes(EITHER)) return null;
  const typed = String(query ?? '').trim().split(/\s+/);
  // "708,202" is read as the figure 708,202 — say how to ask for 708 or 202 instead
  if (typed.length === 1 && /^\d+(?:,\d+)+$/.test(typed[0])) {
    return `Nothing shows ${typed[0]}. To list ${typed[0].split(',').join(' or ')}, type ${typed[0].split(',').join(', ')}`;
  }
  if (typed.length < 2) return null;
  return `No row has all of ${typed.join(' + ')}. To list either, separate them with a comma: ${typed.join(', ')}`;
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** The ways a stored value is SHOWN, so a search finds what is on the screen.
 *
 *  Tables search what they store, and store it differently from how they show it: a
 *  date kept as 2026-01-30 reads 30.01.26, an amount kept as 144131.4 reads
 *  $144,131.40, a tonnage kept as 23 reads 23.000, a flag kept as true reads Yes — so
 *  typing any of those found nothing (client, 2026-09-29: "search by any word"). This
 *  lists the value as it is AND as the screens write it; the search reads all of them.
 *    date   → 30.01.26 · 30.01.2026 · 30/01/2026 · 30-jan-2026 (+ 12:02 when it has a time)
 *    number → 144131.40 · 144,131.40 · 144131.400 · 144,131.400
 *    flag   → yes / no  (a column that writes its own words adds them itself)  */
export const shownAs = (value) => {
  if (value == null || value === '') return [];
  if (typeof value === 'boolean') return [value ? 'yes' : 'no'];
  if (typeof value === 'object') return [];
  const s = String(value).trim();
  const out = [s];
  // 2026-01-30 (and 2026-01-30T12:02), or the app's own 30-Jan-2026 (and ", 12:02")
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
  const named = iso ? null : /^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:,?\s*(\d{1,2}):(\d{2}))?/.exec(s);
  const monIdx = named ? MONTHS.indexOf(named[2].toLowerCase()) : -1;
  if (iso || monIdx >= 0) {
    const [y, m, dd, hh, mi] = iso
      ? [iso[1], iso[2], iso[3], iso[4], iso[5]]
      : [named[3], String(monIdx + 1).padStart(2, '0'), named[1].padStart(2, '0'), named[4], named[5]];
    out.push(`${dd}.${m}.${y.slice(2)}`, `${dd}.${m}.${y}`, `${dd}/${m}/${y}`, `${dd}-${MONTHS[Number(m) - 1]}-${y}`);
    if (hh) out.push(`${hh.padStart(2, '0')}:${mi}`);
    return out;
  }
  if (typeof value === 'number' || /^-?\d+(?:\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) {
      for (const dp of [2, 3]) {
        out.push(n.toFixed(dp), n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }));
      }
    }
  }
  return out;
};

export default matchesAllWords;
