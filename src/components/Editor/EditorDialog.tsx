'use client'

import { useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WYSIWYGEditorWithAutoSave } from './WYSIWYGEditorWithAutoSave'
import { useMindMapStore } from '@/lib/store'

export function EditorDialog() {
  const isEditorOpen = useMindMapStore((state) => state.isEditorOpen)
  const editingEntryId = useMindMapStore((state) => state.editingEntryId)
  const closeEditor = useMindMapStore((state) => state.closeEditor)
  const getEntryById = useMindMapStore((state) => state.getEntryById)
  
  const entry = editingEntryId ? getEntryById(editingEntryId) : null
  
  const handleClose = useCallback(() => {
    closeEditor()
  }, [closeEditor])
  
  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditorOpen) {
        e.preventDefault()
        e.stopPropagation()
        handleClose()
      }
    }
    
    if (isEditorOpen) {
      document.addEventListener('keydown', handleKeyDown, true)
      return () => document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isEditorOpen, handleClose])
  
  if (!entry || !editingEntryId) {
    return null
  }
  
  return (
    <Dialog open={isEditorOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[800px] h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Edit Entry</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <WYSIWYGEditorWithAutoSave
            entryId={editingEntryId}
            initialContent={entry.content || ''}
          />
        </div>
        
        <div className="px-6 py-3 border-t bg-gray-50">
          <p className="text-sm text-gray-500">
            Press Ctrl+S to save manually • Changes auto-save after 1.5 seconds
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}