import { useMindMapStore } from '@/lib/store'
import { Entry, Connection, MindMap } from '@/types/mindmap'

describe('MindMapStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useMindMapStore.getState()
    store.clearMindMap()
    store.clearConnectionFeedback()
    store.clearAllOverlays()
    store.clearDeletedEntries()
    // Reset help overlay state
    store.setHelpOverlayCollapsed(false)
  })

  describe('Entry Actions', () => {
    it('should add an entry with position', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry([1, 2, 3])
      
      expect(entry).toBeDefined()
      expect(entry.position).toEqual([1, 2, 3])
      expect(entry.summary).toBe('New Entry')
      expect(entry.content).toBe('')
      
      // Get updated state
      const updatedState = useMindMapStore.getState()
      expect(updatedState.entries).toHaveLength(1)
      expect(updatedState.selectedEntryId).toBe(entry.id)
    })

    it('should add an entry with random position when no position provided', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry()
      
      expect(entry).toBeDefined()
      expect(entry.position).toHaveLength(3)
      expect(entry.position[0]).toBeGreaterThanOrEqual(-2)
      expect(entry.position[0]).toBeLessThanOrEqual(2)
    })

    it('should add an entry from existing Entry object', () => {
      const store = useMindMapStore.getState()
      
      const existingEntry: Entry = {
        id: 'test-id',
        position: [1, 1, 1],
        summary: 'Existing Entry',
        content: 'Content',
        color: '#FF0000',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const entry = store.addEntry(existingEntry)
      
      expect(entry).toEqual(existingEntry)
      expect(store.entries).toHaveLength(1)
    })

    it('should not duplicate existing entry when adding Entry object', () => {
      const store = useMindMapStore.getState()
      
      const existingEntry: Entry = {
        id: 'test-id',
        position: [1, 1, 1],
        summary: 'Existing Entry',
        content: 'Content',
        color: '#FF0000',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      store.addEntry(existingEntry)
      const entry2 = store.addEntry(existingEntry)
      
      expect(store.entries).toHaveLength(1)
      expect(entry2).toEqual(existingEntry)
    })

    it('should update an entry', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry()
      const originalUpdatedAt = entry.updatedAt
      
      // Wait a bit to ensure time difference
      jest.advanceTimersByTime(100)
      
      store.updateEntry(entry.id, {
        summary: 'Updated Entry',
        content: 'Updated content'
      })
      
      const updatedEntry = store.getEntryById(entry.id)
      expect(updatedEntry?.summary).toBe('Updated Entry')
      expect(updatedEntry?.content).toBe('Updated content')
      expect(updatedEntry?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should not update non-existent entry', () => {
      const store = useMindMapStore.getState()
      
      store.updateEntry('non-existent', { summary: 'Test' })
      
      expect(store.entries).toHaveLength(0)
    })

    it('should delete an entry', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry()
      const entryId = entry.id
      
      store.deleteEntry(entryId)
      
      expect(store.entries).toHaveLength(0)
      expect(store.getEntryById(entryId)).toBeUndefined()
      expect(store.selectedEntryId).toBeNull()
    })

    it('should delete an entry and its connections', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      const entry3 = store.addEntry()
      
      store.addConnection(entry1.id, entry2.id)
      store.addConnection(entry2.id, entry3.id)
      
      expect(store.connections).toHaveLength(2)
      
      store.deleteEntry(entry2.id)
      
      expect(store.entries).toHaveLength(2)
      expect(store.connections).toHaveLength(0)
    })

    it('should store deleted entries for undo', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry()
      const entryId = entry.id
      
      store.deleteEntry(entryId)
      
      expect(store.deletedEntries).toHaveLength(1)
      expect(store.deletedEntries[0].entry.id).toBe(entryId)
    })

    it('should restore deleted entry', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      store.addConnection(entry1.id, entry2.id)
      
      store.deleteEntry(entry2.id)
      
      const deletedEntry = store.deletedEntries[0]
      store.restoreDeletedEntry(deletedEntry)
      
      expect(store.entries).toHaveLength(2)
      expect(store.connections).toHaveLength(1)
      expect(store.selectedEntryId).toBe(entry2.id)
      expect(store.deletedEntries).toHaveLength(0)
    })

    it('should clear deleted entries', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry()
      store.deleteEntry(entry.id)
      
      expect(store.deletedEntries).toHaveLength(1)
      
      store.clearDeletedEntries()
      
      expect(store.deletedEntries).toHaveLength(0)
    })

    it('should move an entry', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry([0, 0, 0])
      const newPosition: [number, number, number] = [1, 2, 3]
      
      store.moveEntry(entry.id, newPosition)
      
      const movedEntry = store.getEntryById(entry.id)
      expect(movedEntry?.position).toEqual(newPosition)
    })

    it('should select and deselect entries', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry()
      
      store.selectEntry(entry.id)
      expect(store.selectedEntryId).toBe(entry.id)
      expect(store.getSelectedEntry()?.id).toBe(entry.id)
      
      store.selectEntry(null)
      expect(store.selectedEntryId).toBeNull()
      expect(store.getSelectedEntry()).toBeUndefined()
    })

    it('should hover and unhover entries', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry()
      
      store.hoverEntry(entry.id)
      expect(store.hoveredEntryId).toBe(entry.id)
      expect(store.getHoveredEntry()?.id).toBe(entry.id)
      
      store.hoverEntry(null)
      expect(store.hoveredEntryId).toBeNull()
      expect(store.getHoveredEntry()).toBeUndefined()
    })
  })

  describe('Connection Actions', () => {
    it('should add a connection between entries', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry([0, 0, 0])
      const entry2 = store.addEntry([1, 1, 1])
      
      const connection = store.addConnection(entry1.id, entry2.id)
      
      expect(connection).toBeDefined()
      expect(connection?.sourceId).toBe(entry1.id)
      expect(connection?.targetId).toBe(entry2.id)
      
      // Get updated state
      const updatedState = useMindMapStore.getState()
      expect(updatedState.connections).toHaveLength(1)
    })

    it('should add connection from Connection object', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      
      const connectionObj: Connection = {
        id: 'conn-id',
        sourceId: entry1.id,
        targetId: entry2.id,
        createdAt: new Date()
      }
      
      const connection = store.addConnection(connectionObj)
      
      expect(connection).toEqual(connectionObj)
      expect(store.connections).toHaveLength(1)
    })

    it('should not allow duplicate connections', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      
      const connection1 = store.addConnection(entry1.id, entry2.id)
      const connection2 = store.addConnection(entry1.id, entry2.id)
      
      expect(connection1).toBeDefined()
      expect(connection2).toBeNull()
      
      // Get updated state
      const updatedState = useMindMapStore.getState()
      expect(updatedState.connections).toHaveLength(1)
    })

    it('should not allow self-connections', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry()
      
      const connection = store.addConnection(entry.id, entry.id)
      
      expect(connection).toBeNull()
      expect(store.connections).toHaveLength(0)
    })

    it('should add connection to history', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      
      store.addConnection(entry1.id, entry2.id)
      
      expect(store.connectionHistory).toHaveLength(1)
      expect(store.connectionHistory[0].type).toBe('add')
      expect(store.connectionHistoryIndex).toBe(0)
    })

    it('should show connection feedback overlay', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      
      store.addConnection(entry1.id, entry2.id)
      
      expect(store.connectionFeedback).toBeDefined()
      expect(store.connectionFeedback?.message).toBe('Connection Added. Click to remove')
      expect(store.overlays['connectionFeedback']?.visible).toBe(true)
    })

    it('should remove a connection', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      
      store.addConnection(entry1.id, entry2.id)
      store.removeConnection(entry1.id, entry2.id)
      
      expect(store.connections).toHaveLength(0)
      expect(store.connectionHistory).toHaveLength(2)
      expect(store.connectionHistory[1].type).toBe('remove')
    })

    it('should toggle connections', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      
      // Add connection
      store.toggleConnection(entry1.id, entry2.id)
      let updatedState = useMindMapStore.getState()
      expect(updatedState.connections).toHaveLength(1)
      
      // Remove connection
      store.toggleConnection(entry1.id, entry2.id)
      updatedState = useMindMapStore.getState()
      expect(updatedState.connections).toHaveLength(0)
    })

    it('should get connection between entries bidirectionally', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      
      store.addConnection(entry1.id, entry2.id)
      
      const connection1 = store.getConnectionBetween(entry1.id, entry2.id)
      const connection2 = store.getConnectionBetween(entry2.id, entry1.id)
      
      expect(connection1).toBeDefined()
      expect(connection1).toEqual(connection2)
    })

    it('should undo connection operations', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      
      // Add connection
      store.addConnection(entry1.id, entry2.id)
      expect(store.connections).toHaveLength(1)
      
      // Undo add
      store.undoConnection()
      expect(store.connections).toHaveLength(0)
      expect(store.connectionHistoryIndex).toBe(-1)
    })

    it('should redo connection operations', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      
      // Add connection
      store.addConnection(entry1.id, entry2.id)
      store.undoConnection()
      
      // Redo add
      store.redoConnection()
      expect(store.connections).toHaveLength(1)
      expect(store.connectionHistoryIndex).toBe(0)
    })

    it('should clear connection feedback', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      
      store.addConnection(entry1.id, entry2.id)
      expect(store.connectionFeedback).toBeDefined()
      
      store.clearConnectionFeedback()
      
      expect(store.connectionFeedback).toBeNull()
      expect(store.overlays['connectionFeedback']?.visible).toBe(false)
    })
  })

  describe('Editor Actions', () => {
    it('should open editor for an entry', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry()
      
      store.openEditor(entry.id)
      
      expect(store.isEditorOpen).toBe(true)
      expect(store.editingEntryId).toBe(entry.id)
    })

    it('should close editor', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry()
      store.openEditor(entry.id)
      
      store.closeEditor()
      
      expect(store.isEditorOpen).toBe(false)
      expect(store.editingEntryId).toBeNull()
    })
  })

  describe('Movement Actions', () => {
    it('should start movement in plane mode', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry([1, 2, 3])
      
      store.startMovement(entry.id, entry.position, 'plane')
      
      expect(store.movingEntryId).toBe(entry.id)
      expect(store.movementStartPosition).toEqual([1, 2, 3])
      expect(store.movementGhostPosition).toEqual([1, 2, 3])
      expect(store.movementMode).toBe('plane')
      expect(store.isCameraLocked).toBe(true)
    })

    it('should update movement position', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry([1, 2, 3])
      store.startMovement(entry.id, entry.position, 'plane')
      
      const newPosition: [number, number, number] = [4, 5, 6]
      store.updateMovementPosition(newPosition)
      
      expect(store.movementGhostPosition).toEqual(newPosition)
    })

    it('should confirm movement', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry([1, 2, 3])
      store.startMovement(entry.id, entry.position, 'plane')
      
      const newPosition: [number, number, number] = [4, 5, 6]
      store.updateMovementPosition(newPosition)
      store.confirmMovement()
      
      // Get fresh state after action
      const updatedState = useMindMapStore.getState()
      const movedEntry = updatedState.getEntryById(entry.id)
      expect(movedEntry?.position).toEqual(newPosition)
      expect(updatedState.movingEntryId).toBeNull()
      expect(updatedState.isCameraLocked).toBe(false)
    })

    it('should cancel movement', () => {
      const store = useMindMapStore.getState()
      
      const originalPosition: [number, number, number] = [1, 2, 3]
      const entry = store.addEntry(originalPosition)
      store.startMovement(entry.id, entry.position, 'plane')
      
      const newPosition: [number, number, number] = [4, 5, 6]
      store.updateMovementPosition(newPosition)
      store.cancelMovement()
      
      const cancelledEntry = store.getEntryById(entry.id)
      expect(cancelledEntry?.position).toEqual(originalPosition)
      expect(store.movingEntryId).toBeNull()
      expect(store.isCameraLocked).toBe(false)
    })
  })

  describe('Overlay Actions', () => {
    it('should show overlay', () => {
      const store = useMindMapStore.getState()
      
      store.showOverlay('test', { message: 'Test message' })
      
      // Get fresh state after action
      const updatedState = useMindMapStore.getState()
      expect(updatedState.overlays['test']).toBeDefined()
      expect(updatedState.overlays['test'].visible).toBe(true)
      expect(updatedState.overlays['test'].data?.message).toBe('Test message')
    })

    it('should hide overlay', () => {
      const store = useMindMapStore.getState()
      
      store.showOverlay('test', { message: 'Test message' })
      store.hideOverlay('test')
      
      // Get fresh state after action
      const updatedState = useMindMapStore.getState()
      expect(updatedState.overlays['test'].visible).toBe(false)
    })

    it('should check overlay visibility', () => {
      const store = useMindMapStore.getState()
      
      expect(store.isOverlayVisible('test')).toBe(false)
      
      store.showOverlay('test', { message: 'Test message' })
      expect(store.isOverlayVisible('test')).toBe(true)
      
      store.hideOverlay('test')
      expect(store.isOverlayVisible('test')).toBe(false)
    })

    it('should update overlay data', () => {
      const store = useMindMapStore.getState()
      
      store.showOverlay('test', { message: 'Initial' })
      store.updateOverlayData('test', { message: 'Updated' })
      
      // Get fresh state after action
      const updatedState = useMindMapStore.getState()
      expect(updatedState.overlays['test'].data?.message).toBe('Updated')
    })

    it('should clear all overlays', () => {
      const store = useMindMapStore.getState()
      
      store.showOverlay('test1', { message: 'Test 1' })
      store.showOverlay('test2', { message: 'Test 2' })
      
      store.clearAllOverlays()
      
      // Get fresh state after action
      const updatedState = useMindMapStore.getState()
      expect(updatedState.overlays['test1'].visible).toBe(false)
      expect(updatedState.overlays['test2'].visible).toBe(false)
    })
  })

  describe('Utility Actions', () => {
    it('should clear mind map', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      store.addConnection(entry1.id, entry2.id)
      store.selectEntry(entry1.id)
      
      store.clearMindMap()
      
      expect(store.entries).toHaveLength(0)
      expect(store.connections).toHaveLength(0)
      expect(store.selectedEntryId).toBeNull()
      expect(store.mindMapId).toBeNull()
    })

    it('should load a mind map', () => {
      const store = useMindMapStore.getState()
      
      const mindMapData: MindMap = {
        id: 'test-id',
        name: 'Test Mind Map',
        entries: [{
          id: 'entry-1',
          position: [0, 0, 0] as [number, number, number],
          summary: 'Test Entry',
          content: 'Test content',
          color: '#4CAF50',
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        connections: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        uiSettings: {
          isHelpOverlayCollapsed: true
        }
      }
      
      store.loadMindMap(mindMapData)
      
      // Get updated state
      const updatedState = useMindMapStore.getState()
      expect(updatedState.mindMapId).toBe('test-id')
      expect(updatedState.currentMindMapId).toBe('test-id')
      expect(updatedState.entries).toHaveLength(1)
      expect(updatedState.entries[0].summary).toBe('Test Entry')
      expect(updatedState.isHelpOverlayCollapsed).toBe(true)
    })

    it('should get connected entries', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      const entry3 = store.addEntry()
      const entry4 = store.addEntry()
      
      store.addConnection(entry1.id, entry2.id)
      store.addConnection(entry1.id, entry3.id)
      
      const connected = store.getConnectedEntries(entry1.id)
      
      expect(connected).toHaveLength(2)
      expect(connected.map(e => e.id)).toContain(entry2.id)
      expect(connected.map(e => e.id)).toContain(entry3.id)
      expect(connected.map(e => e.id)).not.toContain(entry4.id)
    })

    it('should get mind map data', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry()
      store.updateEntry(entry.id, { summary: 'Test Entry' })
      
      const mindMapData = store.getMindMapData()
      
      expect(mindMapData.entries).toHaveLength(1)
      expect(mindMapData.entries[0].summary).toBe('Test Entry')
      expect(mindMapData.connections).toHaveLength(0)
      // The help overlay state should reflect the current state
      const currentState = useMindMapStore.getState()
      expect(mindMapData.uiSettings?.isHelpOverlayCollapsed).toBe(currentState.isHelpOverlayCollapsed)
    })
  })

  describe('Connection Status Actions', () => {
    it('should set connection status', () => {
      const store = useMindMapStore.getState()
      
      expect(store.connectionStatus).toBe('disconnected')
      
      store.setConnectionStatus('connecting')
      // Get fresh state after action
      let updatedState = useMindMapStore.getState()
      expect(updatedState.connectionStatus).toBe('connecting')
      
      store.setConnectionStatus('connected')
      // Get fresh state after action
      updatedState = useMindMapStore.getState()
      expect(updatedState.connectionStatus).toBe('connected')
    })
  })

  describe('Help Overlay Actions', () => {
    it('should toggle help overlay', () => {
      const store = useMindMapStore.getState()
      
      expect(store.isHelpOverlayCollapsed).toBe(false)
      
      store.toggleHelpOverlay()
      // Get fresh state after action
      let updatedState = useMindMapStore.getState()
      expect(updatedState.isHelpOverlayCollapsed).toBe(true)
      
      store.toggleHelpOverlay()
      // Get fresh state after action
      updatedState = useMindMapStore.getState()
      expect(updatedState.isHelpOverlayCollapsed).toBe(false)
    })

    it('should set help overlay collapsed state', () => {
      const store = useMindMapStore.getState()
      
      store.setHelpOverlayCollapsed(true)
      // Get fresh state after action
      let updatedState = useMindMapStore.getState()
      expect(updatedState.isHelpOverlayCollapsed).toBe(true)
      
      store.setHelpOverlayCollapsed(false)
      // Get fresh state after action
      updatedState = useMindMapStore.getState()
      expect(updatedState.isHelpOverlayCollapsed).toBe(false)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle non-existent entry operations gracefully', () => {
      const store = useMindMapStore.getState()
      
      // These should not throw errors
      store.updateEntry('non-existent', { summary: 'Test' })
      store.deleteEntry('non-existent')
      store.moveEntry('non-existent', [0, 0, 0])
      store.startMovement('non-existent', [0, 0, 0], 'plane')
      
      expect(store.entries).toHaveLength(0)
    })

    it('should handle missing targetId in addConnection', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry()
      const connection = store.addConnection(entry.id)
      
      expect(connection).toBeNull()
      expect(store.connections).toHaveLength(0)
    })

    it('should limit deleted entries history to 10', () => {
      const store = useMindMapStore.getState()
      
      // Create and delete 15 entries
      for (let i = 0; i < 15; i++) {
        const entry = store.addEntry()
        store.deleteEntry(entry.id)
      }
      
      // Get fresh state after actions
      const updatedState = useMindMapStore.getState()
      expect(updatedState.deletedEntries).toHaveLength(10)
    })
  })

  describe('State Immutability', () => {
    it('should maintain state immutability when updating entries', () => {
      const store = useMindMapStore.getState()
      
      const entry = store.addEntry()
      const originalEntries = store.entries
      
      store.updateEntry(entry.id, { summary: 'Updated' })
      
      const newEntries = useMindMapStore.getState().entries
      expect(originalEntries).not.toBe(newEntries)
    })

    it('should maintain state immutability when adding connections', () => {
      const store = useMindMapStore.getState()
      
      const entry1 = store.addEntry()
      const entry2 = store.addEntry()
      const originalConnections = store.connections
      
      store.addConnection(entry1.id, entry2.id)
      
      const newConnections = useMindMapStore.getState().connections
      expect(originalConnections).not.toBe(newConnections)
    })
  })
})