import { MindMap } from '@/types/mindmap'
import { DbMindMap } from '@/lib/supabase'
import { StorageAdapter } from './types'
import { v4 as uuidv4 } from 'uuid'

// In-memory storage for when sessionStorage is also unavailable
const inMemoryStorage = new Map<string, MindMap>()
const inMemoryIndex = new Set<string>()

export class SessionStorageAdapter implements StorageAdapter {
  private useInMemory = false
  
  async isAvailable(): Promise<boolean> {
    // Always return true - we'll fall back to in-memory if needed
    return true
  }
  
  constructor() {
    // Check if sessionStorage is available (only in browser environment)
    if (typeof window === 'undefined') {
      this.useInMemory = true
      return
    }
    
    try {
      const testKey = '__sessionStorage_test__'
      sessionStorage.setItem(testKey, 'test')
      sessionStorage.removeItem(testKey)
      this.useInMemory = false
    } catch {
      this.useInMemory = true
      console.log('SessionStorage unavailable, using in-memory storage')
    }
  }
  
  async saveMindMap(mindMap: MindMap): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.useInMemory) {
        inMemoryStorage.set(mindMap.id, mindMap)
        inMemoryIndex.add(mindMap.id)
      } else {
        // Store in sessionStorage (similar to localStorage but session-only)
        const key = 'session_' + mindMap.id
        sessionStorage.setItem(key, JSON.stringify({
          ...mindMap,
          entries: mindMap.entries.map(e => ({
            ...e,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString()
          })),
          connections: mindMap.connections.map(c => ({
            ...c,
            createdAt: c.createdAt.toISOString()
          })),
          createdAt: mindMap.createdAt.toISOString(),
          updatedAt: mindMap.updatedAt.toISOString()
        }))
        
        // Update index
        const index = this.getSessionIndex()
        index.add(mindMap.id)
        sessionStorage.setItem('session_index', JSON.stringify([...index]))
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error saving to session storage:', error)
      return { success: false, error: String(error) }
    }
  }
  
  async loadMindMap(id: string): Promise<MindMap | null> {
    try {
      if (this.useInMemory) {
        return inMemoryStorage.get(id) || null
      } else {
        const key = 'session_' + id
        const data = sessionStorage.getItem(key)
        
        if (!data) return null
        
        const parsed = JSON.parse(data)
        return {
          ...parsed,
          entries: parsed.entries.map((e: { createdAt: string; updatedAt: string; [key: string]: unknown }) => ({
            ...e,
            createdAt: new Date(e.createdAt),
            updatedAt: new Date(e.updatedAt)
          })),
          connections: parsed.connections.map((c: { createdAt: string; [key: string]: unknown }) => ({
            ...c,
            createdAt: new Date(c.createdAt)
          })),
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt)
        }
      }
    } catch (error) {
      console.error('Error loading from session storage:', error)
      return null
    }
  }
  
  async listMindMaps(): Promise<DbMindMap[]> {
    try {
      const index = this.useInMemory ? [...inMemoryIndex] : [...this.getSessionIndex()]
      const mindMaps: DbMindMap[] = []
      
      for (const id of index) {
        const mindMap = await this.loadMindMap(id)
        if (mindMap) {
          mindMaps.push({
            id: mindMap.id,
            user_id: undefined,
            name: mindMap.name,
            description: '',
            is_deleted: false,
            created_at: mindMap.createdAt.toISOString(),
            updated_at: mindMap.updatedAt.toISOString()
          })
        }
      }
      
      // Sort by updated date, newest first
      return mindMaps.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
    } catch (error) {
      console.error('Error listing from session storage:', error)
      return []
    }
  }
  
  async deleteMindMap(id: string): Promise<boolean> {
    try {
      if (this.useInMemory) {
        inMemoryStorage.delete(id)
        inMemoryIndex.delete(id)
      } else {
        const key = 'session_' + id
        sessionStorage.removeItem(key)
        
        const index = this.getSessionIndex()
        index.delete(id)
        sessionStorage.setItem('session_index', JSON.stringify([...index]))
      }
      
      return true
    } catch (error) {
      console.error('Error deleting from session storage:', error)
      return false
    }
  }
  
  async createMindMap(name: string): Promise<{ id: string } | null> {
    try {
      const id = `session-${uuidv4()}`
      const mindMap: MindMap = {
        id,
        name,
        entries: [],
        connections: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const result = await this.saveMindMap(mindMap)
      
      if (result.success) {
        return { id }
      } else {
        return null
      }
    } catch (error) {
      console.error('Error creating in session storage:', error)
      return null
    }
  }
  
  private getSessionIndex(): Set<string> {
    try {
      const indexData = sessionStorage.getItem('session_index')
      return new Set(indexData ? JSON.parse(indexData) : [])
    } catch {
      return new Set()
    }
  }
  
  // Export functionality for session storage
  exportMindMap(mindMap: MindMap): string {
    const dataStr = JSON.stringify(mindMap, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    return dataUri
  }
  
  // No real-time sync for session storage
  subscribeToChanges(): null {
    return null
  }
  
  // No authentication for session storage
  async getCurrentUser(): Promise<null> {
    return null
  }
}