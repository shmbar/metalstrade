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
  const initialTab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'inventory';
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <Screen scroll={false} flush>
      <ScreenHeader
        subtitle={SUBTITLE[tab]}
        title="Stocks"
        right={tab === 'storage' ? <PeriodSelector /> : undefined}
      />

      <View style={{ marginBottom: 14 }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'inventory', label: 'Inventory' },
            { value: 'shared', label: 'Shared' },
            { value: 'storage', label: 'Storage' },
            { value: 'aging', label: 'Aging' },
          ]}
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
