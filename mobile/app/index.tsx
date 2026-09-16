import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { useShallow } from 'zustand/react/shallow';

// Entry gate: wait for Firebase auth to resolve, then route to the app or sign-in.
export default function Index() {
  const { user, initializing } = useAuth(useShallow((s) => ({ user: s.user, initializing: s.initializing })));
  const { colors } = useTheme();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={user ? '/(app)' : '/sign-in'} />;
}
