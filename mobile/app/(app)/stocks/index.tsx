import { useState } from 'react';
import { View } from 'react-native';
import { Screen, SegmentedControl } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PeriodSelector } from '@/components/PeriodSelector';
import { InventoryView } from '@/features/stocks/InventoryView';
import { StorageView } from '@/features/stocks/StorageView';
import { AgingView } from '@/features/stocks/AgingView';

type Tab = 'inventory' | 'storage' | 'aging';

const SUBTITLE: Record<Tab, string> = {
  inventory: 'On-hand inventory',
  storage: 'Storage costs',
  aging: 'Storage aging by terminal',
};

export default function StocksScreen() {
  const [tab, setTab] = useState<Tab>('inventory');

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
            { value: 'storage', label: 'Storage' },
            { value: 'aging', label: 'Aging' },
          ]}
        />
      </View>

      {tab === 'inventory' ? <InventoryView /> : tab === 'storage' ? <StorageView /> : <AgingView />}
    </Screen>
  );
}
