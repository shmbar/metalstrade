/* Turning a typed material description into the GRADE it represents.

   The stock list holds one description per PO line, typed by hand or lifted from a
   supplier document by the AI reader, so the same grade arrives spelled a dozen ways:

     IN 718 Chips · IN 718 Chips (51Ni 21Cr 3Mo) · IN 718 Chips (51Ni21Cr 3Mo)
     Hast X · Hast X (47Ni 21Cr 8Mo) · Hast X (47Ni 21Cr8Mo)
     718 off grade Turnings · 718 Turnings off grade
     Ti 6-4 Powder · Ti 6/4 powder
     16.41Ni 9.05Cr 0.81Mo Ingots … 31.14Ni 16.5Cr 2.4Mo Ingots   (21 of these)

   Every one of those was its own line in "Avg Cost Price per Grade", so a 230 MT
   position read as twenty-one 9 MT ones and there was no total per grade to look at.
   This derives a key that folds the spellings together. */

// Typed on a Russian keyboard layout: these Cyrillic letters are pixel-identical to
// Latin ones and appear mid-word in real rows ("13.26Сr" carries a Cyrillic С).
const CYRILLIC = 'СРТОАВЕМНКХасреоху'
const LATIN = 'CPTOABEMHKXacpeoxy'

// Element symbols an assay is written from. Order matters only for the label.
const ELEMENTS = ['Ni', 'Cr', 'Mo', 'Co', 'Nb', 'Ta', 'Ti', 'Al', 'Fe', 'Cu', 'Mn',
  'Si', 'Sn', 'Zr', 'Hf', 'Mg', 'Ca', 'W', 'V', 'B', 'C', 'S', 'P', 'N']
const ELEMENT_SET = new Set(ELEMENTS.map(e => e.toLowerCase()))

/* Words that describe the FORM or condition of a lot rather than naming a grade.
   A description made only of an assay plus these can be safely collapsed to its
   element sequence; one containing anything else (an alloy name, "Nickel", a
   supplier note) is left alone, because that word is what makes it a grade. */
const FORM_WORDS = new Set(['ingots', 'ingot', 'turnings', 'turning', 'chips', 'chip',
  'solids', 'solid', 'powder', 'powders', 'granules', 'microgranules', 'fines', 'mix',
  'scrap', 'bars', 'bar', 'discs', 'disc', 'grindings', 'refinery', 'off', 'grade',
  'per', 'assay', 'and'])

const deCyrillic = (s) => s.replace(/[\u0400-\u04FF]/g, ch => {
  const i = CYRILLIC.indexOf(ch)
  return i === -1 ? ch : LATIN[i]
})

// "16.41Ni 9.05Cr 0.81Mo" -> ['Ni','Cr','Mo'], and the span it occupied.
const ASSAY = /(\d+(?:[.,]\d+)?)\s*([A-Za-z]{1,2})/g

const titleElement = (sym) => {
  const hit = ELEMENTS.find(e => e.toLowerCase() === sym.toLowerCase())
  return hit || sym
}

/* Returns { key, label } — key groups, label names the group. `label` is null when
   the original description should be used as the name (the usual case); it is set
   only where the group is a synthesised one, i.e. a collapsed assay family. */
export const gradeKeyOf = (description) => {
  const original = String(description ?? '').trim()
  if (!original) return { key: '', label: null }

  let s = deCyrillic(original)
  // A trailing/embedded "(...)" is an assay annotation or a note, never a different
  // grade: "IN 718 (51Ni 21Cr 3Mo)" and "IN 718" are the same material.
  s = s.replace(/\([^)]*\)/g, ' ')

  // Collect the assay pairs and what is left once they are removed.
  const elements = []
  const rest = s.replace(ASSAY, (m, _num, sym) => {
    if (!ELEMENT_SET.has(sym.toLowerCase())) return m
    elements.push(titleElement(sym))
    return ' '
  })

  const restWords = rest.split(/[^A-Za-z0-9]+/).filter(Boolean)
  // 3+ elements is what separates the unnamed "NiCrMo Ingots" family from a named
  // alloy that merely carries two figures; below that the numbers still distinguish
  // real grades ("20Ni20Cr" is not "55Ni10Cr", and they price 2.5x apart).
  const collapsible = elements.length >= 3 && restWords.every(w => FORM_WORDS.has(w.toLowerCase()))

  let label = null
  let words
  if (collapsible) {
    const seq = [...new Set(elements)].join('')
    const form = restWords.filter(w => w.toLowerCase() !== 'and')
    label = [seq, ...form].join(' ')
    words = [seq, ...form]
  } else {
    words = s.replace(/[/_]/g, '-').split(/[^A-Za-z0-9.\-]+/).filter(Boolean)
  }

  /* Sorted, lower-cased tokens: the key must not care about word order, because the
     same grade is typed both ways ("718 off grade Turnings" / "718 Turnings off
     grade", "Fines Mix" / "Mix Fines"). */
  const key = words.map(w => w.toLowerCase().replace(/\.$/, '')).sort().join(' ')
  return { key, label }
}

/* The name to show for a group.

   A group of ONE is shown exactly as it was typed — an unfolded row must look no
   different than it does today, assay annotation and all. Only where several
   spellings folded together is the parenthetical dropped, because that is usually
   the very thing they disagreed on ("IN 718 Turnings (51Ni 21Cr 3Mo)" vs
   "(51Ni21Cr 3Mo)"); the exact spellings are still one click away in the expand. */
export const gradeLabel = (synthesised, originals) => {
  if (synthesised) return synthesised
  if (originals.length === 1) return originals[0]
  const counts = new Map()
  originals
    .map(o => o.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .forEach(o => counts.set(o, (counts.get(o) || 0) + 1))
  return [...counts.entries()].sort((x, y) =>
    y[1] - x[1] || x[0].length - y[0].length || x[0].localeCompare(y[0]))[0]?.[0] || originals[0]
}
