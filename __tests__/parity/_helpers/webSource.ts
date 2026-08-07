/**
 * WEB DRIFT ALARM — read-only introspection of the web app's source.
 *
 * WHY THIS EXISTS
 * ---------------
 * Tier 3 parity tests cover formulas that are locked inside a web page component
 * and cannot be imported (they live in a React file that pulls Firebase, next/*,
 * JSX and hooks). For those we TRANSCRIBE the formula verbatim into the parity
 * suite and assert `mobile === mirror`.
 *
 * A transcription rots the moment somebody edits web. So every Tier-3 mirror also
 * records a hash of WEB's own copy of that function. When web changes, the hash
 * changes, the suite goes red, and whoever edited web is told to go re-check the
 * mobile port instead of silently leaving the two apps disagreeing.
 *
 * THIS MODULE ONLY EVER READS. It must never write to anything under the web app.
 *
 * API
 * ---
 *   webFnSource(relPath: string, symbolName: string): string
 *   webFnHash(relPath: string, symbolName: string): string        // 12 hex chars
 *   expectWebUnchanged(relPath: string, symbolName: string, expectedHash: string): void
 *   webFnLine(relPath: string, symbolName: string): number        // 1-based, for citations only
 *   repoFileText(relPath: string): string                         // Tier 1 file-identity primitive
 *   fileHash(relPath: string): string
 *   webPath(relPath: string): string
 *   REPO_ROOT: string
 *
 * `relPath` is relative to the REPO ROOT, forward slashes, e.g.
 *   'app/(root)/dashboard/funcs.js'  |  'utils/finance.js'
 *
 * SELF-TEST / USAGE
 * -----------------
 * ```ts
 * import { describe, it, expect } from 'vitest';
 * import { webFnSource, webFnHash, expectWebUnchanged, webFnLine } from './_helpers/webSource';
 * import { sumInvProductsMT } from '@/features/dashboard/pnlChain';
 *
 * // 1. read a web formula we cannot import
 * const src = webFnSource('app/(root)/dashboard/funcs.js', 'sumInvProductsMT');
 * expect(src).toContain('canceled');          // the trap mobile reproduces on purpose
 * expect(src).not.toContain('obj.draft');     // web checks canceled but NOT draft
 *
 * // 2. record the hash once, then assert it forever after
 * // console.log(webFnHash('app/(root)/dashboard/funcs.js', 'sumInvProductsMT'))
 * const SUM_INV_PRODUCTS_MT = 'a1b2c3d4e5f6'; // <- paste the printed value
 * it('web sumInvProductsMT has not drifted', () => {
 *   expectWebUnchanged('app/(root)/dashboard/funcs.js', 'sumInvProductsMT', SUM_INV_PRODUCTS_MT);
 * });
 *
 * // 3. cite the line in the mirror comment (NOT hashed — reformatting must not trip the alarm)
 * // mirrored from app/(root)/dashboard/funcs.js:<webFnLine(...)>
 * ```
 *
 * WHEN THE ALARM FIRES: see __tests__/parity/README.md → "When the drift alarm fires".
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Repo root: this file lives at <root>/__tests__/parity/_helpers/webSource.ts */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Absolute path of a repo-relative file. Exported so suites can cite paths consistently. */
export const webPath = (relPath: string): string =>
  path.resolve(REPO_ROOT, relPath.replace(/\\/g, '/'));

/**
 * Raw text of any repo file with line endings normalised to \n.
 *
 * This is the TIER 1 primitive: `mobile/src/shared/*` is meant to be a byte-identical
 * copy of a web module, so the suite asserts
 *   expect(repoFileText('mobile/src/shared/finance.js')).toBe(repoFileText('utils/finance.js'))
 * CRLF is normalised because the two files can be checked out with different endings
 * on Windows without either app changing behaviour.
 */
export function repoFileText(relPath: string): string {
  const abs = webPath(relPath);
  try {
    return readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    throw new Error(`[webSource] cannot read "${relPath}" (resolved to ${abs}).`);
  }
}

/** Stable short hash of a whole file's normalised text. Useful for Tier 1 sanity checks. */
export function fileHash(relPath: string): string {
  return createHash('sha256').update(repoFileText(relPath), 'utf8').digest('hex').slice(0, 12);
}

// ── source scanning ──────────────────────────────────────────────────────────
// One pass produces two strings of IDENTICAL length and identical line numbering
// as the original file:
//   code — comments blanked out (so they never enter the hash)
//   mask — comments blanked AND string / template / regex bodies replaced by 'x'
//          (so brace counting and symbol lookup can't be fooled by a literal)
// Newlines are preserved in both, which keeps line numbers aligned with the file
// on disk for webFnLine().

