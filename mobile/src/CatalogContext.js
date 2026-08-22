import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getCatalog, getHealth } from './api'
import { fallbackCatalog } from './data'

const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState(fallbackCatalog)
  const [apiOnline, setApiOnline] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [health, remote] = await Promise.all([getHealth(), getCatalog()])
        if (!active) return
        setApiOnline(health.status === 'ok')
        setCatalog(remote)
      } catch {
        if (!active) return
        setApiOnline(false)
        setCatalog(fallbackCatalog)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const value = useMemo(
    () => ({ catalog, apiOnline, loading }),
    [catalog, apiOnline, loading],
  )

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const value = useContext(CatalogContext)
  if (!value) {
    throw new Error('useCatalog must be used inside CatalogProvider')
  }
  return value
}
