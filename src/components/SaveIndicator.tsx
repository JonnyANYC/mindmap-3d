'use client'

import { useState, useEffect } from 'react'
import { useMindMapStore } from '@/lib/store'
import { useAutoSave } from '@/hooks/useAutoSave'
import { mindMapSaveService } from '@/lib/mindMapService'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { storageService } from '@/lib/storage/storageService'

export function SaveIndicator() {
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  
  const mindMapId = useMindMapStore(state => state.mindMapId)
  const connectionStatus = useMindMapStore(state => state.connectionStatus)
  
  // Use auto-save hook
  const { getLastSaveTime, isSaving } = useAutoSave({
    enabled: !!mindMapId && connectionStatus === 'connected',
    intervalMs: 30000, // 30 seconds
    showNotifications: false
  })
  
  // Update last save time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const time = getLastSaveTime()
      if (time !== lastSaveTime) {
        setLastSaveTime(time)
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [getLastSaveTime, lastSaveTime])
  
  // Update saving state
  useEffect(() => {
    const interval = setInterval(() => {
      setSaving(isSaving())
    }, 100)
    
    return () => clearInterval(interval)
  }, [isSaving])
  
  const handleManualSave = async () => {
    setSaving(true)
    
    try {
      const result = await mindMapSaveService.save()
      
      if (result.success) {
        setLastSaveTime(new Date())
        toast({
          title: 'Saved',
          description: 'Your mind map has been saved',
        })
      } else {
        toast({
          title: 'Save failed',
          description: result.error || 'Unable to save changes',
          variant: 'destructive',
        })
      }
    } finally {
      setSaving(false)
    }
  }
  
  const getTimeAgo = (date: Date | null) => {
    if (!date) return 'Never'
    
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    
    if (seconds < 5) return 'Just now'
    if (seconds < 60) return `${seconds}s ago`
    
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    
    return date.toLocaleDateString()
  }
  
  if (!mindMapId || !storageService.isPersistentStorage()) {
    return null
  }
  
  if (connectionStatus === 'disconnected') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-red-600 dark:text-red-400">Offline</span>
      </div>
    )
  }
  
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        {saving ? (
          <>
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Saved {getTimeAgo(lastSaveTime)}</span>
          </>
        )}
      </div>
      
      <Button
        onClick={handleManualSave}
        disabled={saving || connectionStatus !== 'connected'}
        variant="outline"
        size="sm"
      >
        Save Now
      </Button>
    </div>
  )
}