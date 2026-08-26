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
  ClipboardCheck,
  ClipboardList,
  Copy,
  Database,
  Download,
  Eraser,
  Eye,
  FileSpreadsheet,
  FileText,
  FileUp,
  Files,
  History,
  Import,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Paperclip,
  PanelTopOpen,
  PenLine,
  Plus,
  RotateCcw,
  Save,
  ScrollText,
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
} from 'lucide-react';

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
  confirm: Check,

  // ── Documents & output ─────────────────────────────────────────────────
  pdf: FileText,
  excel: FileSpreadsheet,
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
  payments: Banknote,
  expenses: PanelTopOpen,
  stocks: Warehouse,
  shipment: Truck,
  certs: ShieldCheck,
  settlement: SendToBack,
  paste: ClipboardCheck,
  audit: ClipboardList,
  analysis: TrendingUp,
  sum: Sigma,
  // The IMS/GIS split — a branch, not a Copy. It is now the whole label on the
  // "put under control" button, so the glyph has to carry the meaning alone.
  split: Split,
  ai: Sparkles,
  history: History,
  comments: MessageSquare,
  newRecord: LayoutGrid,
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

export default BtnIcon;
