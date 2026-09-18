import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Repository } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

interface RepositoryContextType {
  repositories: Repository[]
  isLoading: boolean
  error: string | null
  refreshRepositories: () => Promise<void>
  addRepository: (repo: Repository) => void
  isRepoConnected: (fullNameOrId: string | number) => boolean
  getRepoById: (id: string) => Repository | undefined
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined)

export const RepositoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRepositories = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error: sbError } = await supabase
          .from('repositories')
          .select('*')
          .order('created_at', { ascending: false })

        if (!sbError && data && data.length > 0) {
          setRepositories(data as Repository[])
          setIsLoading(false)
          return
        }
      }

      // Call backend API endpoint /api/repositories
      const res = await fetch('/api/repositories')
      if (res.ok) {
        const json = await res.json()
        if (json.repositories) {
          setRepositories(json.repositories)
          setIsLoading(false)
          return
        }
      }

      setRepositories([])
    } catch (err: any) {
      console.warn('Repository fetch error:', err)
      setRepositories([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRepositories()

    // Setup Supabase Realtime Listener if Supabase is configured
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('public:repositories')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'repositories' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newRepo = payload.new as Repository
              setRepositories((prev) => {
                if (prev.some((r) => r.id === newRepo.id || r.full_name === newRepo.full_name)) {
                  return prev.map((r) => (r.id === newRepo.id || r.full_name === newRepo.full_name ? newRepo : r))
                }
                return [newRepo, ...prev]
              })
            } else if (payload.eventType === 'UPDATE') {
              const updatedRepo = payload.new as Repository
              setRepositories((prev) => prev.map((r) => (r.id === updatedRepo.id ? updatedRepo : r)))
            } else if (payload.eventType === 'DELETE') {
              const deletedRepo = payload.old as Repository
              setRepositories((prev) => prev.filter((r) => r.id !== deletedRepo.id))
            }
          }
        )
        .subscribe()

      return () => {
        if (supabase) {
          supabase.removeChannel(channel)
        }
      }
    }
  }, [fetchRepositories])

  const addRepository = useCallback((repo: Repository) => {
    setRepositories((prev) => {
      const exists = prev.some(
        (r) =>
          r.id === repo.id ||
          r.full_name.toLowerCase() === repo.full_name.toLowerCase() ||
          (repo.github_repository_id && r.github_repository_id === repo.github_repository_id)
      )
      if (exists) {
        return prev.map((r) =>
          r.id === repo.id || r.full_name.toLowerCase() === repo.full_name.toLowerCase() ? repo : r
        )
      }
      return [repo, ...prev]
    })
  }, [])

  const isRepoConnected = useCallback(
    (fullNameOrId: string | number) => {
      const identifier = String(fullNameOrId).toLowerCase()
      return repositories.some(
        (r) =>
          r.id.toLowerCase() === identifier ||
          r.full_name.toLowerCase() === identifier ||
          (r.github_repository_id && String(r.github_repository_id) === identifier)
      )
    },
    [repositories]
  )

  const getRepoById = useCallback(
    (id: string) => {
      return repositories.find(
        (r) => r.id === id || r.name === id || r.full_name.toLowerCase() === id.toLowerCase()
      )
    },
    [repositories]
  )

  return (
    <RepositoryContext.Provider
      value={{
        repositories,
        isLoading,
        error,
        refreshRepositories: fetchRepositories,
        addRepository,
        isRepoConnected,
        getRepoById,
      }}
    >
      {children}
    </RepositoryContext.Provider>
  )
}

export function useRepositories() {
  const context = useContext(RepositoryContext)
  if (!context) {
    throw new Error('useRepositories must be used within a RepositoryProvider')
  }
  return context
}
