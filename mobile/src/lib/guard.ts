// Defensive guard for Firestore doc fields that should be arrays but — on legacy
// records — can be objects/strings. `(x || []).map` still crashes on those;
// this never does.
export const arr = <T = any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
