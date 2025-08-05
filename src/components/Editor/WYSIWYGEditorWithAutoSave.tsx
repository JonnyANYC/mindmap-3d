'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { WYSIWYGEditor } from './WYSIWYGEditor'
import { useMindMapStore } from '@/lib/store'

interface WYSIWYGEditorWithAutoSaveProps {
  entryId: string
  initialContent: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function WYSIWYGEditorWithAutoSave({ entryId, initialContent }: WYSIWYGEditorWithAutoSaveProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [hasChanges, setHasChanges] = useState(false)
  const updateEntry = useMindMapStore((state) => state.updateEntry)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const savedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const performSave = useCallback(async (content: string) => {
    setSaveStatus('saving')
    try {
      // Extract summary from first line of content
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = content
      const textContent = tempDiv.textContent || ''
      const firstLine = textContent.split('\n')[0].trim()
      const summary = firstLine.substring(0, 50) || 'New Entry'
      
      updateEntry(entryId, { content, summary })
      setSaveStatus('saved')
      setHasChanges(false)
      
      // Show "Saved" status for 2 seconds
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current)
      }
      savedIndicatorTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Failed to save:', error)
      setSaveStatus('error')
    }
  }, [entryId, updateEntry])

  const handleContentChange = useCallback((content: string) => {
    setHasChanges(true)
    setSaveStatus('idle')
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Set new timeout for auto-save (1.5 seconds after user stops typing)
    saveTimeoutRef.current = setTimeout(() => {
      performSave(content)
    }, 1500)
  }, [performSave])

  const handleManualSave = useCallback((content: string) => {
    // Clear auto-save timeout if manual save is triggered
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    performSave(content)
  }, [performSave])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      <WYSIWYGEditor
        initialContent={initialContent}
        onContentChange={handleContentChange}
        onSave={handleManualSave}
      />
      
      {/* Save status indicator */}
      <div className="absolute top-2 right-2 text-sm">
        {saveStatus === 'saving' && (
          <span className="text-gray-500">Saving...</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-green-600">Saved</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-red-600">Error saving</span>
        )}
        {saveStatus === 'idle' && hasChanges && (
          <span className="text-gray-400">Unsaved changes</span>
        )}
      </div>
    </div>
  )
}