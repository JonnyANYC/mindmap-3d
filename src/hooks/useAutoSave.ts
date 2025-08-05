import { useEffect, useRef } from 'react'
import { useMindMapStore } from '@/lib/store'
import { mindMapSaveService } from '@/lib/mindMapService'
import { useToast } from './use-toast'

interface UseAutoSaveOptions {
  enabled?: boolean
  intervalMs?: number
  showNotifications?: boolean
}

export function useAutoSave(options: UseAutoSaveOptions = {}) {
  const {
    enabled = true,
    intervalMs = 30000, // 30 seconds default
    showNotifications = false
  } = options
  
  const { toast } = useToast()
  const lastSaveRef = useRef<Date | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSavingRef = useRef(false)
  
  // Get mind map state
  const mindMapId = useMindMapStore(state => state.mindMapId)
  const entries = useMindMapStore(state => state.entries)
  const connections = useMindMapStore(state => state.connections)
  
  // Debounced save function
  const debouncedSave = useRef(async () => {
    if (isSavingRef.current || !mindMapId) return
    
    isSavingRef.current = true
    
    try {
      const result = await mindMapSaveService.save()
      
      if (result.success) {
        lastSaveRef.current = new Date()
        
        if (showNotifications) {
          toast({
            title: 'Auto-saved',
            description: `Last saved at ${new Date().toLocaleTimeString()}`,
            duration: 2000,
          })
        }
      } else {
        console.error('Auto-save failed:', result.error)
        
        if (showNotifications) {
          toast({
            title: 'Auto-save failed',
            description: result.error || 'Unable to save changes',
            variant: 'destructive',
            duration: 3000,
          })
        }
      }
    } catch (error) {
      console.error('Auto-save error:', error)
    } finally {
      isSavingRef.current = false
    }
  }).current
  
  // Set up auto-save on changes
  useEffect(() => {
    if (!enabled || !mindMapId) return
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Set new timeout
    saveTimeoutRef.current = setTimeout(debouncedSave, intervalMs)
    
    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [enabled, mindMapId, entries, connections, intervalMs, debouncedSave])
  
  // Manual save function
  const save = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    await debouncedSave()
  }
  
  // Get last save time
  const getLastSaveTime = () => lastSaveRef.current
  
  // Check if currently saving
  const isSaving = () => isSavingRef.current
  
  return {
    save,
    getLastSaveTime,
    isSaving,
    isEnabled: enabled && !!mindMapId
  }
}