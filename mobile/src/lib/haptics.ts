// Thin haptics wrapper — every call is fire-and-forget and safe on devices
// without a haptic engine (simulators, some Androids).
import * as Haptics from 'expo-haptics';

export const hapticSuccess = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
export const hapticWarning = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
export const hapticTap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
