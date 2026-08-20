// Retired. This was a dev scratchpad that wired unauthenticated buttons straight
// to the Firebase Admin actions in actions/pass.js — create any user, stamp any
// uidCollection, list every account in the project, with no sign-in required.
// User management now lives in Settings → Users, where every action verifies the
// caller's ID token.
//
// Left as an inert placeholder rather than a notFound() so the route still
// prerenders as a plain static page. Safe to delete this folder outright.
export default function RetiredPassesRoute() {
  return null;
}
