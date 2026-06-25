import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme/ThemeProvider';

// Entry gate: wait for Firebase auth to resolve, then route to the app or sign-in.
export default function Index() {
  const { user, initializing } = useAuth();
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
