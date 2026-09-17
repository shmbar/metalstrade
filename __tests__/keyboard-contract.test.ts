import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/*
 * Every scrollable in the app must handle the keyboard the same way.
 *
 * The client reported fields hidden behind the keyboard repeatedly, on different screens
 * each time — the signature of per-screen handling rather than one shared rule. These
 * checks fail the build if a screen grows a scroll container that opts out, or if anyone
 * reaches for KeyboardAvoidingView again (it only shrinks its own frame, so a field
 * further down a form stays exactly where it was — under the keyboard).
 */
const ROOT = path.resolve(__dirname, '../mobile');
const files: string[] = [];
const walk = (d: string) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx$/.test(e.name)) files.push(p);
  }
};
walk(path.join(ROOT, 'app'));
walk(path.join(ROOT, 'src'));
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/');

// Screen and Sheet ARE the shared handling; Motion/chart wrappers never hold a field.
const OWNS_KEYBOARD = new Set(['src/components/ui/Screen.tsx', 'src/components/ui/Sheet.tsx']);

describe('keyboard contract', () => {
  it('every vertical scroll container uses the shared keyboard props', () => {
    // Reads a tag's attributes properly: an arrow function inside a prop contains ">",
    // so a naive regex stops early and misses the spread it is looking for.
    const attrsOf = (src: string, from: number) => {
      let depth = 0;
      for (let i = from; i < src.length; i++) {
        const c = src[i];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '>' && depth === 0 && src[i - 1] !== '=') return src.slice(from, i);
      }
      return src.slice(from);
    };
    const offenders: string[] = [];
    for (const f of files) {
      if (OWNS_KEYBOARD.has(rel(f))) continue;
      const s = fs.readFileSync(f, 'utf8');
      const re = /<(FlatList|ScrollView|Animated.ScrollView)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(s))) {
        const attrs = attrsOf(s, m.index + m[0].length);
        // useRef<FlatList>(null) is a type, not a rendered list.
        if (!attrs.trim() && /(useRef|Ref)<$/.test(s.slice(Math.max(0, m.index - 8), m.index + 1))) continue;
        if (/horizontal/.test(attrs)) continue; // a sideways strip holds no fields
        if (/keyboardScrollProps/.test(attrs)) continue;
        offenders.push(`${rel(f)}: <${m[1]}>`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('nobody reintroduces KeyboardAvoidingView', () => {
    // The rendered element, not the note in lib/keyboard.tsx explaining why it is not used.
    const offenders = files.filter((f) => /<KeyboardAvoidingView/.test(fs.readFileSync(f, 'utf8'))).map(rel);
    expect(offenders).toEqual([]);
  });

  it('no form opens as an iOS page sheet', () => {
    // Inside a page sheet views report positions relative to the sheet while the keyboard
    // reports its own relative to the screen, so the Save bar landed short of the keyboard
    // (contract/invoice edit, build 37).
    const offenders = files
      .filter((f) => /_layout\.tsx$/.test(f) && /presentation:\s*'(modal|formSheet|pageSheet)'/.test(fs.readFileSync(f, 'utf8')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('sheets lift by the keyboard height instead of measuring inside the Modal', () => {
    // Measuring a view inside a Modal on its first presentation returns nothing, which left
    // Cash Flow → Add Entry behind the keyboard on first open (build 37).
    const sheet = fs.readFileSync(path.join(ROOT, 'src/components/ui/Sheet.tsx'), 'utf8');
    expect(sheet).not.toMatch(/useKeyboardOverlap/);
    expect(sheet).toContain("withTiming(keyboard.height");
  });

  it('text fields move to the next field on Return instead of dropping the keyboard', () => {
    const field = fs.readFileSync(path.join(ROOT, 'src/components/ui/TextField.tsx'), 'utf8');
    expect(field).toMatch(/focusNext/);
    expect(field).toMatch(/submitBehavior: 'submit'/);
  });

  it('the keyboard state listens to what the keyboard DID, not only what it announced', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/keyboard.tsx'), 'utf8');
    for (const ev of ['keyboardDidShow', 'keyboardDidHide', 'keyboardDidChangeFrame', 'keyboardWillShow', 'keyboardWillHide']) {
      expect(src).toContain(`'${ev}'`);
    }
  });

  it('opening a sheet ends editing on the screen behind it, and focuses only once shown', () => {
    const sheet = fs.readFileSync(path.join(ROOT, 'src/components/ui/Sheet.tsx'), 'utf8');
    expect(sheet).toContain('Keyboard.dismiss()');
    expect(sheet).toContain('onShow={onShown}');
    expect(sheet).toContain('syncKeyboard()');
    expect(sheet).toContain('flushAutoFocus()');
    expect(sheet).toContain('deferAutoFocus: true');
    const field = fs.readFileSync(path.join(ROOT, 'src/components/ui/TextField.tsx'), 'utf8');
    expect(field).toContain('autoFocus={deferFocus ? false : autoFocus}');
  });

  it('leaving a screen ends editing, so a keyboard never carries over onto the next form', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'app/(app)/_layout.tsx'), 'utf8');
    expect(layout).toContain('const screenKey = segments.join');
    expect(layout.replace(/\s+/g, ' ')).toContain('useEffect(() => { Keyboard.dismiss(); }, [screenKey]);');
  });

  it('nobody autofocuses a raw TextInput (it would bypass the sheet hand-off)', () => {
    const offenders: string[] = [];
    for (const f of files) {
      if (rel(f) === 'src/components/ui/TextField.tsx') continue;
      const src = fs.readFileSync(f, 'utf8');
      const re = /<TextInput\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        // Read the tag's attributes properly (a prop's arrow function contains ">").
        let depth = 0;
        let end = src.length;
        for (let i = m.index + m[0].length; i < src.length; i++) {
          const c = src[i];
          if (c === '{') depth++;
          else if (c === '}') depth--;
          else if (c === '>' && depth === 0 && src[i - 1] !== '=') {
            end = i;
            break;
          }
        }
        if (/\bautoFocus\b/.test(src.slice(m.index, end))) offenders.push(rel(f));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the shared props really do carry iOS keyboard insets and tap-through', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/keyboard.tsx'), 'utf8');
    expect(src).toMatch(/automaticallyAdjustKeyboardInsets: Platform\.OS === 'ios'/);
    expect(src).toMatch(/keyboardShouldPersistTaps: 'handled'/);
  });
});
