'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { storageService } from '@/lib/storage/storageService'
import { StorageStatus } from '@/lib/storage/types'
import { mindMapSaveService } from '@/lib/mindMapService'

interface StorageContextValue {
  status: StorageStatus | null
  isLoading: boolean
}

const StorageContext = createContext<StorageContextValue>({
  status: null,
  isLoading: true
})

export function useStorage() {
  return useContext(StorageContext)
}

interface StorageProviderProps {
  children: ReactNode
}

export function StorageProvider({ children }: StorageProviderProps) {
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  useEffect(() => {
    if (!isMounted) return // Wait for client-side hydration
    
    const initStorage = async () => {
      try {
        const storageStatus = await storageService.initialize()
        setStatus(storageStatus)
        
        // Start auto-save if storage is available
        if (storageStatus.isAvailable && storageService.isPersistentStorage()) {
          mindMapSaveService.startAutoSave(30000) // 30 seconds
        }
      } catch (error) {
        console.error('Failed to initialize storage:', error)
        setStatus({
          mode: 'session',
          isAvailable: false,
          message: 'Storage initialization failed. Using session storage.',
          requiresAuth: false
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    initStorage()
    
    // Cleanup auto-save on unmount
    return () => {
      mindMapSaveService.stopAutoSave()
    }
  }, [isMounted])
  
  return (
    <StorageContext.Provider value={{ status, isLoading }}>
      {children}
    </StorageContext.Provider>
  )
}