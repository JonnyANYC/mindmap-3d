'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import { v4 as uuidv4 } from 'uuid'
import type { Entry, Connection, MindMap, Position3D } from '@/types/mindmap'
import { rearrangeMindMap } from './rearrangement'

// Web Worker interface for rearrangement
interface RearrangementWorker {
  rearrangeWithWorker: (
    rootEntry: Entry,
    entries: Entry[],
    connections: Connection[],
    onProgress?: (progress: number) => void,
    onComplete?: (result: { newPositions: Record<string, Position3D>, updatedEntries: Entry[] }) => void,
    onError?: (error: string) => void
  ) => void
  terminateWorker: () => void
  isWorking: () => boolean
}

// Global worker instance
let rearrangementWorker: RearrangementWorker | null = null

// Initialize worker
const initRearrangementWorker = (): RearrangementWorker => {
  if (!rearrangementWorker && typeof window !== 'undefined') {
    const workerRef = { current: null as Worker | null }
    const isWorkingRef = { current: false }

    const initWorker = () => {
      if (!workerRef.current) {
        workerRef.current = new Worker('/rearrangement-worker.js')
      }
    }

    const terminateWorker = () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
      isWorkingRef.current = false
    }

    const rearrangeWithWorker = (
      rootEntry: Entry,
      entries: Entry[],
      connections: Connection[],
      onProgress?: (progress: number) => void,
      onComplete?: (result: { newPositions: Record<string, Position3D>, updatedEntries: Entry[] }) => void,
      onError?: (error: string) => void
    ) => {
      if (isWorkingRef.current) {
        onError?.('Rearrangement is already in progress')
        return
      }

      initWorker()
      
      if (!workerRef.current) {
        onError?.('Failed to initialize worker')
        return
      }

      isWorkingRef.current = true
      const worker = workerRef.current

      worker.onmessage = (e) => {
        const { type, progress, result, error } = e.data

        switch (type) {
          case 'progress':
            onProgress?.(progress)
            break
          case 'complete':
            isWorkingRef.current = false
            onComplete?.(result)
            break
          case 'error':
            isWorkingRef.current = false
            onError?.(error)
            break
        }
      }

      worker.onerror = (error) => {
        isWorkingRef.current = false
        onError?.(`Worker error: ${error.message}`)
      }

      worker.postMessage({
        type: 'rearrange',
        data: { rootEntry, entries, connections }
      })
    }

    rearrangementWorker = {
      rearrangeWithWorker,
      terminateWorker,
      isWorking: () => isWorkingRef.current
    }
  }

  return rearrangementWorker!
}
import { DEFAULT_ENTRY_COLOR } from '@/types/mindmap'

// Enable Map support in Immer
enableMapSet()

interface ConnectionOperation {
  id: string
  type: 'add' | 'remove'
  sourceId: string
  targetId: string
  connectionId: string
  timestamp: Date
}

interface DeletedEntry {
  entry: Entry
  connections: Connection[]
  deletedAt: Date
}

type MovementMode = 'plane' | 'depth' | null

interface OverlayData {
  message?: string
  lastOperation?: ConnectionOperation
  position?: Position3D
  [key: string]: unknown
}

interface OverlayState {
  visible: boolean
  data?: OverlayData
  autoDismiss?: boolean
  dismissTimeout?: number
}

interface MindMapState {
  entries: Entry[]
  connections: Connection[]
  selectedEntryId: string | null
  hoveredEntryId: string | null
  mindMapId: string | null
  currentMindMapId: string | null
  name: string | null
  rootEntryId: string | null
  
  // Connection feedback
  connectionFeedback: {
    message: string
    lastOperation?: ConnectionOperation
  } | null
  
  // Connection history for undo/redo
  connectionHistory: ConnectionOperation[]
  connectionHistoryIndex: number
  
  // Deleted entries for undo
  deletedEntries: DeletedEntry[]
  
  // Editor state
  isEditorOpen: boolean
  editingEntryId: string | null
  
  // Movement state
  movingEntryId: string | null
  movementStartPosition: Position3D | null
  movementGhostPosition: Position3D | null
  movementMode: MovementMode
  isCameraLocked: boolean
  
