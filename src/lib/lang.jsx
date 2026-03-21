import { createContext, useContext, useState, useCallback } from 'react'
import { T, LANGUAGES } from './translations.js'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('replyiq_lang') || 'en'
  })

  const switchLang = useCallback((code) => {
    setLang(code)
    localStorage.setItem('replyiq_lang', code)
  }, [])

  const t = T[lang] || T.en

  return (
    <LangContext.Provider value={{ lang, switchLang, t, languages: LANGUAGES }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside LangProvider')
  return ctx
}
