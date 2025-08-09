import { StorageAdapter, StorageMode, StorageStatus } from './types'
import { SupabaseAdapter } from './supabaseAdapter'
import { LocalStorageAdapter } from './localStorageAdapter'
import { SessionStorageAdapter } from './sessionStorageAdapter'

class StorageService {
  private adapter: StorageAdapter | null = null
  private mode: StorageMode = 'session'
  private status: StorageStatus = {
    mode: 'session',
    isAvailable: false,
    requiresAuth: false
  }
  
  async initialize(): Promise<StorageStatus> {
    // Try Supabase first
    const supabaseAdapter = new SupabaseAdapter()
    if (await supabaseAdapter.isAvailable()) {
      this.adapter = supabaseAdapter
      this.mode = 'supabase'
      this.status = {
        mode: 'supabase',
        isAvailable: true,
        message: 'Connected to cloud storage',
        requiresAuth: true
      }
      return this.status
    }
    
    // Try localStorage next
    const localStorageAdapter = new LocalStorageAdapter()
    if (await localStorageAdapter.isAvailable()) {
      this.adapter = localStorageAdapter
      this.mode = 'localStorage'
      this.status = {
        mode: 'localStorage',
        isAvailable: true,
        message: 'Using local browser storage',
        requiresAuth: false
      }
      return this.status
    }
    
    // Fall back to session storage
    const sessionAdapter = new SessionStorageAdapter()
    this.adapter = sessionAdapter
    this.mode = 'session'
    this.status = {
      mode: 'session',
      isAvailable: true,
      message: 'Using session-only storage. Your work will be lost when you close the browser.',
      requiresAuth: false
    }
    return this.status
  }
  
  getAdapter(): StorageAdapter {
    if (!this.adapter) {
      throw new Error('Storage service not initialized')
    }
    return this.adapter
  }
  
  getStatus(): StorageStatus {
    return this.status
  }
  
  getMode(): StorageMode {
    return this.mode
  }
  
  isCloudStorage(): boolean {
    return this.mode === 'supabase'
  }
  
  isPersistentStorage(): boolean {
    return this.mode === 'supabase' || this.mode === 'localStorage'
  }
  
  requiresAuth(): boolean {
    return this.status.requiresAuth
  }
}

// Export singleton instance
export const storageService = new StorageService()