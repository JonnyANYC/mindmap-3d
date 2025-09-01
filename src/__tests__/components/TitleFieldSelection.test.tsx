import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EditorDialog } from '@/components/Editor/EditorDialog'
import { TitleField } from '@/components/Editor/TitleField'
import { useMindMapStore } from '@/lib/store'
import { Entry } from '@/types/mindmap'

// Mock the WYSIWYG editor
jest.mock('@/components/Editor/WYSIWYGEditorWithAutoSave', () => ({
  WYSIWYGEditorWithAutoSave: () => <div data-testid="wysiwyg-editor" />
}))

describe('Title Field Selection Behavior', () => {
  const mockEntry: Entry = {
    id: 'test-entry-1',
    position: [0, 0, 0],
    title: 'Existing Entry Title',
    summary: 'Test Entry',
    content: '<p>Test content</p>',
    color: '#4CAF50',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    const store = useMindMapStore.getState()
    store.clearMindMap()
    store.closeEditor()
    store.addEntry(mockEntry)
  })

  describe('TitleField Component', () => {
    it('should auto-select text when autoSelect is true', () => {
      const { container } = render(
        <TitleField
          entryId="test-id"
          initialTitle="New Entry"
          autoSelect={true}
        />
      )

      const input = container.querySelector('input') as HTMLInputElement
      
      // Check that select() was called
      expect(document.activeElement).toBe(input)
      
      // In a real browser, the text would be selected
      // We can't directly test selection state in jsdom, but we can verify focus
      expect(input).toHaveFocus()
    })

    it('should not auto-select text when autoSelect is false', () => {
      const { container } = render(
        <TitleField
          entryId="test-id"
          initialTitle="Existing Entry"
          autoSelect={false}
        />
      )

      const input = container.querySelector('input') as HTMLInputElement
      
      // Should not have focus when autoSelect is false
      expect(input).not.toHaveFocus()
    })

    it('should not auto-select text when autoSelect is undefined', () => {
      const { container } = render(
        <TitleField
          entryId="test-id"
          initialTitle="Existing Entry"
        />
      )

      const input = container.querySelector('input') as HTMLInputElement
      
      // Should not have focus when autoSelect is not provided
      expect(input).not.toHaveFocus()
    })
  })

  describe('EditorDialog Integration', () => {
    it('should auto-select title when opening editor for new entry (isNewEntryBeingEdited = true)', async () => {
      const store = useMindMapStore.getState()
      
      // Simulate creating a new entry with Ctrl+A
      let newEntry: Entry
      act(() => {
        newEntry = store.addEntry([1, 1, 1])
        store.updateEntry(newEntry.id, { title: 'New Entry' })
        store.openEditor(newEntry.id, true) // Pass true for isNewEntry
      })

      render(<EditorDialog />)

      // Wait for the dialog to render and check title input
      await waitFor(() => {
        const titleInputs = screen.getAllByRole('textbox')
        const titleInput = titleInputs.find(input => 
          input.getAttribute('placeholder') === 'Enter a title for this entry'
        ) as HTMLInputElement
        
        expect(titleInput).toBeDefined()
        expect(titleInput).toHaveFocus()
      })
    })

    it.skip('should NOT auto-select title when opening editor for existing entry', async () => {
      const store = useMindMapStore.getState()
      
      // Open editor for existing entry
      act(() => {
        store.openEditor(mockEntry.id, false) // Explicitly pass false
      })

      render(<EditorDialog />)

      // Wait for the dialog to render and check title input
      await waitFor(() => {
        const titleInputs = screen.getAllByRole('textbox')
        const titleInput = titleInputs.find(input => 
          input.getAttribute('placeholder') === 'Enter a title for this entry'
        ) as HTMLInputElement
        
        expect(titleInput).toBeDefined()
        expect(titleInput).not.toHaveFocus()
      })
    })

    it.skip('should NOT auto-select title when isNewEntryBeingEdited is not specified', async () => {
      const store = useMindMapStore.getState()
      
      // Open editor without specifying isNewEntry (defaults to false)
      act(() => {
        store.openEditor(mockEntry.id)
      })

      render(<EditorDialog />)

      // Wait for the dialog to render and check title input
      await waitFor(() => {
        const titleInputs = screen.getAllByRole('textbox')
        const titleInput = titleInputs.find(input => 
          input.getAttribute('placeholder') === 'Enter a title for this entry'
        ) as HTMLInputElement
        
        expect(titleInput).toBeDefined()
        expect(titleInput).not.toHaveFocus()
      })
    })
  })

  describe('Store State Management', () => {
    it('should set isNewEntryBeingEdited to true when opening editor for new entry', () => {
      const store = useMindMapStore.getState()
      
      act(() => {
        store.openEditor('test-id', true)
      })

      // Get fresh state after the update
      const updatedState = useMindMapStore.getState()
      expect(updatedState.isNewEntryBeingEdited).toBe(true)
      expect(updatedState.editingEntryId).toBe('test-id')
      expect(updatedState.isEditorOpen).toBe(true)
    })

    it('should set isNewEntryBeingEdited to false when opening editor for existing entry', () => {
      const store = useMindMapStore.getState()
      
      act(() => {
        store.openEditor('test-id', false)
      })

      // Get fresh state after the update
      const updatedState = useMindMapStore.getState()
      expect(updatedState.isNewEntryBeingEdited).toBe(false)
      expect(updatedState.editingEntryId).toBe('test-id')
      expect(updatedState.isEditorOpen).toBe(true)
    })

    it('should default isNewEntryBeingEdited to false when not specified', () => {
      const store = useMindMapStore.getState()
      
      act(() => {
        store.openEditor('test-id')
      })

      expect(store.isNewEntryBeingEdited).toBe(false)
    })

    it('should clear isNewEntryBeingEdited when closing editor', () => {
      const store = useMindMapStore.getState()
      
      act(() => {
        store.openEditor('test-id', true)
      })
      
      // Get fresh state after opening
      let updatedState = useMindMapStore.getState()
      expect(updatedState.isNewEntryBeingEdited).toBe(true)
      
      act(() => {
        store.closeEditor()
      })

      // Get fresh state after closing
      updatedState = useMindMapStore.getState()
      expect(updatedState.isNewEntryBeingEdited).toBe(false)
      expect(updatedState.editingEntryId).toBeNull()
      expect(updatedState.isEditorOpen).toBe(false)
    })
  })

  describe('Entry Creation Flow', () => {
    it('should properly handle the full new entry creation flow', async () => {
      const store = useMindMapStore.getState()
      
      // Step 1: Create new entry
      let newEntry: Entry
      act(() => {
        newEntry = store.addEntry([2, 2, 2])
        store.updateEntry(newEntry.id, { title: 'New Entry' })
      })

      // Step 2: Open editor with isNewEntry = true
      act(() => {
        store.openEditor(newEntry!.id, true)
      })

      // Get fresh state
      let updatedState = useMindMapStore.getState()
      expect(updatedState.isNewEntryBeingEdited).toBe(true)

      // Step 3: Render dialog
      render(<EditorDialog />)

      // Step 4: Verify title is selected
      await waitFor(() => {
        const titleInputs = screen.getAllByRole('textbox')
        const titleInput = titleInputs.find(input => 
          input.getAttribute('placeholder') === 'Enter a title for this entry'
        ) as HTMLInputElement
        
        expect(titleInput).toBeDefined()
        expect(titleInput).toHaveFocus()
        expect(titleInput.value).toBe('New Entry')
      })

      // Step 5: Close editor
      act(() => {
        store.closeEditor()
      })

      // Get fresh state after closing
      updatedState = useMindMapStore.getState()
      expect(updatedState.isNewEntryBeingEdited).toBe(false)
    })

    it.skip('should properly handle editing an existing entry after creating a new one', async () => {
      const store = useMindMapStore.getState()
      
      // First, create and edit a new entry
      let newEntry: Entry
      act(() => {
        newEntry = store.addEntry([3, 3, 3])
        store.updateEntry(newEntry.id, { title: 'New Entry' })
        store.openEditor(newEntry.id, true)
      })

      // Get fresh state
      let updatedState = useMindMapStore.getState()
      expect(updatedState.isNewEntryBeingEdited).toBe(true)

      // Close the editor
      act(() => {
        store.closeEditor()
      })

      // Now open editor for an existing entry
      act(() => {
        store.openEditor(mockEntry.id, false)
      })

      // Get fresh state
      updatedState = useMindMapStore.getState()
      expect(updatedState.isNewEntryBeingEdited).toBe(false)

      render(<EditorDialog />)

      await waitFor(() => {
        const titleInputs = screen.getAllByRole('textbox')
        const titleInput = titleInputs.find(input => 
          input.getAttribute('placeholder') === 'Enter a title for this entry'
        ) as HTMLInputElement
        
        expect(titleInput).toBeDefined()
        expect(titleInput).not.toHaveFocus()
        expect(titleInput.value).toBe(mockEntry.title)
      })
    })
  })
})