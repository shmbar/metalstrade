import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, SegmentedControl } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PeriodSelector } from '@/components/PeriodSelector';
import { InventoryView } from '@/features/stocks/InventoryView';
import { StorageView } from '@/features/stocks/StorageView';
import { AgingView } from '@/features/stocks/AgingView';
import { SharedStockView } from '@/features/stocks/SharedStockView';
import { layout } from '@/theme/tokens';
import { useAuth } from '@/store/auth';

type Tab = 'inventory' | 'shared' | 'storage' | 'aging';

const SUBTITLE: Record<Tab, string> = {
  inventory: 'On-hand inventory',
  shared: 'Shared stock (IMS + GIS)',
  storage: 'Storage costs',
  aging: 'Storage aging by terminal',
};
const TABS: Tab[] = ['inventory', 'shared', 'storage', 'aging'];

export default function StocksScreen() {
  // Deep-linkable ("/(app)/stocks?tab=shared") so other screens — the Cashflow
  // Shared Stock card — can jump straight to a tab instead of landing on Inventory.
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  // Shared stock belongs to IMS and GIS only (store/auth isTradingWorkspace).
  const trading = useAuth((s) => s.tradingAccount);
  const tabs = trading ? TABS : TABS.filter((t) => t !== 'shared');
  const initialTab = tabs.includes(tabParam as Tab) ? (tabParam as Tab) : 'inventory';
  const [picked, setTab] = useState<Tab>(initialTab);
  const tab: Tab = tabs.includes(picked) ? picked : 'inventory';

  return (
    <Screen scroll={false} flush>
      <ScreenHeader
        subtitle={SUBTITLE[tab]}
        title="Stocks"
        right={tab === 'storage' ? <PeriodSelector /> : undefined}
      />

      <View style={{ marginBottom: layout.stack }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'inventory' as Tab, label: 'Inventory' },
            { value: 'shared' as Tab, label: 'Shared' },
            { value: 'storage' as Tab, label: 'Storage' },
            { value: 'aging' as Tab, label: 'Aging' },
          ].filter((o) => tabs.includes(o.value))}
        />
      </View>

      {tab === 'inventory' ? (
        <InventoryView />
      ) : tab === 'shared' ? (
        <SharedStockView />
      ) : tab === 'storage' ? (
        <StorageView />
      ) : (
        <AgingView />
      )}
    </Screen>
  );
}
