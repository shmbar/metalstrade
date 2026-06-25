import { useState } from 'react';
import { View, Pressable, Alert, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Button, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { listFiles, uploadFile, deleteFile } from '@/data/storage';
import { radius } from '@/theme/tokens';

const iconFor = (name: string): keyof typeof Ionicons.glyphMap => {
  const n = name.toLowerCase();
  if (n.endsWith('.pdf')) return 'document-text';
  if (/\.(png|jpe?g|gif|webp|heic)$/.test(n)) return 'image';
  if (/\.(xlsx?|csv)$/.test(n)) return 'grid';
  return 'document';
};

export default function ContractFiles() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    enabled: !!id,
    queryKey: ['files', id],
    queryFn: () => listFiles(id as string),
  });

  const del = useMutation({
    mutationFn: (name: string) => deleteFile(id as string, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', id] }),
  });

  const pickAndUpload = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    setBusy(true);
    try {
      await uploadFile(id as string, asset.uri, asset.name);
      qc.invalidateQueries({ queryKey: ['files', id] });
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload the file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2" style={{ flex: 1 }}>Attachments</Text>
      </View>

      <Button
        title="Upload file"
        loading={busy}
        style={{ marginBottom: 14 }}
        leftIcon={<Ionicons name="cloud-upload-outline" size={18} color={colors.primaryText} />}
        onPress={pickAndUpload}
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load files.'} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No attachments" message="Upload contracts, certificates or documents here." icon={<Ionicons name="folder-open-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <View style={{ gap: 10 }}>
          {data.map((f) => (
            <Card key={f.name} padded={false}>
              <Pressable onPress={() => Linking.openURL(f.url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={iconFor(f.name)} size={18} color={colors.primary} />
                </View>
                <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>{f.name}</Text>
                {del.isPending ? (
                  <ActivityIndicator color={colors.negative} />
                ) : (
                  <Pressable
                    onPress={() => Alert.alert('Delete file?', f.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => del.mutate(f.name) }])}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.negative} />
                  </Pressable>
                )}
                <Ionicons name="open-outline" size={18} color={colors.textFaint} />
              </Pressable>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
