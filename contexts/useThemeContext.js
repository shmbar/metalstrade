'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { THEMES, DEFAULT_THEME_ID, THEME_STORAGE_KEY, applyTheme, themeVarMap } from '../utils/themes'
import { loadDataSettings, saveDataSettings } from '../utils/utils'
import { UserAuth } from './useAuthContext'

// Per-member colour theme. The choice is personal (keyed by the member's uid),
// not company-wide: stored at {uidCollection}/theme_{uid} in Firestore so it
// follows the member across devices, and mirrored in localStorage so the boot
// script in app/layout.js can repaint before first paint (no blue flash).

const ThemeContext = createContext({ themeId: DEFAULT_THEME_ID, setTheme: () => {} })

const readStored = () => {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID
  try {
    const t = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY))
    if (t && THEMES.some(x => x.id === t.id)) return t.id
  } catch { /* corrupt entry — fall through to default */ }
  return DEFAULT_THEME_ID
}

const persistLocal = (id) => {
  try {
    const theme = THEMES.find(t => t.id === id)
    const vars = theme ? themeVarMap(theme) : null
    if (!vars) localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ id, vars }))
  } catch { /* storage unavailable — theme still applies for this session */ }
}

const ThemeProvider = ({ children }) => {
  const { user, uidCollection } = UserAuth() || {}
  const [themeId, setThemeId] = useState(readStored)

  // The boot script already painted from localStorage; re-assert so React state
  // and DOM agree (also covers dev fast-refresh).
  useEffect(() => { applyTheme(themeId) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Once signed in, load this member's saved choice (wins over localStorage,
  // which SignOut clears anyway).
  useEffect(() => {
    if (!user?.uid || !uidCollection) return
    let cancelled = false
    loadDataSettings(uidCollection, `theme_${user.uid}`)
      .then(d => {
        if (cancelled) return
        const id = d?.theme
        if (id && THEMES.some(t => t.id === id)) {
          setThemeId(prev => {
            if (prev === id) return prev
            applyTheme(id)
            persistLocal(id)
            return id
          })
        }
      })
      .catch(() => { /* offline / no pref yet — keep current theme */ })
    return () => { cancelled = true }
  }, [user?.uid, uidCollection])

  const setTheme = useCallback((id) => {
    if (!THEMES.some(t => t.id === id)) return
    setThemeId(id)
    applyTheme(id)
    persistLocal(id)
    if (user?.uid && uidCollection) {
      saveDataSettings(uidCollection, `theme_${user.uid}`, { theme: id }).catch(() => {})
    }
  }, [user?.uid, uidCollection])

  return (
    <ThemeContext.Provider value={{ themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider

export const useTheme = () => useContext(ThemeContext)
