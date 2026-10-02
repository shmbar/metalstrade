'use client';

/**
 * One icon per action, for the whole app.
 *
 * Before this file, the same action wore a different glyph on every page: Save
 * was `Save` in contract details, `VscSaveAs` in payments and sales contracts,
 * and `IoAddCircleOutline` (a PLUS — the wrong verb entirely) in supplier
 * expenses. Delete was `Trash`, `Trash2`, `MdDeleteOutline` and `VscArchive`.
 * Close was `X`, `VscClose` and `CircleX`. Add was `CirclePlus`, `Plus`,
 * `IoAddCircleOutline` and, on Material Tables, a literal "+" typed into the
 * label. Sizes disagreed too — size-4, w-3.5, w-3, size={12}, size={14} and
 * scale-110 all in the same control band.
 *
 * So: the glyph is chosen HERE, by what the button does, and rendered at the
 * one --icon-btn size via the .btn-icon class. A call site names an action, not
 * an icon. Adding a button means adding a row to ACTION_ICONS, not importing
 * from lucide again — that is what keeps the pages identical.
 *
 * Everything is lucide-react. The app carries react-icons too, but only as a
 * leftover; nothing new should reach for it.
 */

import {
  Banknote,
  Boxes,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Copy,
  Database,
  Download,
  Eraser,
  Eye,
  FileChartColumn,
  FileText,
  FileUp,
  Files,
  FlaskConical,
  FolderInput,
  Hash,
  History,
  Import,
  Info,
  LayoutGrid,
  Loader2,
  Merge,
  MessageSquare,
  Paperclip,
  PanelTopOpen,
  PenLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ScrollText,
  SendHorizontal,
  SendToBack,
  Search,
  ShieldCheck,
  Sigma,
  Sparkles,
  Split,
  Trash,
  TrendingUp,
  Truck,
  Undo2,
  Warehouse,
  X,
  createLucideIcon,
} from 'lucide-react';

/* Excel — the Excel logo's shape (an X tile in front of a sheet), drawn in lucide's own
   line style so it sits with every other glyph here. Chosen 2026-09-30 from three options
   (a plain grid, a grid with a down arrow, this): the plain grid read as the Columns
   button beside it on every table toolbar, and FileSpreadsheet before it read as any
   document at 14px. This one reads as Excel without its tooltip. Built with lucide's
   createLucideIcon, so size / strokeWidth / className behave exactly like the rest. */
const ExcelMark = createLucideIcon('ExcelMark', [
  ['path', { d: 'M13 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-1', key: 'sheet' }],
  ['path', { d: 'M16 8h5', key: 'row1' }],
  ['path', { d: 'M16 12h5', key: 'row2' }],
  ['path', { d: 'M16 16h5', key: 'row3' }],
  ['rect', { x: '3', y: '6', width: '10', height: '12', rx: '2', key: 'tile' }],
  ['path', { d: 'm6 9 4 6', key: 'x1' }],
  ['path', { d: 'm10 9-4 6', key: 'x2' }],
]);

/**
 * action name → glyph. Keys are lowercase and hyphen-free so a call site can
 * pass a plain verb ("save", "add", "close") without thinking about casing.
 */
