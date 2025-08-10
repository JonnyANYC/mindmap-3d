import React from 'react'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EditorDialog } from '@/components/Editor/EditorDialog'
import { useMindMapStore } from '@/lib/store'
import { Entry } from '@/types/mindmap'

// Mock the WYSIWYG editor components
jest.mock('@/components/Editor/WYSIWYGEditorWithAutoSave', () => ({
  WYSIWYGEditorWithAutoSave: ({ 
    entryId, 
    initialContent, 
    onContentChange 
  }: { 
    entryId: string
    initialContent: string
    onContentChange?: (content: string) => void
  }) => (
    <div data-testid="wysiwyg-editor">
      <input
        data-testid="editor-input"
        defaultValue={initialContent}
        onChange={(e) => onContentChange?.(e.target.value)}
      />
      <div>Entry ID: {entryId}</div>
      <div>Initial Content: {initialContent}</div>
    </div>
  )
}))

describe('EditorDialog Integration Tests', () => {
  const mockEntry: Entry = {
    id: 'test-entry-1',
    position: [0, 0, 0],
    summary: 'Test Entry',
    content: '<p>Test content</p>',
    color: '#4CAF50',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    // Reset store
    const store = useMindMapStore.getState()
    store.clearMindMap()
    store.closeEditor()
    
    // Add test entry
    store.addEntry(mockEntry)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Opening and Closing', () => {
    it('should not render when editor is closed', () => {
      render(<EditorDialog />)
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render when editor is opened', () => {
      const store = useMindMapStore.getState()
      store.openEditor(mockEntry.id)
      
      render(<EditorDialog />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Entry')).toBeInTheDocument()
    })

    it('should close when X button is clicked', async () => {
      const store = useMindMapStore.getState()
      store.openEditor(mockEntry.id)
      
      render(<EditorDialog />)
      
      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)
      
      await waitFor(() => {
        expect(store.isEditorOpen).toBe(false)
      })
    })

    it('should close when ESC key is pressed', async () => {
      const store = useMindMapStore.getState()
      store.openEditor(mockEntry.id)
      
      render(<EditorDialog />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      await waitFor(() => {
        expect(store.isEditorOpen).toBe(false)
      })
    })

    it('should close when clicking outside dialog', async () => {
      const store = useMindMapStore.getState()
      store.openEditor(mockEntry.id)
      
      render(<EditorDialog />)
      
      // Click on the overlay/backdrop
      const dialog = screen.getByRole('dialog')
      const overlay = dialog.parentElement
      if (overlay) {
        fireEvent.click(overlay)
      }
      
      await waitFor(() => {
        expect(store.isEditorOpen).toBe(false)
      })
    })
  })

  describe('Content Loading', () => {
    it('should load entry content into editor', () => {
      const store = useMindMapStore.getState()
      store.openEditor(mockEntry.id)
      
      render(<EditorDialog />)
      
      expect(screen.getByTestId('wysiwyg-editor')).toBeInTheDocument()
      expect(screen.getByText(`Entry ID: ${mockEntry.id}`)).toBeInTheDocument()
      expect(screen.getByText(`Initial Content: ${mockEntry.content}`)).toBeInTheDocument()
    })

    it('should handle entries with empty content', () => {
      const store = useMindMapStore.getState()
      const emptyEntry = store.addEntry([1, 1, 1])
      store.updateEntry(emptyEntry.id, { content: '' })
      store.openEditor(emptyEntry.id)
      
      render(<EditorDialog />)
      
      expect(screen.getByText(`Initial Content:`)).toBeInTheDocument()
    })

    it('should not render if no entry is being edited', () => {
      const store = useMindMapStore.getState()
      store.openEditor('non-existent-id')
      
      render(<EditorDialog />)
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Auto-save Information', () => {
    it('should display auto-save information', () => {
      const store = useMindMapStore.getState()
      store.openEditor(mockEntry.id)
      
      render(<EditorDialog />)
      
      expect(screen.getByText(/Press Ctrl\+S to save manually/)).toBeInTheDocument()
      expect(screen.getByText(/Changes auto-save after 1\.5 seconds/)).toBeInTheDocument()
    })
  })

  describe('Multiple Entries', () => {
    it('should switch content when editing different entries', () => {
      const store = useMindMapStore.getState()
      const entry2 = store.addEntry([2, 2, 2])
      store.updateEntry(entry2.id, { 
        summary: 'Second Entry',
        content: '<p>Second content</p>' 
      })
      
      // Open first entry
      store.openEditor(mockEntry.id)
      const { rerender } = render(<EditorDialog />)
      
      expect(screen.getByText(`Initial Content: ${mockEntry.content}`)).toBeInTheDocument()
      
      // Close and open second entry
      store.closeEditor()
      store.openEditor(entry2.id)
      rerender(<EditorDialog />)
      
      expect(screen.getByText(`Initial Content: <p>Second content</p>`)).toBeInTheDocument()
    })
  })

  describe('Dialog Styling', () => {
    it('should have correct dialog dimensions', () => {
      const store = useMindMapStore.getState()
      store.openEditor(mockEntry.id)
      
      render(<EditorDialog />)
      
      const dialogContent = screen.getByRole('dialog').querySelector('[role="dialog"] > div')
      expect(dialogContent).toHaveClass('max-w-[800px]', 'h-[80vh]')
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should prevent ESC propagation when editor is open', () => {
      const store = useMindMapStore.getState()
      store.openEditor(mockEntry.id)
      
      render(<EditorDialog />)
      
      const mockListener = jest.fn()
      document.addEventListener('keydown', mockListener)
      
      const event = new KeyboardEvent('keydown', { 
        key: 'Escape',
        bubbles: true,
        cancelable: true
      })
      
      document.dispatchEvent(event)
      
      // The event should be prevented from propagating
      expect(mockListener).toHaveBeenCalled()
      const receivedEvent = mockListener.mock.calls[0][0]
      expect(receivedEvent.defaultPrevented).toBe(true)
      
      document.removeEventListener('keydown', mockListener)
    })

    it('should not interfere with other keyboard shortcuts', () => {
      const store = useMindMapStore.getState()
      store.openEditor(mockEntry.id)
      
      render(<EditorDialog />)
      
      const mockListener = jest.fn()
      document.addEventListener('keydown', mockListener)
      
      fireEvent.keyDown(document, { key: 'Enter' })
      
      expect(mockListener).toHaveBeenCalled()
      const receivedEvent = mockListener.mock.calls[0][0]
      expect(receivedEvent.defaultPrevented).toBe(false)
      
      document.removeEventListener('keydown', mockListener)
    })
  })

  describe('State Synchronization', () => {
    it('should update store when editor is closed', async () => {
      const store = useMindMapStore.getState()
      store.openEditor(mockEntry.id)
      
      render(<EditorDialog />)
      
      expect(store.isEditorOpen).toBe(true)
      expect(store.editingEntryId).toBe(mockEntry.id)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      await waitFor(() => {
        expect(store.isEditorOpen).toBe(false)
        expect(store.editingEntryId).toBeNull()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle missing entry gracefully', () => {
      const store = useMindMapStore.getState()
      // Set editingEntryId to a non-existent entry
      store.openEditor('non-existent-id')
      
      // Should not throw and should not render
      expect(() => render(<EditorDialog />)).not.toThrow()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const store = useMindMapStore.getState()
      store.openEditor(mockEntry.id)
      
      const { unmount } = render(<EditorDialog />)
      
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')
      
      // Trigger re-render to attach listeners
      store.closeEditor()
      store.openEditor(mockEntry.id)
      
      unmount()
      
      // Check that listeners were cleaned up
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        true
      )
      
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })
})