import { mindMapService } from './supabase'
import { useMindMapStore } from './store'

// Auto-save functionality
let autoSaveTimer: NodeJS.Timeout | null = null
let lastSavedState: string | null = null

export const mindMapSaveService = {
  // Save the current mind map
  async save(): Promise<{ success: boolean; error?: string }> {
    const store = useMindMapStore.getState()
    const mindMapData = store.getMindMapData()
    
    return mindMapService.saveMindMap(mindMapData)
  },

  // Load a mind map by ID
  async load(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const mindMap = await mindMapService.loadMindMap(id)
      
      if (!mindMap) {
        return { success: false, error: 'Mind map not found' }
      }
      
      const store = useMindMapStore.getState()
      store.loadMindMap(mindMap)
      
      return { success: true }
    } catch (error) {
      console.error('Error loading mind map:', error)
      return { success: false, error: String(error) }
    }
  },

  // Create a new mind map
  async createNew(name: string): Promise<{ id: string | null; error?: string }> {
    const result = await mindMapService.createMindMap(name)
    
    if (result) {
      // Clear current state and set new ID
      const store = useMindMapStore.getState()
      store.clearMindMap()
      store.loadMindMap({
        id: result.id,
        name,
        entries: [],
        connections: [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      return { id: result.id }
    }
    
    return { id: null, error: 'Failed to create mind map' }
  },

  // List all mind maps
  async list() {
    return mindMapService.listMindMaps()
  },

  // Delete a mind map
  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const success = await mindMapService.deleteMindMap(id)
    
    if (!success) {
      return { success: false, error: 'Failed to delete mind map' }
    }
    
    // If we deleted the current mind map, clear the state
    const store = useMindMapStore.getState()
    if (store.mindMapId === id) {
      store.clearMindMap()
    }
    
    return { success: true }
  },

  // Start auto-save
  startAutoSave(intervalMs: number = 30000) {
    this.stopAutoSave()
    
    autoSaveTimer = setInterval(async () => {
      const store = useMindMapStore.getState()
      
      // Only save if there's a mind map ID and if state has changed
      if (store.mindMapId) {
        const currentState = JSON.stringify({
          entries: store.entries,
          connections: store.connections
        })
        
        if (currentState !== lastSavedState) {
          const result = await this.save()
          if (result.success) {
            lastSavedState = currentState
            console.log('Auto-saved at', new Date().toLocaleTimeString())
          } else {
            console.error('Auto-save failed:', result.error)
          }
        }
      }
    }, intervalMs)
  },

  // Stop auto-save
  stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
  },

  // Check if auto-save is running
  isAutoSaveRunning() {
    return autoSaveTimer !== null
  }
}