interface Scan {
  code: string;
  mask: string;
}

// A '/' starts a regex literal (rather than division) only after one of these.
const REGEX_CAN_FOLLOW = new Set('([{,;:=!&|?+-*%~^<>'.split(''));

function scanSource(src: string): Scan {
  const code: string[] = [];
  const mask: string[] = [];
  const push = (c: string, m: string) => {
    code.push(c);
    mask.push(m);
  };
  // Blank a span but keep its newlines, so offsets AND line numbers stay aligned.
  const blank = (text: string) => {
    for (const ch of text) push(ch === '\n' ? '\n' : ' ', ch === '\n' ? '\n' : ' ');
  };

  let i = 0;
  let prev = '';
  const n = src.length;

  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];

    // line comment
    if (c === '/' && c2 === '/') {
      const end = src.indexOf('\n', i);
      const stop = end === -1 ? n : end;
      blank(src.slice(i, stop));
      i = stop;
      continue;
    }
    // block comment
    if (c === '/' && c2 === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      blank(src.slice(i, stop));
      i = stop;
      continue;
    }
    // string / template literal
    if (c === '"' || c === "'" || c === '`') {
      push(c, c);
      i++;
      while (i < n) {
        const d = src[i];
        if (d === '\\' && i + 1 < n) {
          push(d, 'x');
          push(src[i + 1], src[i + 1] === '\n' ? '\n' : 'x');
          i += 2;
          continue;
        }
        push(d, d === c ? d : d === '\n' ? '\n' : 'x');
        i++;
        if (d === c) break;
      }
      prev = c;
      continue;
    }
    // regex literal
    if (c === '/' && (prev === '' || REGEX_CAN_FOLLOW.has(prev))) {
      push(c, c);
      i++;
      let inClass = false;
      while (i < n) {
        const d = src[i];
        if (d === '\n') break; // unterminated => it was not a regex; bail safely
        if (d === '\\' && i + 1 < n) {
          push(d, 'x');
          push(src[i + 1], 'x');
          i += 2;
          continue;
        }
        push(d, d === '/' && !inClass ? d : 'x');
        i++;
        if (d === '[') inClass = true;
        else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) break;
      }
      prev = '/';
      continue;
    }

    push(c, c);
    if (!/\s/.test(c)) prev = c;
    i++;
  }

  return { code: code.join(''), mask: mask.join('') };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Locate a declaration in the masked source. Handles:
 *   function X(            |  export function X(         |  export async function X(
 *   const X = (            |  export const X = async (   |  let/var X =
 *   export default function X(
 * Returns the offset of the START OF THE DECLARATION'S LINE, or -1.
 */
function findDeclOffset(mask: string, symbolName: string): number {
  const s = escapeRe(symbolName);
  const patterns = [
    `(?:^|\\n)[ \\t]*export[ \\t]+default[ \\t]+(?:async[ \\t]+)?function[ \\t]*\\*?[ \\t]*${s}[ \\t]*\\(`,
    `(?:^|\\n)[ \\t]*(?:export[ \\t]+)?(?:async[ \\t]+)?function[ \\t]*\\*?[ \\t]*${s}[ \\t]*\\(`,
    `(?:^|\\n)[ \\t]*(?:export[ \\t]+)?(?:const|let|var)[ \\t]+${s}[ \\t]*=`,
  ];
  let best = -1;
  for (const p of patterns) {
    const m = new RegExp(p).exec(mask);
    if (!m) continue;
    const at = m.index + (mask[m.index] === '\n' ? 1 : 0);
    if (best === -1 || at < best) best = at;
  }
  return best;
}

function bracketDelta(line: string): { delta: number } {
  let delta = 0;
  for (const ch of line) {
    if (ch === '(' || ch === '[' || ch === '{') delta++;
    else if (ch === ')' || ch === ']' || ch === '}') delta--;
  }
  return { delta };
}

// A trimmed line that ends with one of these is mid-expression, so the declaration
// continues even though every bracket is currently balanced. Covers the
// `const unitOf = (a, b) =>\n  <expression>;` shape used all over this codebase.
const CONTINUES = ['=>', '&&', '||', '??', '=', ',', '+', '-', '*', '/', '?', ':', '.', '|', '&', '(', '[', '{'];
const continuesLine = (t: string) => t === '' || CONTINUES.some((op) => t.endsWith(op));

/**
 * Extract the full source text of one web function/const, comments stripped and
 * all whitespace runs collapsed to a single space.
 *
 * Line numbers are deliberately NOT part of the result, so moving the function or
 * reformatting the file around it does not trip the drift alarm — only a change to
 * the function's own tokens does.
 */
export function webFnSource(relPath: string, symbolName: string): string {
  const abs = webPath(relPath);
  let raw: string;
  try {
    raw = readFileSync(abs, 'utf8');
  } catch {
    throw new Error(
      `[webSource] cannot read web file "${relPath}" (resolved to ${abs}). ` +
        `Paths are relative to the repo root and use forward slashes, e.g. 'app/(root)/dashboard/funcs.js'.`
    );
  }

  const { code, mask } = scanSource(raw);
  const start = findDeclOffset(mask, symbolName);
  if (start === -1) {
    throw new Error(
      `[webSource] symbol "${symbolName}" not found in ${relPath}. ` +
        `Recognised declaration forms: "function X(", "export function X(", "const X = ", "export const X = ". ` +
        `If web renamed or deleted it, the mobile port in the parity suite is almost certainly stale too.`
    );
  }

  const codeLines = code.split('\n');
  const maskLines = mask.split('\n');
  const startLine = code.slice(0, start).split('\n').length - 1;

  const picked: string[] = [];
  let depth = 0;
  let closed = false;

  for (let i = startLine; i < codeLines.length; i++) {
    picked.push(codeLines[i]);
    depth += bracketDelta(maskLines[i]).delta;
    // Inside a `{ ... }` body depth stays >= 1 until the closing brace, so the only
    // way to reach 0 is the real end of the declaration — unless the line is still
    // mid-expression (`... =>` / `... &&` / `... ,`), which CONTINUES covers.
    if (depth <= 0 && !continuesLine(maskLines[i].trim())) {
      closed = true;
      break;
    }
  }

  if (!closed) {
    throw new Error(
      `[webSource] could not find the end of "${symbolName}" in ${relPath} — brackets never rebalanced. ` +
        `This helper only understands ordinary function/const declarations.`
    );
  }

  return picked.join('\n').replace(/\s+/g, ' ').trim();
}

/** 1-based line number of the declaration in the file on disk. For citations ONLY — never hashed. */
export function webFnLine(relPath: string, symbolName: string): number {
  const raw = readFileSync(webPath(relPath), 'utf8');
  const { mask } = scanSource(raw);
  const start = findDeclOffset(mask, symbolName);
  if (start === -1) throw new Error(`[webSource] symbol "${symbolName}" not found in ${relPath}.`);
  return mask.slice(0, start).split('\n').length;
}

/** Stable short hash (first 12 hex chars of sha256) of the normalised source. */
export function webFnHash(relPath: string, symbolName: string): string {
  return createHash('sha256').update(webFnSource(relPath, symbolName), 'utf8').digest('hex').slice(0, 12);
}

/**
 * Fail LOUDLY when web's own copy of a mirrored formula changes.
 *
 * This is not a style check — a red here means the transcribed mirror in the parity
 * suite (and quite possibly the mobile port it guards) is now describing code that
 * no longer exists.
 */
export function expectWebUnchanged(relPath: string, symbolName: string, expectedHash: string): void {
  const actual = webFnHash(relPath, symbolName);
  if (actual === expectedHash) return;
  throw new Error(
    [
      '',
      '════════════════════════ WEB DRIFT ALARM ════════════════════════',
      `  file   : ${relPath}`,
      `  symbol : ${symbolName}  (declared at line ${webFnLine(relPath, symbolName)})`,
      `  recorded hash : ${expectedHash}`,
      `  current  hash : ${actual}`,
      '',
      "  web's formula changed — re-check the mobile port in this domain and",
      '  update the recorded hash once you have confirmed mobile still matches.',
      '',
      '  Do this, in order:',
      `    1. git log -p -- "${relPath}"   → read what actually changed in ${symbolName}.`,
      '    2. Decide: does mobile need the same change, or is this an intentional divergence?',
      '    3. If mobile needs it: fix mobile/ AND update the transcribed mirror in this suite.',
      '       If it is intentional: keep the mirror, and assert the difference with the reason.',
      `    4. Only then replace the recorded hash with ${actual}.`,
      '',
      '  Do NOT just paste the new hash to make this green. The hash is the alarm,',
      '  not the bug.',
      '═════════════════════════════════════════════════════════════════',
      '',
    ].join('\n')
  );
}
