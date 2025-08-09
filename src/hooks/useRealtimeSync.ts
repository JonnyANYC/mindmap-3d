import { useEffect, useRef, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useMindMapStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Entry, Connection } from '@/types/mindmap'
import { storageService } from '@/lib/storage/storageService'

export function useRealtimeSync(mindMapId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const { 
    addEntry, 
    updateEntry, 
    deleteEntry,
    addConnection,
    deleteConnection,
    currentMindMapId
  } = useMindMapStore()

  // Debounce position updates
  const positionUpdateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const handleRealtimeUpdate = useCallback((payload: unknown) => {
    if (!mindMapId || mindMapId !== currentMindMapId) return

    const { eventType, table, new: newRecord, old: oldRecord } = payload as {
      eventType: string
      table: string
      new: Record<string, unknown>
      old: Record<string, unknown>
    }

    switch (table) {
      case 'entries':
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const entry: Entry = {
            id: newRecord.id,
            position: [newRecord.position_x, newRecord.position_y, newRecord.position_z],
            summary: newRecord.summary,
            content: newRecord.content,
            color: newRecord.color,
            createdAt: new Date(newRecord.created_at),
            updatedAt: new Date(newRecord.updated_at)
          }

          if (newRecord.is_deleted) {
            deleteEntry(newRecord.id)
          } else if (eventType === 'INSERT') {
            addEntry(entry)
          } else {
            updateEntry(newRecord.id, entry)
          }
        } else if (eventType === 'DELETE') {
          deleteEntry(oldRecord.id)
        }
        break

      case 'connections':
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const connection: Connection = {
            id: newRecord.id,
            sourceId: newRecord.from_entry_id,
            targetId: newRecord.to_entry_id,
            createdAt: new Date(newRecord.created_at)
          }

          if (newRecord.is_deleted) {
            deleteConnection(newRecord.id)
          } else if (eventType === 'INSERT') {
            addConnection(connection)
          } else {
            // Connections don't typically update, but handle it anyway
            deleteConnection(oldRecord.id)
            addConnection(connection)
          }
        } else if (eventType === 'DELETE') {
          deleteConnection(oldRecord.id)
        }
        break
    }
  }, [mindMapId, currentMindMapId, addEntry, updateEntry, deleteEntry, addConnection, deleteConnection])

  // Debounced position update function
  const debouncedPositionUpdate = useCallback((entryId: string, position: [number, number, number]) => {
    // Clear any existing timeout for this entry
    const existingTimeout = positionUpdateTimeouts.current.get(entryId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set a new timeout
    const timeout = setTimeout(async () => {
      if (!supabase || !mindMapId) return

      try {
        await supabase
          .from('entries')
          .update({
            position_x: position[0],
            position_y: position[1],
            position_z: position[2],
            updated_at: new Date().toISOString()
          })
          .eq('id', entryId)
      } catch (error) {
        console.error('Error updating entry position:', error)
      }

      positionUpdateTimeouts.current.delete(entryId)
    }, 500) // Debounce delay of 500ms

    positionUpdateTimeouts.current.set(entryId, timeout)
  }, [mindMapId])

  useEffect(() => {
    if (!mindMapId || !storageService.isCloudStorage()) {
      return
    }

    // Set up real-time subscription
    const adapter = storageService.getAdapter()
    const subscription = adapter.subscribeToChanges?.(mindMapId, handleRealtimeUpdate)
    
    if (subscription) {
      channelRef.current = subscription as RealtimeChannel
    }

    // Capture the ref value for cleanup
    const timeoutsRef = positionUpdateTimeouts.current

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase?.removeChannel(channelRef.current)
        channelRef.current = null
      }

      // Clear any pending position updates
      timeoutsRef.forEach(timeout => clearTimeout(timeout))
      timeoutsRef.clear()
    }
  }, [mindMapId, handleRealtimeUpdate])

  return {
    isConnected: channelRef.current !== null,
    debouncedPositionUpdate
  }
}

// Hook for handling connection state and reconnection
export function useSupabaseConnection() {
  const { setConnectionStatus } = useMindMapStore()

  useEffect(() => {
    if (!supabase) return

    let reconnectTimer: NodeJS.Timeout | null = null
    const handleOnline = () => {
      setConnectionStatus('connected')
      
      // Attempt to reconnect after coming back online
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      reconnectTimer = setTimeout(() => {
        window.location.reload() // Simple reconnection strategy
      }, 1000)
    }

    const handleOffline = () => {
      setConnectionStatus('disconnected')
    }

    // Monitor connection status
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial status
    if (navigator.onLine) {
      setConnectionStatus('connected')
    } else {
      setConnectionStatus('disconnected')
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
    }
  }, [setConnectionStatus])
}