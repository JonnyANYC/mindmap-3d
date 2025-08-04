import { useMindMapStore } from '@/lib/store'
import type { Entry, Connection } from '@/types/mindmap'

// Selectors for accessing state
export const useEntries = () => useMindMapStore(state => state.entries)
export const useConnections = () => useMindMapStore(state => state.connections)
export const useSelectedEntryId = () => useMindMapStore(state => state.selectedEntryId)
export const useHoveredEntryId = () => useMindMapStore(state => state.hoveredEntryId)

// Computed selectors
export const useSelectedEntry = () => useMindMapStore(state => state.getSelectedEntry())
export const useHoveredEntry = () => useMindMapStore(state => state.getHoveredEntry())

// Action hooks
export const useEntryActions = () => {
  const addEntry = useMindMapStore(state => state.addEntry)
  const updateEntry = useMindMapStore(state => state.updateEntry)
  const deleteEntry = useMindMapStore(state => state.deleteEntry)
  const moveEntry = useMindMapStore(state => state.moveEntry)
  const selectEntry = useMindMapStore(state => state.selectEntry)
  const hoverEntry = useMindMapStore(state => state.hoverEntry)
  
  return {
    addEntry,
    updateEntry,
    deleteEntry,
    moveEntry,
    selectEntry,
    hoverEntry
  }
}

export const useConnectionActions = () => {
  const addConnection = useMindMapStore(state => state.addConnection)
  const removeConnection = useMindMapStore(state => state.removeConnection)
  const toggleConnection = useMindMapStore(state => state.toggleConnection)
  const getConnectionBetween = useMindMapStore(state => state.getConnectionBetween)
  const removeConnectionsForEntry = useMindMapStore(state => state.removeConnectionsForEntry)
  
  return {
    addConnection,
    removeConnection,
    toggleConnection,
    getConnectionBetween,
    removeConnectionsForEntry
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