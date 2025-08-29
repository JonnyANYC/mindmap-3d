'use client'

import { useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { WYSIWYGEditorWithAutoSave } from './WYSIWYGEditorWithAutoSave'
import { useMindMapStore } from '@/lib/store'

import { CheckCircle } from 'lucide-react';

export function EditorDialog() {
  const isEditorOpen = useMindMapStore((state) => state.isEditorOpen)
  const editingEntryId = useMindMapStore((state) => state.editingEntryId)
  const closeEditor = useMindMapStore((state) => state.closeEditor)
  const getEntryById = useMindMapStore((state) => state.getEntryById)
  const setRootEntry = useMindMapStore((state) => state.setRootEntry)
  const rootEntryId = useMindMapStore((state) => state.rootEntryId)
  
  const entry = editingEntryId ? getEntryById(editingEntryId) : null
  
  const handleClose = useCallback(() => {
    closeEditor()
  }, [closeEditor])

  const handleSetRoot = () => {
    if (editingEntryId) {
      setRootEntry(editingEntryId)
    }
  }
  
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
  
  const isRoot = rootEntryId === editingEntryId

  return (
    <Dialog open={isEditorOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[800px] h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Edit Entry</DialogTitle>
          <DialogDescription>
            Modify the content of your mind map entry here. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <WYSIWYGEditorWithAutoSave
            entryId={editingEntryId}
            initialContent={entry.content || ''}
          />
        </div>
        
        <div className="px-6 py-3 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Press Ctrl+S to save manually • Changes auto-save after 1.5 seconds
          </p>
          <div className="flex items-center">
            {isRoot ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="font-semibold">This is the root entry</span>
              </div>
            ) : (
              <Button onClick={handleSetRoot} size="sm">
                Set as Root Entry
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}