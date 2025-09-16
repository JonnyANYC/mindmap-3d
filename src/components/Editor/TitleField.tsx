'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  const [isGenerating, setIsGenerating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const updateEntry = useMindMapStore((state) => state.updateEntry)
  const getEntryById = useMindMapStore((state) => state.getEntryById)

  // Auto-select text for new entries  
  useEffect(() => {
    if (autoSelect && inputRef.current) {
      // Focus and select the text for new entries
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
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

  const handleGenerateTitle = async () => {
    const entry = getEntryById(entryId)
    if (!entry) return

    // Get description content and clean it
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = entry.content || ''
    const description = tempDiv.textContent || ''
    const trimmedDescription = description.trim()

    // Clear any existing error when button is clicked (but don't trigger validation callbacks)
    setError(null)

    // Check if description is empty or whitespace
    if (trimmedDescription === '') {
      // If entry has a title but no description
      if (title.trim() !== '') {
        setError('No description to summarize')
        // Don't set validation error for this case - it's not a title validation issue
        // Auto-clear error after 5 seconds
        setTimeout(() => {
          setError(null)
        }, 5000)
        return
      }
      // If no title and no description, set default title
      const newTitle = 'New Entry'
      setTitle(newTitle)
      updateEntry(entryId, { title: newTitle })
      return
    }

    // If description is 10 characters or less, use it as title
    if (trimmedDescription.length <= 10) {
      setTitle(trimmedDescription)
      updateEntry(entryId, { title: trimmedDescription })
      return
    }

    // For longer descriptions, use HuggingFace API
    setIsGenerating(true)
    try {
      const response = await fetch('/api/summarizer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: trimmedDescription }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to generate title'
        // Show first 50 characters of error
        setError(errorMessage.substring(0, 50))
        // Don't set validation error - this is an API error, not a validation issue
        // Auto-clear error after 5 seconds
        setTimeout(() => {
          setError(null)
        }, 5000)
        return
      }

      const data = await response.json()
      if (data.summary) {
        // Clean up the summary to use as a title
        const generatedTitle = data.summary
          .replace(/\.$/, '') // Remove trailing period
          .substring(0, 100) // Limit to 100 characters
        setTitle(generatedTitle)
        updateEntry(entryId, { title: generatedTitle })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate title'
      setError(errorMessage.substring(0, 50))
      // Don't set validation error - this is an API error, not a validation issue
      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setError(null)
      }, 5000)
    } finally {
      setIsGenerating(false)
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
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          id="entry-title"
          type="text"
          value={title}
          onChange={handleChange}
          placeholder="Enter a title for this entry"
          className={`flex-1 ${error ? 'border-red-500' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? 'title-error' : undefined}
          disabled={isGenerating}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleGenerateTitle}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </div>
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