import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { v4 as uuidv4 } from 'uuid'
import type { Entry, Connection, MindMap, Position3D } from '@/types/mindmap'
import { DEFAULT_ENTRY_COLOR } from '@/types/mindmap'

interface ConnectionOperation {
  id: string
  type: 'add' | 'remove'
  sourceId: string
  targetId: string
  connectionId: string
  timestamp: Date
}

interface MindMapState {
  entries: Entry[]
  connections: Connection[]
  selectedEntryId: string | null
  hoveredEntryId: string | null
  mindMapId: string | null
  
  // Connection feedback
  connectionFeedback: {
    message: string
    lastOperation?: ConnectionOperation
  } | null
  
  // Connection history for undo/redo
  connectionHistory: ConnectionOperation[]
  connectionHistoryIndex: number
  
  // Entry actions
  addEntry: (position?: Position3D) => Entry
  updateEntry: (id: string, updates: Partial<Entry>) => void
  deleteEntry: (id: string) => void
  moveEntry: (id: string, position: Position3D) => void
  selectEntry: (id: string | null) => void
  hoverEntry: (id: string | null) => void
  
  // Connection actions
  addConnection: (sourceId: string, targetId: string) => Connection | null
  removeConnection: (sourceId: string, targetId: string) => void
  toggleConnection: (sourceId: string, targetId: string) => void
  getConnectionBetween: (id1: string, id2: string) => Connection | undefined
  removeConnectionsForEntry: (entryId: string) => void
  
  // Connection history actions
  undoConnection: () => void
  redoConnection: () => void
  clearConnectionFeedback: () => void
  
  // Utility actions
  clearMindMap: () => void
  loadMindMap: (data: MindMap) => void
  getEntryById: (id: string) => Entry | undefined
  getConnectedEntries: (entryId: string) => Entry[]
  
  // Computed getters
  getSelectedEntry: () => Entry | undefined
  getHoveredEntry: () => Entry | undefined
  getMindMapData: () => MindMap
}

const getRandomPosition = (): Position3D => {
  return [
    Math.random() * 4 - 2,
    Math.random() * 2,
    Math.random() * 4 - 2
  ]
}

