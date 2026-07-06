import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';

// Slim status bar shown while the device has no connection. Data on screen keeps
// working from the persisted cache; queries auto-refetch when back online.
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setOnline), []);

  if (online) return null;
  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 4,
        alignSelf: 'center',
        zIndex: 50,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#28264f',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      }}
    >
      <Ionicons name="cloud-offline-outline" size={14} color="#ffd479" />
      <Text variant="caption" color="#ffffff" style={{ fontFamily: 'Inter_500Medium' }}>
        Offline — showing saved data
      </Text>
    </View>
  );
}
