// What a failed call to the web app's API should say. Pure, so it can be tested
// without the network stack.
//
// Most routes answer `{ error: "Human sentence" }`. The document reader answers with a
// CODE in `error` and the sentence in `message` ({ error: 'READ_TIMED_OUT', message:
// 'This document took too long to read…' }), and the phone showed the code. A body
// that is not JSON at all is the hosting platform's own page — a 413 when the upload
// was too big, a 504 when the function ran out of time — and the phone showed that
// page's HTML as the error.

const CODE = /^[A-Z][A-Z0-9_]+$/;

export function apiErrorText(status: number, data: any, parsed: boolean): string {
  if (parsed && data) {
    const { error, message } = data;
    if (message && typeof error === 'string' && CODE.test(error)) return String(message);
    if (error) return String(error);
    if (message) return String(message);
  }
  if (status === 413) return 'That file is too large to send.';
  if (status === 504 || status === 408) return 'The server took too long to answer. Try again.';
  return `Request failed (${status}).`;
}
