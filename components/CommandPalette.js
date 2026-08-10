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
  { label: 'Storage Costs', route: '/storagecosts', icon: Building2, keywords: 'storage warehouse cost per mt demurrage rate' },
  { label: 'Material Tables', route: '/materialtables', icon: Layers, keywords: 'element composition ni cr mo' },
  { label: 'Incoterms', route: '/incoterms', icon: FileText, keywords: 'delivery terms exw fob cif fca dap ddp shipping reference' },
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
    // Topbar search pill (and anything else) can open the palette via this event.
    const onOpenEvent = () => setOpen(true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('ims:openPalette', onOpenEvent);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('ims:openPalette', onOpenEvent);
    };
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
        className="fixed bottom-4 right-20 z-40 hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--line-strong)] shadow-md hover:shadow-lg transition-shadow"
      >
        <Search className="w-3.5 h-3.5 text-[var(--chathams-blue)]" />
        <span className="responsiveTextTable text-[var(--regent-gray)] font-medium">
          Ctrl <span className="opacity-50">+</span> K
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-command flex items-start justify-center pt-[12vh] px-4"
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(2px)' }}
      onClick={() => setOpen(false)}
    >
      {/* One scrim, not two. The parent already paints --overlay with a 2px blur;
          this added a second bg-black/40 + backdrop-blur-sm on top, so the page
          behind was darkened and blurred twice over — and black/40 is a hardcoded
          colour that ignores the theme's own overlay token. */}
      <Command
        label="Command Palette"
        className="relative w-full max-w-xl rounded-2xl bg-[var(--bg-card)] shadow-2xl border border-[var(--line-strong)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <div className="flex items-center gap-2 px-3 border-b border-[var(--selago)]">
          <Search className="w-4 h-4 text-[var(--regent-gray)] flex-shrink-0" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search invoices, contracts, expenses, or jump to a page…"
            className="w-full h-11 outline-none bg-transparent focus:outline-none responsiveTextInput text-[var(--port-gore)] placeholder:text-[var(--regent-gray)]"
            autoFocus
          />
          {/* flex-shrink-0 is load-bearing: the input beside this is w-full, so
              without it flexbox shrinks the badge until "Esc" wraps to two lines. */}
          <kbd className="responsiveTextTable px-1.5 py-0.5 rounded border border-[var(--line-strong)] text-[var(--regent-gray)] flex-shrink-0 whitespace-nowrap">
            Esc
          </kbd>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center responsiveText text-[var(--regent-gray)]">
            No results.
          </Command.Empty>

          <Command.Group
            heading="Navigation"
            /* Heading styling lives in globals.css on [cmdk-group-heading]. It used
               to be here, on the GROUP — which wraps the items, and text-transform
               and font-weight inherit, so every entry rendered as UPPERCASE
               SEMIBOLD when the source only ever asked for a sentence-case label. */
            className="px-2 py-1"
          >
            {NAV_ITEMS.map(({ label, route, icon: Icon, keywords }) => (
              <Command.Item
                key={route}
                value={`${label} ${keywords}`}
                onSelect={() => go(route)}
                className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer responsiveTextTitle text-[var(--port-gore)] aria-selected:bg-[var(--bg-subtle)]"
              >
                <Icon className="w-4 h-4 text-[var(--endeavour)]" />
                <span className="flex-1">{label}</span>
                <span className="text-[var(--regent-gray)] responsiveTextTable">{route}</span>
                <ArrowRight className="w-3 h-3 text-[var(--regent-gray)] opacity-0 aria-[selected=true]:opacity-100" />
              </Command.Item>
            ))}
          </Command.Group>

          {filteredItems.length > 0 && (
            <Command.Group
              heading="Records"
              className="px-2 py-1 mt-1"
            >
              {filteredItems.map((item) => (
                <Command.Item
                  key={item.key}
                  value={item.searchText}
                  onSelect={() => go(item.route, item.rowId, item.source)}
                  className="flex flex-col items-start gap-0.5 px-2 py-2 rounded-lg cursor-pointer aria-selected:bg-[var(--bg-subtle)]"
                >
                  <span className="responsiveText text-[var(--port-gore)] truncate w-full">
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="responsiveTextTable text-[var(--regent-gray)] truncate w-full">
                      {item.subtitle}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div className="flex items-center gap-3 px-3 py-2 border-t border-[var(--line)] responsiveTextTableTitle text-[var(--regent-gray)]">
          <span><kbd className="px-1 py-0.5 rounded border border-[var(--line-strong)]">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.5 rounded border border-[var(--line-strong)]">↵</kbd> open</span>
          <span><kbd className="px-1 py-0.5 rounded border border-[var(--line-strong)]">Esc</kbd> close</span>
        </div>
      </Command>
    </div>
  );
}
