import { useState } from 'react';
import { View } from 'react-native';
import { Screen, SegmentedControl } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PeriodSelector } from '@/components/PeriodSelector';
import { InventoryView } from '@/features/stocks/InventoryView';
import { StorageView } from '@/features/stocks/StorageView';

type Tab = 'inventory' | 'storage';

export default function StocksScreen() {
  const [tab, setTab] = useState<Tab>('inventory');

  return (
    <Screen scroll={false}>
      <ScreenHeader
        subtitle={tab === 'inventory' ? 'On-hand inventory' : 'Storage costs'}
        title="Stocks"
        right={tab === 'storage' ? <PeriodSelector /> : undefined}
      />

      <View style={{ marginBottom: 14 }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'inventory', label: 'Inventory' },
            { value: 'storage', label: 'Storage Costs' },
          ]}
        />
      </View>

      {tab === 'inventory' ? <InventoryView /> : <StorageView />}
    </Screen>
  );
}
