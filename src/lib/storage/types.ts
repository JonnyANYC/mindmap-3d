import { MindMap } from '@/types/mindmap'
import { DbMindMap } from '@/lib/supabase'

export type StorageMode = 'supabase' | 'localStorage' | 'session'

export interface StorageAdapter {
  // Check if the adapter is available
  isAvailable(): Promise<boolean>
  
  // Mind map operations
  saveMindMap(mindMap: MindMap): Promise<{ success: boolean; error?: string }>
  loadMindMap(id: string): Promise<MindMap | null>
  listMindMaps(): Promise<DbMindMap[]>
  deleteMindMap(id: string): Promise<boolean>
  createMindMap(name: string): Promise<{ id: string } | null>
  
  // Real-time subscription (optional)
  subscribeToChanges?(
    mindMapId: string, 
    onUpdate: (payload: unknown) => void
  ): unknown
  
  // User authentication (optional)
  getCurrentUser?(): Promise<unknown>
}

export interface StorageStatus {
  mode: StorageMode
  isAvailable: boolean
  message?: string
  requiresAuth: boolean
}