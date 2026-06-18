'use client';
// Reusable IMS/GIS split control for a single expense/invoice row.
//
// Renders one of three compact states inside a table cell:
//   none    → "Put under control" button (flags the row for splitting)
//   pending → amber "Pending split" badge (click → calculate) + remove (×)
//   done    → green "Split r/r" badge (click → edit / reopen)
//
// Persistence is delegated to the host page via `onPersist(splitObjOrNull)` so each
// page keeps its own Firestore write (expenses_/companyExpenses/invoices_) and
// optimistic state update. Notifications are generic and handled here.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Split, X, Check, Loader2, RotateCcw } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { SPLIT_DEFAULT_RATIO, computeShares, curSymbol, splitStatusOf } from '../utils/splitUtils';
import { ensureSplitNotification, clearSplitNotification } from '../utils/utils';

const fmt = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SplitControl({
  row,
  entityType = 'expense',     // 'expense' | 'companyexpense' | 'invoice' (routing/label only)
  entityLabel = '',
  amount = 0,
  currency = '',
  uidCollection,
  currentUser,
  logActivity,
  onPersist,                  // async (splitObjOrNull) => persists { split } on the row
}) {
  const status = splitStatusOf(row);
  const sym = curSymbol(currency);
  const existing = row?.split || {};

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ratio, setRatio] = useState(existing.ratio ?? SPLIT_DEFAULT_RATIO);
  const [note, setNote] = useState(existing.note || '');

  const notifPayload = {
    entityType, entityId: row?.id, entityLabel, amount, currency,
    actorUid: currentUser?.uid, actorName: currentUser?.name,
  };
  const audit = (action, message, meta) => logActivity?.({
    type: `${entityType}.${action}`, entityType, entityId: row?.id, entityLabel,
    action, message, meta,
  });

  // none → pending (flag for splitting)
  const putUnderControl = async (e) => {
    e?.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await onPersist?.({
        status: 'pending', ratio: SPLIT_DEFAULT_RATIO,
        by: currentUser?.uid || '', byName: currentUser?.name || '', at: new Date().toISOString(),
      });
      await ensureSplitNotification(uidCollection, notifPayload);
      audit('splitPending', `${entityLabel || 'Item'} put under control — awaiting IMS/GIS split`);
    } finally { setBusy(false); }
  };

  // pending → none (unflag)
  const removeControl = async (e) => {
    e?.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await onPersist?.(null);
      await clearSplitNotification(uidCollection, entityType, row?.id);
      audit('splitRemoved', `${entityLabel || 'Item'} removed from IMS/GIS control`);
    } finally { setBusy(false); }
  };

  // save calculated split → done (clears the standing notification)
  const saveSplit = async () => {
    if (busy) return;
    const r = Math.min(100, Math.max(0, Number(ratio) || 0));
    const { imsShare, gisShare } = computeShares(amount, r);
    setBusy(true);
    try {
      await onPersist?.({
        status: 'done', ratio: r, imsShare, gisShare,
        by: currentUser?.uid || '', byName: currentUser?.name || '', at: new Date().toISOString(),
        note: note.trim(),
      });
      await clearSplitNotification(uidCollection, entityType, row?.id);
      audit('split', `${entityLabel || 'Item'} split ${r}/${100 - r} (IMS/GIS)`, { ratio: r, imsShare, gisShare });
      setOpen(false);
    } finally { setBusy(false); }
  };

  // done → pending (reopen) — re-raises the standing notification
  const reopen = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onPersist?.({ ...existing, status: 'pending', at: new Date().toISOString() });
      await ensureSplitNotification(uidCollection, notifPayload);
      audit('splitPending', `${entityLabel || 'Item'} split reopened`);
      setOpen(false);
    } finally { setBusy(false); }
  };

  const openModal = (e) => {
    e?.stopPropagation();
    setRatio(existing.ratio ?? SPLIT_DEFAULT_RATIO);
    setNote(existing.note || '');
    setOpen(true);
  };

  const preview = computeShares(amount, Math.min(100, Math.max(0, Number(ratio) || 0)));

  return (
    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
      {status === 'none' && (
        <button
          type="button"
          onClick={putUnderControl}
          disabled={busy}
          title="Put under control — flag this invoice for IMS/GIS split"
          className="inline-flex items-center gap-1 rounded-full transition-colors disabled:opacity-50"
          style={{ fontSize: '0.6rem', padding: '3px 10px', color: 'var(--endeavour)', background: '#f8fbff', border: '1px solid #d8e8f5' }}
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Split className="w-3 h-3" />}
          Put under control
        </button>
      )}

      {status === 'pending' && (
        <>
          <button
            type="button"
            onClick={openModal}
            disabled={busy}
            title="Pending IMS/GIS split — click to calculate"
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/30"
          >
            <StatusBadge label="Pending split" tone="amber" />
          </button>
          <button
            type="button"
            onClick={removeControl}
            disabled={busy}
            title="Remove from control"
            className="p-0.5 rounded-full hover:bg-[#fee2e2] disabled:opacity-50"
          >
            <X className="w-3 h-3" style={{ color: '#b45309' }} />
          </button>
        </>
      )}

      {status === 'done' && (
        <button
          type="button"
          onClick={openModal}
          disabled={busy}
          title={`Split done — IMS ${sym}${fmt(existing.imsShare)} · GIS ${sym}${fmt(existing.gisShare)} (click to edit)`}
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/30"
        >
          <StatusBadge tone="green" label={`Split ${existing.ratio ?? SPLIT_DEFAULT_RATIO}/${100 - (existing.ratio ?? SPLIT_DEFAULT_RATIO)}`} />
        </button>
      )}

      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ background: 'rgba(16,33,61,0.45)' }}
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden bg-white"
            style={{ border: '1px solid #b8ddf8', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#dbeeff', borderBottom: '1px solid #b8ddf8' }}>
              <span className="font-semibold" style={{ fontSize: '0.8rem', color: 'var(--chathams-blue)' }}>IMS / GIS split</span>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-white/60">
                <X className="w-4 h-4" style={{ color: 'var(--chathams-blue)' }} />
              </button>
            </div>

            <div className="p-4 space-y-3" style={{ color: 'var(--port-gore)' }}>
              <div className="flex items-center justify-between" style={{ fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--regent-gray)' }}>{entityLabel || 'Item'}</span>
                <span className="font-semibold">{sym}{fmt(amount)}</span>
              </div>

              <div>
                <label className="block mb-1 font-medium" style={{ fontSize: '0.68rem', color: 'var(--chathams-blue)' }}>% to IMS</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="100" value={ratio}
                    onChange={(e) => setRatio(e.target.value)}
                    className="h-7 px-3 rounded-full w-24" style={{ fontSize: '0.75rem', background: '#f8fbff', border: '1px solid #d8e8f5' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--regent-gray)' }}>% → GIS gets {100 - (Math.min(100, Math.max(0, Number(ratio) || 0)))}%</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {[50, 60, 70, 100].map(p => (
                    <button key={p} type="button" onClick={() => setRatio(p)}
                      className="rounded-full" style={{ fontSize: '0.58rem', padding: '2px 8px', background: Number(ratio) === p ? 'var(--endeavour)' : '#f8fbff', color: Number(ratio) === p ? 'white' : 'var(--chathams-blue)', border: '1px solid #d8e8f5' }}>
                      {p}/{100 - p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 rounded-xl p-2 text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.58rem', color: '#15803d' }}>IMS</div>
                  <div className="font-semibold" style={{ fontSize: '0.8rem', color: '#15803d' }}>{sym}{fmt(preview.imsShare)}</div>
                </div>
                <div className="flex-1 rounded-xl p-2 text-center" style={{ background: '#eff6ff', border: '1px solid #b8ddf8' }}>
                  <div style={{ fontSize: '0.58rem', color: 'var(--endeavour)' }}>GIS</div>
                  <div className="font-semibold" style={{ fontSize: '0.8rem', color: 'var(--endeavour)' }}>{sym}{fmt(preview.gisShare)}</div>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium" style={{ fontSize: '0.68rem', color: 'var(--chathams-blue)' }}>Note (optional)</label>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                  className="w-full p-2 rounded-xl" style={{ fontSize: '0.72rem', background: '#f8fbff', border: '1px solid #d8e8f5', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: '1px solid #eef5fc' }}>
              <button type="button" onClick={saveSplit} disabled={busy} className="blackButton py-1 disabled:opacity-50">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save split
              </button>
              {status === 'done' && (
                <button type="button" onClick={reopen} disabled={busy} className="whiteButton py-1 disabled:opacity-50">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reopen
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="whiteButton py-1 ml-auto disabled:opacity-50">
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