export const useMindMapStore = create<MindMapState>()(
  immer((set, get) => ({
    entries: [],
    connections: [],
    selectedEntryId: null,
    hoveredEntryId: null,
    mindMapId: null,
    connectionFeedback: null,
    connectionHistory: [],
    connectionHistoryIndex: -1,
    
    // Entry actions
    addEntry: (position?: Position3D) => {
      const newEntry: Entry = {
        id: uuidv4(),
        position: position || getRandomPosition(),
        summary: 'New Entry',
        content: '',
        color: DEFAULT_ENTRY_COLOR,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      set((state) => {
        state.entries.push(newEntry)
        // Auto-select the newly created entry
        state.selectedEntryId = newEntry.id
      })
      
      return newEntry
    },
    
    updateEntry: (id: string, updates: Partial<Entry>) => {
      set((state) => {
        const entry = state.entries.find(e => e.id === id)
        if (entry) {
          Object.assign(entry, updates)
          entry.updatedAt = new Date()
        }
      })
    },
    
    deleteEntry: (id: string) => {
      set((state) => {
        // Remove the entry
        state.entries = state.entries.filter(e => e.id !== id)
        
        // Remove all connections to/from this entry
        state.connections = state.connections.filter(
          c => c.sourceId !== id && c.targetId !== id
        )
        
        // Clear selection if this entry was selected
        if (state.selectedEntryId === id) {
          state.selectedEntryId = null
        }
        
        // Clear hover if this entry was hovered
        if (state.hoveredEntryId === id) {
          state.hoveredEntryId = null
        }
      })
    },
    
    moveEntry: (id: string, position: Position3D) => {
      set((state) => {
        const entry = state.entries.find(e => e.id === id)
        if (entry) {
          entry.position = position
          entry.updatedAt = new Date()
        }
      })
    },
    
    selectEntry: (id: string | null) => {
      set((state) => {
        state.selectedEntryId = id
      })
    },
    
    hoverEntry: (id: string | null) => {
      set((state) => {
        state.hoveredEntryId = id
      })
    },
    
    // Connection actions
    addConnection: (sourceId: string, targetId: string) => {
      // Don't allow self-connections
      if (sourceId === targetId) return null
      
      // Check if connection already exists
      const existing = get().getConnectionBetween(sourceId, targetId)
      if (existing) return null
      
      const newConnection: Connection = {
        id: uuidv4(),
        sourceId,
        targetId,
        createdAt: new Date()
      }
      
      const operation: ConnectionOperation = {
        id: uuidv4(),
        type: 'add',
        sourceId,
        targetId,
        connectionId: newConnection.id,
        timestamp: new Date()
      }
      
      set((state) => {
        state.connections.push(newConnection)
        
        // Clear any redo history when new operation is performed
        if (state.connectionHistoryIndex < state.connectionHistory.length - 1) {
          state.connectionHistory = state.connectionHistory.slice(0, state.connectionHistoryIndex + 1)
        }
        
        // Add to history
        state.connectionHistory.push(operation)
        state.connectionHistoryIndex = state.connectionHistory.length - 1
        
        // Show feedback
        state.connectionFeedback = {
          message: 'Connection Added. Click to remove',
          lastOperation: operation
        }
      })
      
      return newConnection
    },
    
    removeConnection: (sourceId: string, targetId: string) => {
      const connectionToRemove = get().getConnectionBetween(sourceId, targetId)
      if (!connectionToRemove) return
      
      const operation: ConnectionOperation = {
        id: uuidv4(),
        type: 'remove',
        sourceId: connectionToRemove.sourceId,
        targetId: connectionToRemove.targetId,
        connectionId: connectionToRemove.id,
        timestamp: new Date()
      }
      
      set((state) => {
        state.connections = state.connections.filter(
          c => c.id !== connectionToRemove.id
        )
        
        // Clear any redo history when new operation is performed
        if (state.connectionHistoryIndex < state.connectionHistory.length - 1) {
          state.connectionHistory = state.connectionHistory.slice(0, state.connectionHistoryIndex + 1)
        }
        
        // Add to history
        state.connectionHistory.push(operation)
        state.connectionHistoryIndex = state.connectionHistory.length - 1
        
        // Show feedback
        state.connectionFeedback = {
          message: 'Connection Removed. Click to undo',
          lastOperation: operation
        }
      })
    },
    
    toggleConnection: (sourceId: string, targetId: string) => {
      const existing = get().getConnectionBetween(sourceId, targetId)
      if (existing) {
        get().removeConnection(sourceId, targetId)
      } else {
        get().addConnection(sourceId, targetId)
      }
    },
    
    getConnectionBetween: (id1: string, id2: string) => {
      return get().connections.find(
        c => (c.sourceId === id1 && c.targetId === id2) ||
             (c.sourceId === id2 && c.targetId === id1)
      )
    },
    
    removeConnectionsForEntry: (entryId: string) => {
      set((state) => {
        state.connections = state.connections.filter(
          c => c.sourceId !== entryId && c.targetId !== entryId
        )
      })
    },
    
    // Connection history actions
    undoConnection: () => {
      const history = get().connectionHistory
      const currentIndex = get().connectionHistoryIndex
      
      if (currentIndex < 0) return
      
      const operation = history[currentIndex]
      
      set((state) => {
        if (operation.type === 'add') {
          // Undo add by removing the connection
          state.connections = state.connections.filter(c => c.id !== operation.connectionId)
        } else {
          // Undo remove by re-adding the connection
          const connection: Connection = {
            id: operation.connectionId,
            sourceId: operation.sourceId,
            targetId: operation.targetId,
            createdAt: new Date()
          }
          state.connections.push(connection)
        }
        
        state.connectionHistoryIndex = currentIndex - 1
        state.connectionFeedback = null
      })
    },
    
    redoConnection: () => {
      const history = get().connectionHistory
      const currentIndex = get().connectionHistoryIndex
      
      if (currentIndex >= history.length - 1) return
      
      const operation = history[currentIndex + 1]
      
      set((state) => {
        if (operation.type === 'add') {
          // Redo add by re-adding the connection
          const connection: Connection = {
            id: operation.connectionId,
            sourceId: operation.sourceId,
            targetId: operation.targetId,
            createdAt: new Date()
          }
          state.connections.push(connection)
        } else {
          // Redo remove by removing the connection
          state.connections = state.connections.filter(c => c.id !== operation.connectionId)
        }
        
        state.connectionHistoryIndex = currentIndex + 1
        state.connectionFeedback = null
      })
    },
    
    clearConnectionFeedback: () => {
      set((state) => {
        state.connectionFeedback = null
      })
    },
    
    // Utility actions
    clearMindMap: () => {
      set((state) => {
        state.entries = []
        state.connections = []
        state.selectedEntryId = null
        state.hoveredEntryId = null
        state.mindMapId = null
      })
    },
    
    loadMindMap: (data: MindMap) => {
      set((state) => {
        state.entries = data.entries
        state.connections = data.connections
        state.mindMapId = data.id
        state.selectedEntryId = null
        state.hoveredEntryId = null
      })
    },
    
    getEntryById: (id: string) => {
      return get().entries.find(e => e.id === id)
    },
    
    getConnectedEntries: (entryId: string) => {
      const connections = get().connections.filter(
        c => c.sourceId === entryId || c.targetId === entryId
      )
      
      const connectedIds = connections.map(c => 
        c.sourceId === entryId ? c.targetId : c.sourceId
      )
      
      return get().entries.filter(e => connectedIds.includes(e.id))
    },
    
    // Computed getters
    getSelectedEntry: () => {
      const id = get().selectedEntryId
      return id ? get().getEntryById(id) : undefined
    },
    
    getHoveredEntry: () => {
      const id = get().hoveredEntryId
      return id ? get().getEntryById(id) : undefined
    },
    
    getMindMapData: () => {
      return {
        id: get().mindMapId || uuidv4(),
        name: 'Untitled Mind Map',
        entries: get().entries,
        connections: get().connections,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  }))
)

// Initialize with sample data
const initializeWithSampleData = () => {
  const store = useMindMapStore.getState()
  
  // Create sample entries
  const entry1 = store.addEntry([-2, 0, 0])
  store.updateEntry(entry1.id, { summary: 'Main Idea', content: 'This is the central concept of the mind map.' })
  
  const entry2 = store.addEntry([0.5, 1, 1])
  store.updateEntry(entry2.id, { summary: 'Sub-topic 1', content: 'First major branch of the main idea.' })
  
  const entry3 = store.addEntry([0.5, -1, -1])
  store.updateEntry(entry3.id, { summary: 'Sub-topic 2', content: 'Second major branch of the main idea.' })
  
  // Create sample connections
  store.addConnection(entry1.id, entry2.id)
  store.addConnection(entry1.id, entry3.id)
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initializeWithSampleData()
}