/**
 * NATIVE-MODULE STUB for the parity suites.
 *
 * WHY: several mobile files that export PURE, testable logic also live next to
 * React-Query hooks and therefore transitively import `react-native`
 * (e.g. `deriveContract` and `ownProducts` are exported from
 * mobile/src/features/contracts/useContracts.ts, which imports @/store/auth →
 * @/lib/firebase → react-native). Rolldown cannot parse react-native's Flow-typed
 * index.js, so the whole test file fails to load before a single assertion runs.
 *
 * vitest.config.js therefore aliases `react-native` (and the Expo/native leaf
 * packages) to this module for the ROOT test run only. The Expo app's own bundler
 * is untouched — this alias exists nowhere but vitest.
 *
 * WHAT IT GUARANTEES: nothing. It exists so a module GRAPH can be loaded, not so
 * native behaviour can be exercised. Every property is a no-op stub. If a parity
 * test ever depends on a value that came from here, the test is testing the stub,
 * not the app — which means the thing under test was never pure and belongs in a
 * Tier 3 mirror instead.
 *
 * Practical consequence: import PURE symbols from a hook file freely
 * (`import { deriveContract } from '@/features/contracts/useContracts'`), but never
 * call a hook, a Firestore reader, or anything that touches a device API.
 */

const noop = () => undefined;

// Every property resolves to a callable, indexable, spreadable stub.
const makeStub = (name: string): any => {
  const target: any = function stub() {
    return undefined;
  };
  target.__parityStub = name;
  return new Proxy(target, {
    get(t, prop) {
      if (prop === '__esModule') return true;
      if (prop === '__parityStub') return name;
      if (prop === 'then') return undefined; // never look thenable to `await import()`
      if (prop === Symbol.toPrimitive || prop === 'toString') return () => `[parity stub ${name}]`;
      if (prop === Symbol.iterator) return function* () {};
      if (prop in t) return t[prop];
      t[prop] = makeStub(`${name}.${String(prop)}`);
      return t[prop];
    },
    apply() {
      return undefined;
    },
    construct() {
      return {};
    },
  });
};

// A few members are shaped rather than proxied, because real pure code sometimes
// branches on them at module scope.
export const Platform = { OS: 'ios', Version: 17, select: (o: any) => (o && (o.ios ?? o.default)) ?? undefined };
export const StyleSheet = {
  create: <T>(o: T): T => o, // RN's real behaviour for our purposes: identity
  flatten: (o: any) => (Array.isArray(o) ? Object.assign({}, ...o.filter(Boolean)) : o || {}),
  hairlineWidth: 1,
  absoluteFill: {},
  absoluteFillObject: {},
};
export const Dimensions = { get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }), addEventListener: noop };
export const PixelRatio = { get: () => 3, getFontScale: () => 1, roundToNearestPixel: (n: number) => n };
export const Appearance = { getColorScheme: () => 'light', addChangeListener: noop };
export const NativeModules = makeStub('NativeModules');
export const Alert = { alert: noop, prompt: noop };
export const Linking = { openURL: async () => undefined, canOpenURL: async () => false };
export const I18nManager = { isRTL: false };

// ── statically declared names ────────────────────────────────────────────────
// `import * as X from 'expo-network'` builds its namespace from the module's STATIC
// export list, so a Proxy on the default export is invisible to it. Everything the
// mobile app namespace-imports or named-imports from a native package therefore has
// to be spelled out here. Add a name when a parity suite trips over a missing one —
// that is the intended maintenance path.

// react-native components / APIs (only ever imported, never rendered, in these suites)
export const View = makeStub('View');
export const Text = makeStub('Text');
export const Pressable = makeStub('Pressable');
export const ScrollView = makeStub('ScrollView');
export const FlatList = makeStub('FlatList');
export const Modal = makeStub('Modal');
export const TextInput = makeStub('TextInput');
export const ActivityIndicator = makeStub('ActivityIndicator');
export const RefreshControl = makeStub('RefreshControl');
export const AppState = { currentState: 'active', addEventListener: () => ({ remove: noop }) };
export const useColorScheme = () => 'light';
export const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });

// expo-network — executed at module scope by mobile/src/query/client.ts
export const addNetworkStateListener = () => ({ remove: noop });
export const getNetworkStateAsync = async () => ({ isConnected: true, isInternetReachable: true });

// expo-router
export const router = { push: noop, replace: noop, back: noop, navigate: noop };

// expo/fetch
export const fetch = globalThis.fetch;

// expo-secure-store / expo-haptics / expo-notifications / pickers / print / sharing
export const getItemAsync = async () => null;
export const setItemAsync = async () => undefined;
export const deleteItemAsync = async () => undefined;
export const impactAsync = noop;
export const notificationAsync = noop;
export const selectionAsync = noop;
export const ImpactFeedbackStyle = { Light: 'light', Medium: 'medium', Heavy: 'heavy' };
export const NotificationFeedbackType = { Success: 'success', Warning: 'warning', Error: 'error' };
export const authenticateAsync = async () => ({ success: false });
export const hasHardwareAsync = async () => false;
export const isEnrolledAsync = async () => false;
export const getDocumentAsync = async () => ({ canceled: true, assets: [] });
export const launchImageLibraryAsync = async () => ({ canceled: true, assets: [] });
export const launchCameraAsync = async () => ({ canceled: true, assets: [] });
export const printToFileAsync = async () => ({ uri: '' });
export const shareAsync = async () => undefined;
export const isAvailableAsync = async () => false;
export const readAsStringAsync = async () => '';
export const writeAsStringAsync = async () => undefined;
export const documentDirectory = '';
export const cacheDirectory = '';
export const EncodingType = { UTF8: 'utf8', Base64: 'base64' };
export const setNotificationHandler = noop;
export const getExpoPushTokenAsync = async () => ({ data: '' });
export const requestPermissionsAsync = async () => ({ status: 'denied', granted: false });
export const getPermissionsAsync = async () => ({ status: 'denied', granted: false });
export const scheduleNotificationAsync = async () => '';
export const addNotificationReceivedListener = () => ({ remove: noop });
export const addNotificationResponseReceivedListener = () => ({ remove: noop });

const handler: ProxyHandler<Record<string, any>> = {
  get(t, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return t;
    if (prop === 'then') return undefined;
    if (prop in t) return t[prop as string];
    t[prop as string] = makeStub(String(prop));
    return t[prop as string];
  },
};

const mod = new Proxy(
  {
    Platform,
    StyleSheet,
    Dimensions,
    PixelRatio,
    Appearance,
    NativeModules,
    Alert,
    Linking,
    I18nManager,
  } as Record<string, any>,
  handler
);

export default mod;
