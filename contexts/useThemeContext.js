'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  THEMES, DEFAULT_THEME_ID, DEFAULT_MODE, THEME_STORAGE_KEY,
  applyTheme, themeVarMap,
} from '../utils/themes'
import { loadDataSettings, saveDataSettings } from '../utils/utils'
import { UserAuth } from './useAuthContext'

// Per-member colour theme + light/dark mode (two independent dimensions).
// Stored at {uidCollection}/theme_{uid} in Firestore so the choice follows the
// member across devices, and mirrored in localStorage so the boot script in
// app/layout.js can repaint before first paint (no flash of the wrong mode).

// `theme` / `toggleTheme` are aliases for `mode` / `toggleMode`. They exist so a
// component only cares about light-vs-dark can read the same shape the reference
// implementation uses (`const { theme } = useTheme()`), while the colour-preset
// dimension stays available as `themeId` / `setTheme` for the theme switcher.
const ThemeContext = createContext({
  themeId: DEFAULT_THEME_ID,
  mode: DEFAULT_MODE,
  theme: DEFAULT_MODE,
  setTheme: () => {},
  toggleMode: () => {},
  toggleTheme: () => {},
})

const validMode = m => (m === 'dark' ? 'dark' : 'light')

const readStored = () => {
  if (typeof window === 'undefined') return { id: DEFAULT_THEME_ID, mode: DEFAULT_MODE }
  try {
    const t = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY))
    if (t && THEMES.some(x => x.id === t.id)) return { id: t.id, mode: validMode(t.mode) }
  } catch { /* corrupt entry — fall through to default */ }
  return { id: DEFAULT_THEME_ID, mode: DEFAULT_MODE }
}

const persistLocal = (id, mode) => {
  try {
    const theme = THEMES.find(t => t.id === id)
    const vars = theme ? themeVarMap(theme, mode) : null
    if (!vars) localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ id, mode, vars }))
  } catch { /* storage unavailable — theme still applies for this session */ }
}

const ThemeProvider = ({ children }) => {
  const { user, uidCollection } = UserAuth() || {}
  const [{ themeId, mode }, setState] = useState(() => {
    const s = readStored()
    return { themeId: s.id, mode: s.mode }
  })

  // The boot script already painted from localStorage; re-assert so React state
  // and DOM agree (also covers dev fast-refresh).
  useEffect(() => { applyTheme(themeId, mode) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Once signed in, load this member's saved choice (wins over localStorage,
  // which SignOut clears anyway).
  useEffect(() => {
    if (!user?.uid || !uidCollection) return
    let cancelled = false
    loadDataSettings(uidCollection, `theme_${user.uid}`)
      .then(d => {
        if (cancelled || !d) return
        const id = THEMES.some(t => t.id === d.theme) ? d.theme : null
        const m = validMode(d.mode)
        if (!id) return
        setState(prev => {
          if (prev.themeId === id && prev.mode === m) return prev
          applyTheme(id, m)
          persistLocal(id, m)
          return { themeId: id, mode: m }
        })
      })
      .catch(() => { /* offline / no pref yet — keep current */ })
    return () => { cancelled = true }
  }, [user?.uid, uidCollection])

  const commit = useCallback((id, m) => {
    setState({ themeId: id, mode: m })
    applyTheme(id, m)
    persistLocal(id, m)
    if (user?.uid && uidCollection) {
      saveDataSettings(uidCollection, `theme_${user.uid}`, { theme: id, mode: m }).catch(() => {})
    }
  }, [user?.uid, uidCollection])

  const setTheme = useCallback((id) => {
    if (THEMES.some(t => t.id === id)) commit(id, mode)
  }, [commit, mode])

  const toggleMode = useCallback(() => {
    commit(themeId, mode === 'dark' ? 'light' : 'dark')
  }, [commit, themeId, mode])

  return (
    <ThemeContext.Provider
      value={{ themeId, mode, setTheme, toggleMode, theme: mode, toggleTheme: toggleMode }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
export { ThemeProvider }

export const useTheme = () => useContext(ThemeContext)