  // UI Overlay state - using object instead of Map for Immer compatibility
  overlays: Record<string, OverlayState>
  
  // Help overlay state
  isHelpOverlayCollapsed: boolean
  isInputFocused: boolean

  // Rearrangement state
  rearrangementTargetPositions: Map<string, Position3D> | null
  rearrangementProgress: number
  
  // Rearrangement undo state
  previousRearrangementState: {
    entries: Entry[]
    timestamp: number
  } | null
  
  // Connection status
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
  
  // Entry actions
  addEntry: (positionOrEntry?: Position3D | Entry) => Entry
  updateEntry: (id: string, updates: Partial<Entry>) => void
  deleteEntry: (id: string) => void
  restoreDeletedEntry: (deletedEntry: DeletedEntry) => void
  clearDeletedEntries: () => void
  moveEntry: (id: string, position: Position3D) => void
  selectEntry: (id: string | null) => void
  hoverEntry: (id: string | null) => void
  setRootEntry: (id: string) => void
  
  // Connection actions
  addConnection: (sourceIdOrConnection: string | Connection, targetId?: string) => Connection | null
  removeConnection: (sourceId: string, targetId: string) => void
  deleteConnection: (id: string) => void
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
  
  // Editor actions
  openEditor: (entryId: string) => void
  closeEditor: () => void
  
  // Movement actions
  startMovement: (entryId: string, position: Position3D, mode: MovementMode) => void
  updateMovementPosition: (position: Position3D) => void
  confirmMovement: () => void
  cancelMovement: () => void
  
  // Overlay actions
  showOverlay: (type: string, data?: OverlayData, autoDismiss?: boolean, dismissTimeout?: number) => void
  hideOverlay: (type: string) => void
  clearAllOverlays: () => void
  updateOverlayData: (type: string, data: OverlayData) => void
  isOverlayVisible: (type: string) => boolean
  
  // Connection status actions
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void
  
  // Help overlay actions
  toggleHelpOverlay: () => void
  setHelpOverlayCollapsed: (collapsed: boolean) => void
  rearrangeMindMap: (onComplete?: () => void) => void
  undoRearrangement: () => boolean
  startRearrangement: (targetPositions: Map<string, Position3D>) => void
  updateRearrangementProgress: (progress: number) => void
  clearRearrangement: () => void
  setInputFocused: (isFocused: boolean) => void
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
    currentMindMapId: null,
    name: null,
    rootEntryId: null,
    connectionFeedback: null,
    connectionHistory: [],
    connectionHistoryIndex: -1,
    deletedEntries: [],
    isEditorOpen: false,
    editingEntryId: null,
    movingEntryId: null,
    movementStartPosition: null,
    movementGhostPosition: null,
    movementMode: null,
    isCameraLocked: false,
    overlays: {},
    isHelpOverlayCollapsed: false,
    isInputFocused: false,
    rearrangementTargetPositions: null,
    rearrangementProgress: 0,
    previousRearrangementState: null,
    connectionStatus: 'disconnected' as const,
    
    // Entry actions
    addEntry: (positionOrEntry?: Position3D | Entry) => {
      // Handle overloaded parameters
      if (positionOrEntry && 'id' in positionOrEntry) {
        // Called with Entry object (from real-time sync)
        const entry = positionOrEntry
        
        // Check if entry already exists
        const existing = get().entries.find(e => e.id === entry.id)
        if (existing) return existing
        
        set((state) => {
          state.entries.push(entry)
        })
        
        return entry
      } else {
        // Called with position
        const position = positionOrEntry as Position3D | undefined
        
        const newEntry: Entry = {
          id: uuidv4(),
          position: position || getRandomPosition(),
          summary: 'New Entry',
          content: '',
          color: DEFAULT_ENTRY_COLOR,
          createdAt: new Date(),
          updatedAt: new Date(),
          isRoot: get().entries.length === 0
        }
        
        set((state) => {
          state.entries.push(newEntry)
          // Auto-select the newly created entry
          state.selectedEntryId = newEntry.id
          if (newEntry.isRoot) {
            state.rootEntryId = newEntry.id
          }
        })
        
        return newEntry
      }
    },
    
