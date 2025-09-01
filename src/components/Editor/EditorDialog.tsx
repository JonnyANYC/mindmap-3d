'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { WYSIWYGEditorWithAutoSave } from './WYSIWYGEditorWithAutoSave'
import { TitleField } from './TitleField'
import { useMindMapStore } from '@/lib/store'
import { CheckCircle } from 'lucide-react'

export function EditorDialog() {
  const isEditorOpen = useMindMapStore((state) => state.isEditorOpen)
  const editingEntryId = useMindMapStore((state) => state.editingEntryId)
  const isNewEntryBeingEdited = useMindMapStore((state) => state.isNewEntryBeingEdited)
  const closeEditor = useMindMapStore((state) => state.closeEditor)
  const getEntryById = useMindMapStore((state) => state.getEntryById)
  const setRootEntry = useMindMapStore((state) => state.setRootEntry)
  const rootEntryId = useMindMapStore((state) => state.rootEntryId)
  const [hasTitleError, setHasTitleError] = useState(false)
  
  const entry = editingEntryId ? getEntryById(editingEntryId) : null
  
  const handleClose = useCallback(() => {
    // Don't close if there's a title validation error
    if (hasTitleError) {
      return
    }
    closeEditor()
  }, [closeEditor, hasTitleError])

  const handleSetRoot = () => {
    if (editingEntryId) {
      setRootEntry(editingEntryId)
    }
  }
  
  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditorOpen) {
        // Don't close if there's a title validation error
        if (hasTitleError) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        e.preventDefault()
        e.stopPropagation()
        handleClose()
      }
    }
    
    if (isEditorOpen) {
      document.addEventListener('keydown', handleKeyDown, true)
      return () => document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isEditorOpen, handleClose, hasTitleError])
  
  if (!entry || !editingEntryId) {
    return null
  }
  
  const isRoot = rootEntryId === editingEntryId

  return (
    <Dialog open={isEditorOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-w-[800px] h-[80vh] flex flex-col p-0 gap-0"
        onOpenAutoFocus={(e) => {
          // Only allow auto-focus for new entries
          if (!isNewEntryBeingEdited) {
            e.preventDefault()
          }
        }}>
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Edit Entry</DialogTitle>
          <DialogDescription>
            Modify the title and description of your mind map entry. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            <TitleField
              entryId={editingEntryId}
              initialTitle={entry.title || entry.summary || 'New Entry'}
              autoSelect={isNewEntryBeingEdited}
              onValidationError={setHasTitleError}
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <WYSIWYGEditorWithAutoSave
                entryId={editingEntryId}
                initialContent={entry.content || ''}
              />
            </div>
          </div>
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