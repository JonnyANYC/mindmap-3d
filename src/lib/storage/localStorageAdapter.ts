import { MindMap } from '@/types/mindmap'
import { DbMindMap } from '@/lib/supabase'
import { StorageAdapter } from './types'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_PREFIX = 'mindmap_'
const INDEX_KEY = 'mindmap_index'

export class LocalStorageAdapter implements StorageAdapter {
  async isAvailable(): Promise<boolean> {
    // Check if we're in a browser environment first
    if (typeof window === 'undefined') {
      return false
    }
    
    try {
      const testKey = '__localStorage_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }
  
  private getIndex(): string[] {
    try {
      const indexData = localStorage.getItem(INDEX_KEY)
      return indexData ? JSON.parse(indexData) : []
    } catch {
      return []
    }
  }
  
  private updateIndex(id: string, remove = false) {
    const index = this.getIndex()
    const updatedIndex = remove 
      ? index.filter(i => i !== id)
      : [...new Set([...index, id])]
    
    localStorage.setItem(INDEX_KEY, JSON.stringify(updatedIndex))
  }
  
  private serializeMindMap(mindMap: MindMap): string {
    return JSON.stringify({
      ...mindMap,
      rootEntryId: mindMap.rootEntryId,
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
    })
  }
  
  private deserializeMindMap(data: string): MindMap {
    const parsed = JSON.parse(data)
    return {
      ...parsed,
      rootEntryId: parsed.rootEntryId,
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
  
  async saveMindMap(mindMap: MindMap): Promise<{ success: boolean; error?: string }> {
    try {
      const key = STORAGE_PREFIX + mindMap.id
      localStorage.setItem(key, this.serializeMindMap(mindMap))
      this.updateIndex(mindMap.id)
      return { success: true }
    } catch (error) {
      console.error('Error saving to localStorage:', error)
      
      // Check if it's a quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        return { success: false, error: 'Local storage is full. Please delete some mind maps.' }
      }
      
      return { success: false, error: String(error) }
    }
  }
  
  async loadMindMap(id: string): Promise<MindMap | null> {
    try {
      const key = STORAGE_PREFIX + id
      const data = localStorage.getItem(key)
      
      if (!data) return null
      
      return this.deserializeMindMap(data)
    } catch (error) {
      console.error('Error loading from localStorage:', error)
      return null
    }
  }
  
  async listMindMaps(): Promise<DbMindMap[]> {
    try {
      const index = this.getIndex()
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
      console.error('Error listing from localStorage:', error)
      return []
    }
  }
  
  async deleteMindMap(id: string): Promise<boolean> {
    try {
      const key = STORAGE_PREFIX + id
      localStorage.removeItem(key)
      this.updateIndex(id, true)
      return true
    } catch (error) {
      console.error('Error deleting from localStorage:', error)
      return false
    }
  }
  
  async createMindMap(name: string): Promise<{ id: string } | null> {
    try {
      const id = `local-${uuidv4()}`
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
      console.error('Error creating in localStorage:', error)
      return null
    }
  }
  
  // No real-time sync for localStorage
  subscribeToChanges(): null {
    return null
  }
  
  // No authentication for localStorage
  async getCurrentUser(): Promise<null> {
    return null
  }
}