/* EUR -> USD for a given date (or today when omitted).
 *
 * Returns the rate as a number, or **null** when no rate could be fetched.
 * It used to return a hardcoded 1.05 on HTTP 400 and 1 on anything else, which
 * is how "EUR / USD" came to show 1.000 against a real ECB rate of 1.1578 —
 * a silent, invented rate is worse than none, because callers write it into
 * Firestore as `euroToUSD` and nothing downstream can tell it apart from a
 * real one. Every caller must now treat null as "unavailable".
 *
 * The actual providers and the key live server-side in app/api/fx/route.js.
 */
export const getCur = async (date) => {
  try {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    const response = await fetch(`/api/fx${qs}`);
    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.error) {
      console.warn('getCur: no rate available', data?.error || response.status);
      return null;
    }

    const rate = Number(data.rate);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch (error) {
    console.error('getCur error:', error);
    return null;
  }
}

/* Same call, but with the provenance attached — used by Formulas to show which
   source and publication date the figure on screen came from. */
export const getCurDetail = async (date) => {
  try {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    const response = await fetch(`/api/fx${qs}`);
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.error) return null;
    const rate = Number(data.rate);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return { rate, date: data.date, source: data.source, stale: !!data.stale };
  } catch {
    return null;
  }
}