    updateEntry: (id: string, updates: Partial<Entry>) => {
      set((state) => {
        const entry = state.entries.find(e => e.id === id)
        if (entry) {
          Object.assign(entry, updates)
          entry.updatedAt = new Date()
          // Only clear undo state for position updates, not other property updates
          if (updates.position) {
            state.previousRearrangementState = null
          }
        }
      })
    },

    setRootEntry: (id: string) => {
      set((state) => {
        state.entries.forEach(entry => {
          entry.isRoot = entry.id === id
        })
        state.rootEntryId = id
      })
    },
    
    deleteEntry: (id: string) => {
      const entryToDelete = get().entries.find(e => e.id === id)
      if (!entryToDelete) return

      // Get all connections for this entry
      const connectionsToDelete = get().connections.filter(
        c => c.sourceId === id || c.targetId === id
      )

      set((state) => {
        // Store the deleted entry with its connections
        const deletedEntry = {
          entry: entryToDelete,
          connections: connectionsToDelete,
          deletedAt: new Date()
        }
        state.deletedEntries.push(deletedEntry)

        // Keep only the last 10 deleted entries
        if (state.deletedEntries.length > 10) {
          state.deletedEntries = state.deletedEntries.slice(-10)
        }

        // Set a timer to remove this entry after 30 seconds
        setTimeout(() => {
          set((state) => {
            state.deletedEntries = state.deletedEntries.filter(
              de => de.entry.id !== entryToDelete.id || de.deletedAt !== deletedEntry.deletedAt
            )
          })
        }, 30000)

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

    restoreDeletedEntry: (deletedEntry: DeletedEntry) => {
      set((state) => {
        // Restore the entry
        state.entries.push(deletedEntry.entry)

        // Restore connections (only if both entries still exist)
        deletedEntry.connections.forEach(connection => {
          const sourceExists = state.entries.some(e => e.id === connection.sourceId)
          const targetExists = state.entries.some(e => e.id === connection.targetId)
          if (sourceExists && targetExists) {
            state.connections.push(connection)
          }
        })

        // Remove from deleted entries
        state.deletedEntries = state.deletedEntries.filter(
          de => de.entry.id !== deletedEntry.entry.id
        )

        // Select the restored entry
        state.selectedEntryId = deletedEntry.entry.id
      })
    },

    clearDeletedEntries: () => {
      set((state) => {
        state.deletedEntries = []
      })
    },

    moveEntry: (id: string, position: Position3D) => {
      set((state) => {
        const entry = state.entries.find(e => e.id === id)
        if (entry) {
          entry.position = position
          entry.updatedAt = new Date()
          // Clear rearrangement undo after manual move
          state.previousRearrangementState = null
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
    addConnection: (sourceIdOrConnection: string | Connection, targetId?: string) => {
      // Handle overloaded parameters
      if (typeof sourceIdOrConnection === 'object') {
        // Called with Connection object (from real-time sync)
        const connection = sourceIdOrConnection
        
        // Check if connection already exists
        const existing = get().connections.find(c => c.id === connection.id)
        if (existing) return null
        
        set((state) => {
          state.connections.push(connection)
        })
        
        return connection
      } else {
        // Called with sourceId and targetId
        const sourceId = sourceIdOrConnection
        
        if (!targetId) return null
        
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
          
          // Show feedback using overlay system
          state.connectionFeedback = {
            message: 'Connection Added. Click to remove',
            lastOperation: operation
          }
          
          // Also show as overlay
          state.overlays['connectionFeedback'] = {
            visible: true,
            data: {
              message: 'Connection Added. Click to remove',
              lastOperation: operation
            },
            autoDismiss: true,
            dismissTimeout: 3000
          }
        })
        
        return newConnection
      }
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
        
        // Show feedback using overlay system
        state.connectionFeedback = {
          message: 'Connection Removed. Click to undo',
          lastOperation: operation
        }
        
        // Also show as overlay
        state.overlays['connectionFeedback'] = {
          visible: true,
          data: {
            message: 'Connection Removed. Click to undo',
            lastOperation: operation
          },
          autoDismiss: true,
          dismissTimeout: 3000
        }
      })
    },
    
    deleteConnection: (id: string) => {
      set((state) => {
        state.connections = state.connections.filter(c => c.id !== id)
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
        // Also hide the overlay
        if (state.overlays['connectionFeedback']) {
          state.overlays['connectionFeedback'].visible = false
        }
      })
    },
    
    // Utility actions
    clearMindMap: (name?: string) => {
      set((state) => {
        state.entries = []
        state.connections = []
        state.selectedEntryId = null
        state.hoveredEntryId = null
        state.mindMapId = null
        state.name = name || null
      })
    },
    
    loadMindMap: (data: MindMap) => {
      set((state) => {
        state.entries = data.entries
        state.connections = data.connections
        state.mindMapId = data.id
        state.currentMindMapId = data.id
        state.name = data.name
        state.rootEntryId = data.rootEntryId
        state.selectedEntryId = null
        state.hoveredEntryId = null
        // Load UI settings
        if (data.uiSettings?.isHelpOverlayCollapsed !== undefined) {
          state.isHelpOverlayCollapsed = data.uiSettings.isHelpOverlayCollapsed
        }
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
      const state = get();
      return {
        id: state.mindMapId || uuidv4(),
        name: state.name || 'Untitled Mind Map',
        entries: state.entries,
        connections: state.connections,
        rootEntryId: state.rootEntryId,
        createdAt: new Date(),
        updatedAt: new Date(),
        uiSettings: {
          isHelpOverlayCollapsed: state.isHelpOverlayCollapsed
        }
      }
    },
    
    // Editor actions
    openEditor: (entryId: string) => {
      set((state) => {
        state.isEditorOpen = true
        state.editingEntryId = entryId
      })
    },
    
    closeEditor: () => {
      set((state) => {
        state.isEditorOpen = false
        state.editingEntryId = null
      })
    },
    
    // Movement actions
    startMovement: (entryId: string, position: Position3D, mode: MovementMode) => {
      const entry = get().getEntryById(entryId)
      if (!entry) return
      
      set((state) => {
        state.movingEntryId = entryId
        state.movementStartPosition = [...entry.position] as Position3D
        state.movementGhostPosition = [...entry.position] as Position3D
        state.movementMode = mode
        state.isCameraLocked = true
      })
    },
    
    updateMovementPosition: (position: Position3D) => {
      set((state) => {
        if (state.movingEntryId) {
          state.movementGhostPosition = position
        }
      })
    },
    
    confirmMovement: () => {
      const movingId = get().movingEntryId
      const ghostPosition = get().movementGhostPosition
      
      if (movingId && ghostPosition) {
        get().moveEntry(movingId, ghostPosition)
      }
      
      set((state) => {
        state.movingEntryId = null
        state.movementStartPosition = null
        state.movementGhostPosition = null
        state.movementMode = null
        state.isCameraLocked = false
      })
    },
    
    cancelMovement: () => {
      const movingId = get().movingEntryId
      const startPosition = get().movementStartPosition
      
      if (movingId && startPosition) {
        get().moveEntry(movingId, startPosition)
      }
      
      set((state) => {
        state.movingEntryId = null
        state.movementStartPosition = null
        state.movementGhostPosition = null
        state.movementMode = null
        state.isCameraLocked = false
      })
    },
    
    // Overlay actions
    showOverlay: (type: string, data?: OverlayData, autoDismiss?: boolean, dismissTimeout?: number) => {
      set((state) => {
        state.overlays[type] = {
          visible: true,
          data,
          autoDismiss,
          dismissTimeout
        }
      })
      
      // Handle auto-dismiss
      if (autoDismiss && dismissTimeout) {
        setTimeout(() => {
          get().hideOverlay(type)
        }, dismissTimeout)
      }
    },
    
    hideOverlay: (type: string) => {
      set((state) => {
        if (state.overlays[type]) {
          state.overlays[type].visible = false
        }
      })
    },
    
    clearAllOverlays: () => {
      set((state) => {
        Object.keys(state.overlays).forEach(type => {
          if (state.overlays[type]) {
            state.overlays[type].visible = false
          }
        })
      })
    },
    
    updateOverlayData: (type: string, data: OverlayData) => {
      set((state) => {
        if (state.overlays[type]) {
          state.overlays[type].data = data
        }
      })
    },
    
    isOverlayVisible: (type: string) => {
      const overlay = get().overlays[type]
      return overlay?.visible || false
    },
    
    // Connection status actions
    setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => {
      set((state) => {
        state.connectionStatus = status
      })
    },
    
    // Help overlay actions
    toggleHelpOverlay: () => {
      set((state) => {
        state.isHelpOverlayCollapsed = !state.isHelpOverlayCollapsed
      })
    },
    
    setHelpOverlayCollapsed: (collapsed: boolean) => {
      set((state) => {
        state.isHelpOverlayCollapsed = collapsed
      })
    },

    rearrangeMindMap: (onComplete?: () => void) => {
      const state = get()
      const rootEntry = state.rootEntryId ? state.getEntryById(state.rootEntryId) : null

      if (!rootEntry) {
        console.warn("No root entry found for re-arrangement.")
        onComplete?.()
        return
      }

      // Store the current state before rearrangement for undo
      set((state) => {
        state.previousRearrangementState = {
          entries: JSON.parse(JSON.stringify(state.entries)), // Deep copy
          timestamp: Date.now()
        }
      })

      // Note: startTime tracking was removed since duration is now handled in Scene3D
      
      // Try to use Web Worker first, fall back to main thread if not available
      const worker = initRearrangementWorker()
      
      worker.rearrangeWithWorker(
        rootEntry,
        state.entries,
        state.connections,
        // Progress callback
        (progress) => {
          get().updateRearrangementProgress(progress)
        },
        // Complete callback
        (result) => {
          // Convert positions back to Map
          const newPositions = new Map<string, Position3D>()
          Object.entries(result.newPositions).forEach(([id, pos]) => {
            newPositions.set(id, pos as Position3D)
          })
          
          set((state) => {
            state.entries = result.updatedEntries
          })
          
          get().startRearrangement(newPositions)
          
          if (onComplete) {
            onComplete()
          }
        },
        // Error callback - fallback to main thread
        (error) => {
          console.warn('Web Worker failed, falling back to main thread:', error)
          
          // Fallback to main thread computation
          setTimeout(() => {
            const { newPositions, updatedEntries } = rearrangeMindMap(rootEntry, state.entries, state.connections, (progress) => {
              get().updateRearrangementProgress(progress)
            })
            
            set((state) => {
              state.entries = updatedEntries
            })
            get().startRearrangement(newPositions)
            
            if (onComplete) {
              onComplete()
            }
          }, 50)
        }
      )
    },

    startRearrangement: (targetPositions: Map<string, Position3D>) => {
      set((state) => {
        state.rearrangementTargetPositions = targetPositions
        state.rearrangementProgress = 0
      })
    },

    updateRearrangementProgress: (progress: number) => {
      set((state) => {
        state.rearrangementProgress = progress
      })
    },

    undoRearrangement: () => {
      const state = get()
      
      if (!state.previousRearrangementState) {
        return false // No undo available
      }
      
      // Restore the previous state
      set((currentState) => {
        currentState.entries = state.previousRearrangementState!.entries
        currentState.previousRearrangementState = null // Clear after use
      })
      
      return true
    },

    clearRearrangement: () => {
      set((state) => {
        state.rearrangementTargetPositions = null
        state.rearrangementProgress = 0
      })
    },
    setInputFocused: (isFocused: boolean) => {
      set((state) => {
        state.isInputFocused = isFocused
      })
    }
  }))
)

// Initialize with sample data (only for demo/development)
export const initializeWithSampleData = () => {
  const store = useMindMapStore.getState()
  
  // Clear existing data
  store.clearMindMap()
  
  // Set a demo mind map ID
  store.loadMindMap({
    id: 'demo-mindmap',
    name: 'Demo Mind Map',
    entries: [],
    connections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    uiSettings: {
      isHelpOverlayCollapsed: false
    }
  })
  
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

// Don't auto-initialize - let the app decide when to load demo data
