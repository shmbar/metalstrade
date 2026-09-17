'use client';

/* What a column HOLDS — asked by the column picker (which columns can be summed,
 * and which to offer first) and by the totals (whether to put a currency on it).
 *
 * Names, because nothing in the data distinguishes 18.975 tonnes from $18.975:
 * both are just numbers. A page can always overrule with meta — `money: false`
 * marks a count or a weight, `money: true` forces currency, `excludeFromQuickSum`
 * takes the column out of Quick Sum altogether — and meta wins over every guess
 * here. Only the guesses changed: before this, one page set `money: false` on its
 * three quantity columns and every other page's tonnage was stamped "$".
 */
const text = (col) => {
  const h = col?.columnDef?.header;
  return `${col?.columnDef?.accessorKey ?? col?.id ?? ''} ${typeof h === 'string' ? h : ''}`.toLowerCase();
};

// A reference, not a measurement: PO 280526 and invoice 2630989 add up to nothing.
const IDENTIFIER = /\b(po|order|invoice|inv|ref|reference|no|num|number|id|cert|container|salesinv|expense)\b|(^|[^a-z])(po#|inv#)/;

// A count or a weight — never money.
const QUANTITY = /\b(qty|quantity|weight|wt|mt|kgs?|kilos?|tons?|tonnes?|lbs?|pieces?|pcs|units?|packages?|containers?|count|shipped|remaining|gross|net|tarre|tare)\b|qnty|poweight|shiipedweight|qntyreceived/;

// Money, when nothing says otherwise.
const MONEY = /\b(amount|amt|total|value|price|cost|balance|blnc|payment|pmnt|prepayment|paid|due|margin|profit|deviation|fee|freight|expense)\b|unitprc|totalpo/;

// A price or cost PER unit, an average or a rate: $8,460/MT + $7,300/MT is not
// the price of anything. Every `unitPrc` column in the app is one of these —
// Contracts Review's "Purchase Value" included, which holds the product's unit
// price — so the key decides it even where the header does not say "unit".
const RATE = /unit ?price|unitprc|unitprice|\bprice per\b|\bcost per\b|\bper (mt|kg|ton|tonne|unit)\b|\/ ?(mt|kg|ton|tonne|unit)\b|\bavg\b|\baverage\b|avgprice|avgcost|\brate\b/;

export const isIdentifierColumn = (col) => IDENTIFIER.test(text(col));
export const isRateColumn = (col) => RATE.test(text(col));
export const isQuantityColumn = (col) => QUANTITY.test(text(col));

/** Money unless the column (or its meta) says it is a count/weight. */
export const isMoneyColumn = (col) => {
  const meta = col?.columnDef?.meta;
  if (typeof meta?.money === 'boolean') return meta.money;
  const t = text(col);
  if (QUANTITY.test(t) && !MONEY.test(t)) return false;
  return true;
};

/** How a number column should READ in a spreadsheet: 'money' ($/€ by row),
 *  'quantity' (three decimals) or 'plain'. Stricter than isMoneyColumn, whose
 *  "money unless told otherwise" is right for a running total but would put a
 *  dollar sign on a column nobody named as money. */
export const numberKind = (col) => {
  const meta = col?.columnDef?.meta;
  if (meta?.money === true) return 'money';
  const t = text(col);
  if (meta?.money === false || (QUANTITY.test(t) && !MONEY.test(t))) return 'quantity';
  return MONEY.test(t) ? 'money' : 'plain';
};

/** Offer order in the picker: quantities first, then money, then the rest. */
export const columnRank = (col) => (isQuantityColumn(col) ? 0 : MONEY.test(text(col)) ? 1 : 2);
