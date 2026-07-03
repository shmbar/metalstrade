'use client';

import { useEffect, useContext, useRef } from 'react';
import { useGlobalSearch } from '../../contexts/useGlobalSearchContext';
import { UserAuth } from '../../contexts/useAuthContext';
import { loadData } from '../../utils/utils';
import { SettingsContext } from '../../contexts/useSettingsContext';

export default function GlobalSearchLoader() {
  const { uidCollection } = UserAuth();
  const { upsertSourceItems } = useGlobalSearch();
  const { settings, dateSelect } = useContext(SettingsContext);

  // Fetched rows cached per account + date range. A settings-only change (e.g. a
  // supplier renamed, margin threshold saved) re-runs the label mapping below over
  // these cached rows instead of re-downloading all three collections.
  const cacheRef = useRef({ key: null, rows: null });

  // helper: map IDs -> display labels
  const gQ = (z, y, x) => settings?.[y]?.[y]?.find(q => q.id === z)?.[x] || '';

  useEffect(() => {
    if (!uidCollection || Object.keys(settings).length === 0) return;

    const loadSearchData = async () => {
      try {
        /* ---------- FETCH (parallel, cached) ---------- */
        const cacheKey = `${uidCollection}|${dateSelect?.start || ''}|${dateSelect?.end || ''}`;
        let rows = cacheRef.current.key === cacheKey ? cacheRef.current.rows : null;
        if (!rows) {
          const [expenses, invoices, contracts] = await Promise.all([
            loadData(uidCollection, 'expenses', dateSelect),
            loadData(uidCollection, 'invoices', dateSelect),
            loadData(uidCollection, 'contracts', dateSelect),
          ]);
          rows = { expenses, invoices, contracts };
          cacheRef.current = { key: cacheKey, rows };
        }
        const { expenses, invoices, contracts } = rows;

        /* ---------- EXPENSES ---------- */

        upsertSourceItems(
          'expenses',
          (expenses || []).filter(Boolean).map(e => {
            const supplierLabel = gQ(e.supplier, 'Supplier', 'nname') || e.supplierName || '';
            const expTypeLabel = gQ(e.expType, 'Expenses', 'expType') || '';
            const currencyLabel = gQ(e.cur, 'Currency', 'cur') || e.cur || '';

            return {
              key: `expense_${e.id}`,
              route: '/expenses',
              rowId: e.id,
              title: `Expense • ${supplierLabel} • ${e.expense || ''}`,
              subtitle: `${e.salesInv || ''} • ${e.amount ?? ''}`,
              searchText: [
                supplierLabel,
                expTypeLabel,
                currencyLabel,
                e.expense,
                e.salesInv,
                e.comments,
                e.amount,
                e.paid === '222' ? 'paid' : 'unpaid',
              ].filter(Boolean).join(' ').toLowerCase()
            };
          })
        );

        /* ---------- INVOICES ---------- */
        upsertSourceItems(
          'invoices',
          (invoices || []).filter(Boolean).map(inv => {
            const clientLabel = inv?.final
              ? (inv?.client?.nname || '')
              : gQ(inv?.client, 'Client', 'nname');

            const invTypeLabel = gQ(inv?.invType, 'InvoiceType', 'invType') || inv?.invType || '';
            const currencyLabel = gQ(inv?.cur, 'Currency', 'cur') || inv?.cur || '';

            return {
              key: `invoice_${inv.id}`,
              route: '/invoices',
              rowId: inv.id,
              title: `Invoice • ${String(inv.invoice ?? '').padStart(4, '0')}`,
              subtitle: `${clientLabel || ''} • ${inv.container || ''} • ${inv.pol || ''}-${inv.pod || ''}`,
              searchText: [
                clientLabel,
                inv.invoice,
                inv.container,
                inv.pol,
                inv.pod,
                inv.origin,
                inv.delTerm,
                inv.packing,
                invTypeLabel,
                currencyLabel,
                inv.completed ? 'completed' : 'pending',
                inv.final ? 'final' : 'draft',
              ].filter(Boolean).join(' ').toLowerCase()
            };
          })
        );

        /* ---------- CONTRACTS ---------- */
        upsertSourceItems(
          'contracts',
          (contracts || []).filter(Boolean).map(c => {
            const supplierLabel = gQ(c.supplier, 'Supplier', 'nname') || '';
            const contTypeLabel = gQ(c.contType, 'ContainerType', 'contType') || c.contType || '';
            const sizeLabel = gQ(c.size, 'ContainerSize', 'size') || c.size || '';

            return {
              key: `contract_${c.id}`,
              route: '/contracts',
              rowId: c.id,
              title: `Contract • PO ${c.order || ''}`,
              subtitle: `${supplierLabel || ''} • ${c.pol || ''}-${c.pod || ''}`,
              searchText: [
                supplierLabel,
                c.order,
                c.pol,
                c.pod,
                c.origin,
                c.packing,
                sizeLabel,
                contTypeLabel,
                c.completed ? 'completed' : 'open',
              ].filter(Boolean).join(' ').toLowerCase()
            };
          })
        );

        /* ---------- ACCOUNTING (DERIVED) ---------- */
        const accountingRows = [];

        // From invoices -> Accounting
        (invoices || []).filter(Boolean).forEach(inv => {
          const clientLabel = inv?.final
            ? (inv?.client?.nname || '')
            : gQ(inv?.client, 'Client', 'nname');

          const invTypeLabel = gQ(inv?.invType, 'InvoiceType', 'invType') || inv?.invType || '';
          const currencyLabel = gQ(inv?.cur, 'Currency', 'cur') || inv?.cur || '';

          accountingRows.push({
            key: `accounting_invoice_${inv.id}`,
            route: '/accounting',
            rowId: inv.id,
            source: 'invoices',

            title: `Accounting • Invoice ${String(inv.invoice ?? '').padStart(4, '0')}`,
            subtitle: `${clientLabel || ''} • ${inv.container || ''} • ${inv.pol || ''}-${inv.pod || ''}`,

            searchText: [
              'accounting',
              'invoice',
              clientLabel,
              inv.invoice,
              invTypeLabel,
              currencyLabel,
              inv.container,
              inv.pol,
              inv.pod,
              inv.origin,
              inv.delTerm,
              inv.packing,
              inv.completed ? 'completed' : 'open',
              inv.final ? 'final' : 'draft',
              inv.totalAmount,
              inv.balanceDue,
            ].filter(Boolean).join(' ').toLowerCase()
          });
        });

        // From expenses -> Accounting
        (expenses || []).filter(Boolean).forEach(exp => {
          const supplierLabel = gQ(exp.supplier, 'Supplier', 'nname') || exp.supplierName || '';
          const expTypeLabel = gQ(exp.expType, 'Expenses', 'expType') || '';
          const currencyLabel = gQ(exp.cur, 'Currency', 'cur') || exp.cur || '';

          accountingRows.push({
            key: `accounting_expense_${exp.id}`,
            route: '/accounting',
            rowId: exp.id,
            source: 'expenses',

            // ✅ FIX: don't show "Expense" in title after Accounting
            title: `Accounting • ${supplierLabel || ''} • ${exp.expense || ''}`,
            // ✅ put "Expense" label into subtitle instead
            subtitle: `Expense • ${exp.salesInv || ''} • ${exp.amount ?? ''}`,

            searchText: [
              'accounting',
              'expense',
              supplierLabel,
              exp.expense,
              exp.salesInv,
              expTypeLabel,
              currencyLabel,
              exp.amount,
              exp.comments,
              exp.paid === '222' ? 'paid' : 'unpaid',
            ].filter(Boolean).join(' ').toLowerCase()
          });
        });

        upsertSourceItems('accounting', accountingRows);

      } catch (err) {
        console.error('Global search preload failed', err);
      }
    };

    loadSearchData();
  }, [uidCollection, settings, dateSelect]);

  return null;
}
