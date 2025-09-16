'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useMindMapStore } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function DocumentGenerator() {
  const [isOpen, setIsOpen] = useState(false)
  const [document, setDocument] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  const clearMindMap = useMindMapStore(state => state.clearMindMap)
  const addEntry = useMindMapStore(state => state.addEntry)
  const toggleConnection = useMindMapStore(state => state.toggleConnection)
  const setRootEntry = useMindMapStore(state => state.setRootEntry)
  const rearrangeMindMap = useMindMapStore(state => state.rearrangeMindMap)
  const setInputFocused = useMindMapStore(state => state.setInputFocused)

  // Clear error when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      setError(null)
    }
  }, [isOpen])

  const handleGenerate = useCallback(async () => {
    // Clear any existing error
    setError(null)

    // Validate document is not empty
    const trimmedDoc = document.trim()
    if (!trimmedDoc) {
      setError('Please enter a document to generate from')
      return
    }

    setIsGenerating(true)

    try {
      // Call the document-to-mindmap endpoint
      const response = await fetch('/api/transform/document-to-mindmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ document: trimmedDoc }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Show error message from server
        setError(data.error || 'Failed to generate mind map')
        setIsGenerating(false)
        return
      }

      // Success - create the new mind map
      // Clear existing mind map
      clearMindMap('Generated Mind Map')

      // Track which entry is the root
      let rootEntryId: string | null = null

      // Add all entries from the response
      if (data.entries && Array.isArray(data.entries)) {
        for (const entry of data.entries) {
          addEntry({
            id: entry.id,
            title: entry.title || 'Untitled',
            content: entry.content || '',
            position: entry.position || [
              Math.random() * 10 - 5,
              Math.random() * 10 - 5,
              Math.random() * 10 - 5
            ],
          })

          // Track root entry
          if (entry.isRoot) {
            rootEntryId = entry.id
          }
        }

        // Set the root entry if one was identified
        if (rootEntryId) {
          setRootEntry(rootEntryId)
        }
      }

      // Add all connections from the response
      if (data.connections && Array.isArray(data.connections)) {
        for (const connection of data.connections) {
          // toggleConnection expects source and target IDs
          // The function will handle checking if connection exists
          toggleConnection(connection.source, connection.target)
        }
      }

      // Close the dialog
      setIsOpen(false)
      setDocument('')

      // Perform rearrangement without showing toasts
      // The rearrangement will happen silently
      setTimeout(() => {
        rearrangeMindMap(() => {
          // Show success toast after rearrangement
          toast({
            title: 'Mind map created',
            description: 'Your mind map has been generated from the document',
          })
        })
      }, 100)

    } catch (err) {
      console.error('Error generating mind map:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setIsGenerating(false)
    }
  }, [document, clearMindMap, addEntry, toggleConnection, setRootEntry, rearrangeMindMap, toast])

  const handlePaste = useCallback(() => {
    // Allow default paste behavior to preserve formatting
    // The textarea will handle the paste event natively
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Generate from Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate Mind Map from Document</DialogTitle>
          <DialogDescription>
            Paste or type your document below. The AI will analyze it and create a mind map.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          <Textarea
            ref={textareaRef}
            value={document}
            onChange={(e) => {
              setDocument(e.target.value)
              // Clear error when user starts typing
              if (error) {
                setError(null)
              }
            }}
            onPaste={handlePaste}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Paste your document here... You can include formatted text with headings, lists, bold, italics, etc."
            className="min-h-[400px] resize-none font-mono text-sm"
            disabled={isGenerating}
          />

          {error && (
            <p className="text-sm text-red-600 mt-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !document.trim()}
          >
            {isGenerating ? 'Generating...' : 'Generate mind map from document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}