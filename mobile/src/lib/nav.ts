import { useCallback } from 'react';
import { router as expoRouter, useNavigation } from 'expo-router';
import { createNavGate, hrefKey, withVisit } from './navGate';
import { sheets } from './sheetRegistry';

/*
 * The app's router. Every screen imports `router` from here, never from expo-router — the
 * design guard (__tests__/mobile-design-guard.test.js) fails on a direct import — so every
 * navigation, from any button, a push-notification tap or a file shared into the app,
 * passes the same two rules (lib/navGate):
 *   · a double tap navigates once;
 *   · nothing navigates while a sheet is on screen — the sheet closes, then the move happens.
 * Same surface as expo-router's router, so a call site reads exactly as before.
 */

const gate = createNavGate({ now: () => Date.now(), sheets });
// Each open of a hidden-tab form is a new visit (navGate withVisit).
let visit = 0;
const open = (href: any) => withVisit(href, ++visit) as any;

type ExpoRouter = typeof expoRouter;

export const router: ExpoRouter = {
  ...expoRouter,
  push: ((href: any, options?: any) => {
    gate(`push:${hrefKey(href)}`, () => expoRouter.push(open(href), options));
  }) as ExpoRouter['push'],
  navigate: ((href: any, options?: any) => {
    gate(`navigate:${hrefKey(href)}`, () => expoRouter.navigate(open(href), options));
  }) as ExpoRouter['navigate'],
  replace: ((href: any, options?: any) => {
    gate(`replace:${hrefKey(href)}`, () => expoRouter.replace(open(href), options));
  }) as ExpoRouter['replace'],
  dismissTo: ((href: any, options?: any) => {
    gate(`dismissTo:${hrefKey(href)}`, () => expoRouter.dismissTo(href, options));
  }) as ExpoRouter['dismissTo'],
  back: () => {
    gate('back', () => expoRouter.back(), { back: true });
  },
  dismiss: ((count?: number) => {
    gate(`dismiss:${count ?? 1}`, () => expoRouter.dismiss(count), { back: true });
  }) as ExpoRouter['dismiss'],
  dismissAll: () => {
    gate('dismissAll', () => expoRouter.dismissAll(), { back: true });
  },
  // Reads, and in-place changes that move nothing, go straight through.
  canGoBack: () => expoRouter.canGoBack(),
  canDismiss: () => expoRouter.canDismiss(),
  setParams: ((params: any) => expoRouter.setParams(params)) as ExpoRouter['setParams'],
};

/**
 * Back, after a save or delete finishes — but only if the person is still on this screen.
 * A save takes a second or two; someone who pressed Back meanwhile had already left, and
 * the save's own back then closed a second screen they never asked to leave.
 */
export function useBackWhenDone(): () => void {
  const navigation = useNavigation();
  return useCallback(() => {
    if (navigation.isFocused()) router.back();
  }, [navigation]);
}
