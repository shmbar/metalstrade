import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text, Skeleton } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useBriefing } from './useBriefing';

// "Today" card: 2–4 AI-phrased sentences over exact, locally-computed numbers.
// Falls back to the raw facts as lines if the AI endpoint is unreachable.
export function BriefingCard() {
  const { colors } = useTheme();
  const { facts, briefing, isLoading, isError } = useBriefing();

  if (!facts) return null;
  const factLines = [facts.overdue, facts.paymentsRecent, facts.shipmentsDue, facts.metals].filter(Boolean) as string[];
  if (!briefing && !isLoading && factLines.length === 0) return null;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Ionicons name="sparkles" size={14} color={colors.primary} />
        <Text variant="label" tone="muted" style={{ textTransform: 'uppercase' }}>Today</Text>
        <View style={{ flex: 1 }} />
        <Text variant="caption" tone="faint">{facts.date}</Text>
      </View>

      {isLoading ? (
        <View style={{ gap: 6 }}>
          <Skeleton height={13} width="95%" />
          <Skeleton height={13} width="88%" />
          <Skeleton height={13} width="60%" />
        </View>
      ) : briefing ? (
        <Text variant="body" style={{ lineHeight: 21 }}>{briefing}</Text>
      ) : (
        // Offline / API failure: show the exact facts plainly.
        <View style={{ gap: 4 }}>
          {factLines.map((l, i) => (
            <Text key={i} variant="body" tone={i === 0 && facts.overdue ? 'negative' : 'muted'} style={{ lineHeight: 20 }}>
              {l}
            </Text>
          ))}
          {isError && (
            <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>Briefing unavailable — showing figures directly.</Text>
          )}
        </View>
      )}
    </Card>
  );
}
