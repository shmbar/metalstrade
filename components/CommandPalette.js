'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  LayoutDashboard, FileText, Receipt, Wallet, TrendingUp,
  Package, Layers, Settings, Calculator, Ship, BarChart3,
  Building2, FlaskConical, ArrowRight, Search,
} from 'lucide-react';
import { useGlobalSearch } from '../contexts/useGlobalSearchContext';

// Pages reachable via Cmd-K. Order = display order. Icons are decorative.
const NAV_ITEMS = [
  { label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard, keywords: 'home overview' },
  { label: 'Contracts', route: '/contracts', icon: FileText, keywords: 'po purchase order supplier' },
  { label: 'Invoices', route: '/invoices', icon: Receipt, keywords: 'sales client receivable' },
  { label: 'Expenses', route: '/expenses', icon: Wallet, keywords: 'supplier bill payable' },
  { label: 'Company Expenses', route: '/companyexpenses', icon: Building2, keywords: 'overhead' },
  { label: 'Cashflow', route: '/cashflow', icon: TrendingUp, keywords: 'cash money debt forecast' },
  { label: 'Margins', route: '/margins', icon: BarChart3, keywords: 'profit margin analysis' },
  { label: 'Stocks', route: '/stocks', icon: Package, keywords: 'inventory stock material' },
  { label: 'Material Tables', route: '/materialtables', icon: Layers, keywords: 'element composition ni cr mo' },
  { label: 'Formulas', route: '/formulas', icon: Calculator, keywords: 'pricing formula calculation' },
  { label: 'Shipment', route: '/shipment', icon: Ship, keywords: 'container tracking shipping' },
  { label: 'Analysis', route: '/analysis', icon: FlaskConical, keywords: 'data analysis report' },
  { label: 'Settings', route: '/settings', icon: Settings, keywords: 'config supplier client setup' },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { items } = useGlobalSearch();

  // Global Cmd-K / Ctrl-K shortcut. We attach at document level so it works
  // regardless of which input is currently focused.
  useEffect(() => {
    const onKeyDown = (e) => {
      const isCmdK = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey);
      if (isCmdK) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      // Esc closes the palette (cmdk does not handle this for us — Command is a
      // controlled component, so its open state lives here).
      if (e.key === 'Escape') {
        setOpen((prev) => (prev ? false : prev));
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Reset typed query when palette closes — opening it again should start fresh.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const go = (route, rowId, source) => {
    setOpen(false);
    if (rowId) {
      const params = new URLSearchParams();
      params.set('focus', rowId);
      if (source) params.set('source', source);
      router.push(`${route}?${params.toString()}`);
    } else {
      router.push(route);
    }
  };

  // Limit the result list — without a cap, typing a common word like "1" can
  // dump hundreds of rows into the DOM.
  const filteredItems = query.trim() ? items.slice(0, 30) : [];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette (Ctrl+K)"
        title="Search & navigate (Ctrl+K)"
        className="fixed bottom-4 right-20 z-40 hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-[#d8e8f5] shadow-md hover:shadow-lg transition-shadow"
      >
        <Search className="w-3.5 h-3.5 text-[var(--chathams-blue)]" />
        <span className="text-[0.62rem] text-[var(--regent-gray)] font-medium">
          Ctrl <span className="opacity-50">+</span> K
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
      />
      <Command
        label="Command Palette"
        className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl border border-[#d8e8f5] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <div className="flex items-center gap-2 px-3 border-b border-[#e6eef7]">
          <Search className="w-4 h-4 text-[var(--regent-gray)] flex-shrink-0" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search invoices, contracts, expenses, or jump to a page…"
            className="w-full h-11 outline-none bg-transparent text-sm text-[var(--port-gore)] placeholder:text-[var(--regent-gray)]"
            autoFocus
          />
          <kbd className="text-[0.6rem] px-1.5 py-0.5 rounded border border-[#d8e8f5] text-[var(--regent-gray)]">
            Esc
          </kbd>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-xs text-[var(--regent-gray)]">
            No results.
          </Command.Empty>

          <Command.Group
            heading="Navigation"
            className="text-[0.6rem] uppercase tracking-wide text-[var(--regent-gray)] font-semibold px-2 py-1"
          >
            {NAV_ITEMS.map(({ label, route, icon: Icon, keywords }) => (
              <Command.Item
                key={route}
                value={`${label} ${keywords}`}
                onSelect={() => go(route)}
                className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm text-[var(--port-gore)] aria-selected:bg-[#dbeeff]"
              >
                <Icon className="w-4 h-4 text-[var(--endeavour)]" />
                <span className="flex-1">{label}</span>
                <span className="text-[var(--regent-gray)] text-xs">{route}</span>
                <ArrowRight className="w-3 h-3 text-[var(--regent-gray)] opacity-0 aria-[selected=true]:opacity-100" />
              </Command.Item>
            ))}
          </Command.Group>

          {filteredItems.length > 0 && (
            <Command.Group
              heading="Records"
              className="text-[0.6rem] uppercase tracking-wide text-[var(--regent-gray)] font-semibold px-2 py-1 mt-1"
            >
              {filteredItems.map((item) => (
                <Command.Item
                  key={item.key}
                  value={item.searchText}
                  onSelect={() => go(item.route, item.rowId, item.source)}
                  className="flex flex-col items-start gap-0.5 px-2 py-2 rounded-md cursor-pointer aria-selected:bg-[#dbeeff]"
                >
                  <span className="text-sm text-[var(--port-gore)] truncate w-full">
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="text-xs text-[var(--regent-gray)] truncate w-full">
                      {item.subtitle}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div className="flex items-center gap-3 px-3 py-2 border-t border-[#e6eef7] text-[0.58rem] text-[var(--regent-gray)]">
          <span><kbd className="px-1 py-0.5 rounded border border-[#d8e8f5]">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.5 rounded border border-[#d8e8f5]">↵</kbd> open</span>
          <span><kbd className="px-1 py-0.5 rounded border border-[#d8e8f5]">Esc</kbd> close</span>
        </div>
      </Command>
    </div>
  );
}
