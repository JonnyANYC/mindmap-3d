import { useMindMapStore } from '@/lib/store'
import type { Entry } from '@/types/mindmap'

// Selectors for accessing state
export const useEntries = () => useMindMapStore(state => state.entries)
export const useConnections = () => useMindMapStore(state => state.connections)
export const useSelectedEntryId = () => useMindMapStore(state => state.selectedEntryId)
export const useHoveredEntryId = () => useMindMapStore(state => state.hoveredEntryId)
export const useConnectionFeedback = () => useMindMapStore(state => state.connectionFeedback)

// Computed selectors
export const useSelectedEntry = () => useMindMapStore(state => state.getSelectedEntry())
export const useHoveredEntry = () => useMindMapStore(state => state.getHoveredEntry())

// UI state selectors
export const useIsHelpOverlayCollapsed = () => useMindMapStore(state => state.isHelpOverlayCollapsed)

// Action hooks
export const useEntryActions = () => {
  const addEntry = useMindMapStore(state => state.addEntry)
  const updateEntry = useMindMapStore(state => state.updateEntry)
  const deleteEntry = useMindMapStore(state => state.deleteEntry)
  const moveEntry = useMindMapStore(state => state.moveEntry)
  const selectEntry = useMindMapStore(state => state.selectEntry)
  const hoverEntry = useMindMapStore(state => state.hoverEntry)
  const toggleConnection = useMindMapStore(state => state.toggleConnection)
  
  return {
    addEntry,
    updateEntry,
    deleteEntry,
    moveEntry,
    selectEntry,
    hoverEntry,
    toggleConnection
  }
}

export const useConnectionActions = () => {
  const addConnection = useMindMapStore(state => state.addConnection)
  const removeConnection = useMindMapStore(state => state.removeConnection)
  const toggleConnection = useMindMapStore(state => state.toggleConnection)
  const getConnectionBetween = useMindMapStore(state => state.getConnectionBetween)
  const removeConnectionsForEntry = useMindMapStore(state => state.removeConnectionsForEntry)
  const undoConnection = useMindMapStore(state => state.undoConnection)
  const redoConnection = useMindMapStore(state => state.redoConnection)
  const clearConnectionFeedback = useMindMapStore(state => state.clearConnectionFeedback)
  
  return {
    addConnection,
    removeConnection,
    toggleConnection,
    getConnectionBetween,
    removeConnectionsForEntry,
    undoConnection,
    redoConnection,
    clearConnectionFeedback
  }
}

export const useMindMapActions = () => {
  const clearMindMap = useMindMapStore(state => state.clearMindMap)
  const loadMindMap = useMindMapStore(state => state.loadMindMap)
  const getMindMapData = useMindMapStore(state => state.getMindMapData)
  
  return {
    clearMindMap,
    loadMindMap,
    getMindMapData
  }
}

// Help overlay actions
export const useHelpOverlayActions = () => {
  const toggleHelpOverlay = useMindMapStore(state => state.toggleHelpOverlay)
  const setHelpOverlayCollapsed = useMindMapStore(state => state.setHelpOverlayCollapsed)
  
  return {
    toggleHelpOverlay,
    setHelpOverlayCollapsed
  }
}

// Helper hooks for specific use cases
export const useEntryById = (id: string): Entry | undefined => {
  return useMindMapStore(state => state.entries.find(e => e.id === id))
}

export const useIsEntrySelected = (id: string): boolean => {
  return useMindMapStore(state => state.selectedEntryId === id)
}

export const useIsEntryHovered = (id: string): boolean => {
  return useMindMapStore(state => state.hoveredEntryId === id)
}

export const useConnectedEntries = (entryId: string): Entry[] => {
  return useMindMapStore(state => state.getConnectedEntries(entryId))
}