export const ACTION_ICONS = {
  // ── The core verbs. These are the ones that were inconsistent. ──────────
  save: Save,
  saving: Loader2,
  add: Plus,
  // Trash was already the majority choice for Delete (contract details, the
  // product tables, all four settings tabs); the odd ones out were Trash2,
  // MdDeleteOutline and VscArchive — an ARCHIVE box on a button that deletes.
  delete: Trash,
  remove: Trash,
  clear: Eraser,
  close: X,
  cancel: X,
  update: PenLine,
  edit: PenLine,
  find: Search,
  search: Search,
  duplicate: Copy,
  copy: Copy,
  undo: Undo2,
  reopen: RotateCcw,
  // Fetch again now — the market strips' refresh (RotateCcw is reopen/undo-ish).
  refresh: RefreshCw,
  confirm: Check,
  // A panel's list toggle: down hides the list, up brings it back (the
  // floating selection tally in components/SumPanel).
  collapse: ChevronDown,
  expand: ChevronUp,
  // An inline section's own header (components/CollapsibleSection): the chevron
  // points down while the section is open and is turned to point right when closed.
  section: ChevronDown,
  // Every section at once — Margins' "Collapse all" / "Expand all" months.
  collapseall: ChevronsDownUp,
  expandall: ChevronsUpDown,

  // ── Documents & output ─────────────────────────────────────────────────
  pdf: FileText,
  excel: ExcelMark,
  export: Download,
  preview: Eye,
  import: Import,
  autofill: FileUp,
  attachments: Database,
  files: Paperclip,
  document: FileText,

  // ── Records this app knows about ───────────────────────────────────────
  contract: FileText,
  contracts: Files,
  invoice: Files,
  invoices: ScrollText,
  // Invoice NUMBERS (not invoices): the selection panel's "copy invoice numbers only",
  // for a bank payment reference. A # says numbers; the scroll it wore read as a
  // second document next to the Excel button.
  numbers: Hash,
  payments: Banknote,
  expenses: PanelTopOpen,
  stocks: Warehouse,
  shipment: Truck,
  // A record handed over to another page's list (Company Expenses → Misc Invoices).
  move: FolderInput,
  certs: ShieldCheck,
  settlement: SendToBack,
  paste: ClipboardCheck,
  audit: ClipboardList,
  analysis: TrendingUp,
  // A page's situation report (Cashflow → Report): a document with a chart on it.
  report: FileChartColumn,
  sum: Sigma,
  // Grades & chemistry (utils/grades.js). One flask for a lot's assay — the popup on
  // Stocks and the editor in Materials Breakdown are the same idea. Merge folds several
  // spellings into one declared grade.
  assay: FlaskConical,
  merge: Merge,
  // The IMS/GIS split — a branch, not a Copy. It is now the whole label on the
  // "put under control" button, so the glyph has to carry the meaning alone.
  split: Split,
  ai: Sparkles,
  // Submit a message (the Assistant input).
  send: SendHorizontal,
  history: History,
  // Small print that would otherwise take a paragraph of page height.
  info: Info,
  comments: MessageSquare,
  newRecord: LayoutGrid,
  // Cashflow Pending — an invoice (or the stock bought on it) on hold, out of the
  // totals. The same clock marks every held figure on that page.
  pending: Clock,
  shared: Boxes,
};

/**
 * The glyph for a button label.
 *
 *   <BtnIcon action="save" />
 *
 * Renders nothing (not a blank box) for an unknown action, so a typo degrades
 * to today's iconless button instead of throwing. `spin` is for the in-flight
 * state of a button that keeps its label — Save → Saving….
 */
export function BtnIcon({ action, spin = false, className = '', ...rest }) {
  const Glyph = ACTION_ICONS[action];
  if (!Glyph) return null;
  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      className={`btn-icon${spin ? ' animate-spin' : ''}${className ? ' ' + className : ''}`}
      {...rest}
    />
  );
}

/**
 * The trailing adornment inside a search field: a magnifier while the field is
 * empty, a clear mark once it has text.
 *
 *   <div className="relative …">
 *     <input … />
 *     <SearchAdornment value={globalFilter} onClear={() => setGlobalFilter('')} />
 *   </div>
 *
 * Same reason this file exists at all: every search field had picked its own
 * glyph, size and hover colour — TiDeleteOutline at 16px here, a lucide X at
 * 14px there, IoClose at 20px in global search, and a raw `text-red-500` hover
 * on three of them. The wrapper needs `position: relative`; everything else —
 * placement, size, colour, hit box — is settled here and in .field-clear.
 *
 * `onClear` is optional: a read-only filter display can show the magnifier
 * alone. Positioning can be nudged per field with `className` when a field's
 * padding differs, but prefer leaving it.
 */
export function SearchAdornment({ value, onClear, label = 'Clear search', className = '' }) {
  const hasText = value != null && String(value) !== '';
  const place = `absolute right-2 top-1/2 -translate-y-1/2${className ? ' ' + className : ''}`;
  if (!hasText || !onClear) {
    return (
      <span className={`field-search ${place}`}>
        <Search aria-hidden="true" focusable="false" />
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClear}
      className={`field-clear cursor-pointer ${place}`}
    >
      <X aria-hidden="true" focusable="false" />
    </button>
  );
}

export default BtnIcon;
