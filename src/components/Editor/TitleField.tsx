'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { useMindMapStore } from '@/lib/store'
import { debounce } from 'lodash'

interface TitleFieldProps {
  entryId: string
  initialTitle: string
  autoSelect?: boolean
  onValidationError?: (hasError: boolean) => void
}

export function TitleField({ entryId, initialTitle, autoSelect = false, onValidationError }: TitleFieldProps) {
  const [title, setTitle] = useState(initialTitle)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const updateEntry = useMindMapStore((state) => state.updateEntry)

  // Auto-select text for new entries  
  useEffect(() => {
    if (autoSelect && inputRef.current) {
      // Select the text after focus (autoFocus handles the focus)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.select()
        }
      }, 50)
    }
  }, [autoSelect])

  // Debounced save function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveTitle = useCallback(
    debounce((value: string) => {
      if (value.trim() === '') {
        setError('Title is required')
        onValidationError?.(true)
        setIsSaving(false)
        return
      }

      setError(null)
      onValidationError?.(false)
      updateEntry(entryId, { title: value })
      setIsSaving(false)
    }, 1500),
    [entryId, updateEntry, onValidationError]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTitle(value)
    
    // Clear error immediately when user starts typing
    if (error && value.trim() !== '') {
      setError(null)
      onValidationError?.(false)
    }
    
    // Validate immediately
    if (value.trim() === '') {
      setError('Title is required')
      onValidationError?.(true)
    } else {
      setIsSaving(true)
      saveTitle(value)
    }
  }

  // Handle manual save (Ctrl+S)
  const handleManualSave = useCallback(() => {
    if (title.trim() === '') {
      setError('Title is required')
      onValidationError?.(true)
      return
    }
    
    setError(null)
    onValidationError?.(false)
    updateEntry(entryId, { title })
    setIsSaving(false)
  }, [title, entryId, updateEntry, onValidationError])

  // Handle Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleManualSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleManualSave])

  return (
    <div className="space-y-2">
      <label htmlFor="entry-title" className="text-sm font-medium text-gray-700">
        Title
      </label>
      <Input
        ref={inputRef}
        id="entry-title"
        type="text"
        value={title}
        onChange={handleChange}
        placeholder="Enter a title for this entry"
        className={error ? 'border-red-500' : ''}
        aria-invalid={!!error}
        aria-describedby={error ? 'title-error' : undefined}
        autoFocus={autoSelect}
      />
      {error && (
        <p id="title-error" className="text-sm text-red-600 mt-1">
          {error}
        </p>
      )}
      {isSaving && !error && (
        <p className="text-sm text-gray-500 mt-1">
          Saving...
        </p>
      )}
    </div>
  )
}