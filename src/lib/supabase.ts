import { createClient } from '@supabase/supabase-js'
import type { MindMap } from '@/types/mindmap'

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create client only if credentials are provided
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Database types matching our new schema
export interface DbMindMap {
  id: string
  user_id?: string
  title: string
  description?: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface DbEntry {
  id: string
  mindmap_id: string
  position_x: number
  position_y: number
  position_z: number
  summary: string
  content: string
  color: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface DbConnection {
  id: string
  mindmap_id: string
  from_entry_id: string
  to_entry_id: string
  is_deleted: boolean
  created_at: string
}

// CRUD Operations
export const mindMapService = {
  // Check if Supabase is configured
  isConfigured: () => Boolean(supabase),

  // Save or update a mind map
  async saveMindMap(mindMap: MindMap): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      console.log('Supabase not configured - data will not persist')
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Save or update mind map
      const { error: mapError } = await supabase
        .from('mindmaps')
        .upsert({
          id: mindMap.id,
          user_id: user?.id || null,
          title: mindMap.name,
          description: '',
          is_deleted: false,
          updated_at: new Date().toISOString()
        })

      if (mapError) throw mapError

      // Soft delete existing entries and connections for this mindmap
      await supabase.from('entries').update({ is_deleted: true }).eq('mindmap_id', mindMap.id)
      await supabase.from('connections').update({ is_deleted: true }).eq('mindmap_id', mindMap.id)

      // Insert entries
      if (mindMap.entries.length > 0) {
        const dbEntries: DbEntry[] = mindMap.entries.map(entry => ({
          id: entry.id,
          mindmap_id: mindMap.id,
          position_x: entry.position[0],
          position_y: entry.position[1],
          position_z: entry.position[2],
          summary: entry.summary,
          content: entry.content,
          color: entry.color || '#4CAF50',
          is_deleted: false,
          created_at: entry.createdAt.toISOString(),
          updated_at: entry.updatedAt.toISOString()
        }))

        const { error: entriesError } = await supabase
          .from('entries')
          .upsert(dbEntries)

        if (entriesError) throw entriesError
      }

      // Insert connections
      if (mindMap.connections.length > 0) {
        const dbConnections: DbConnection[] = mindMap.connections.map(conn => ({
          id: conn.id,
          mindmap_id: mindMap.id,
          from_entry_id: conn.sourceId,
          to_entry_id: conn.targetId,
          is_deleted: false,
          created_at: conn.createdAt.toISOString()
        }))

        const { error: connectionsError } = await supabase
          .from('connections')
          .upsert(dbConnections)

        if (connectionsError) throw connectionsError
      }

      return { success: true }
    } catch (error) {
      console.error('Error saving mind map:', error)
      return { success: false, error: String(error) }
    }
  },

  // Load a mind map by ID
  async loadMindMap(id: string): Promise<MindMap | null> {
    if (!supabase) {
      console.log('Supabase not configured')
      return null
    }

    try {
      // Load mind map
      const { data: mapData, error: mapError } = await supabase
        .from('mindmaps')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single()

      if (mapError) throw mapError
      if (!mapData) return null

      // Load entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('*')
        .eq('mindmap_id', id)
        .eq('is_deleted', false)

      if (entriesError) throw entriesError

      // Load connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('*')
        .eq('mindmap_id', id)
        .eq('is_deleted', false)

      if (connectionsError) throw connectionsError

      // Convert to MindMap type
      const mindMap: MindMap = {
        id: mapData.id,
        name: mapData.title,
        entries: (entriesData || []).map(e => ({
          id: e.id,
          position: [e.position_x, e.position_y, e.position_z] as [number, number, number],
          summary: e.summary,
          content: e.content,
          color: e.color,
          createdAt: new Date(e.created_at),
          updatedAt: new Date(e.updated_at)
        })),
        connections: (connectionsData || []).map(c => ({
          id: c.id,
          sourceId: c.from_entry_id,
          targetId: c.to_entry_id,
          createdAt: new Date(c.created_at)
        })),
        createdAt: new Date(mapData.created_at),
        updatedAt: new Date(mapData.updated_at)
      }

      return mindMap
    } catch (error) {
      console.error('Error loading mind map:', error)
      return null
    }
  },

  // List all mind maps for the current user
  async listMindMaps(): Promise<DbMindMap[]> {
    if (!supabase) {
      console.log('Supabase not configured')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('mindmaps')
        .select('*')
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error listing mind maps:', error)
      return []
    }
  },

  // Delete a mind map (soft delete)
  async deleteMindMap(id: string): Promise<boolean> {
    if (!supabase) {
      console.log('Supabase not configured')
      return false
    }

    try {
      // Soft delete - just mark as deleted
      const { error } = await supabase
        .from('mindmaps')
        .update({ is_deleted: true })
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting mind map:', error)
      return false
    }
  },

  // Create a new mind map
  async createMindMap(name: string): Promise<{ id: string } | null> {
    if (!supabase) {
      console.log('Supabase not configured')
      return null
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('mindmaps')
        .insert({
          user_id: user?.id || null,
          title: name,
          description: '',
          is_deleted: false
        })
        .select('id')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating mind map:', error)
      return null
    }
  },

  // Setup real-time subscription
  subscribeToChanges(
    mindMapId: string, 
    onUpdate: (payload: unknown) => void
  ) {
    if (!supabase) {
      console.log('Supabase not configured - real-time sync disabled')
      return null
    }

    const subscription = supabase
      .channel(`mindmap:${mindMapId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entries',
          filter: `mindmap_id=eq.${mindMapId}`
        },
        onUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `mindmap_id=eq.${mindMapId}`
        },
        onUpdate
      )
      .subscribe()

    return subscription
  }
}

// Authentication helpers
export const authService = {
  // Sign up with email and password
  async signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error signing up:', error)
      return { success: false, error: String(error) }
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error signing in:', error)
      return { success: false, error: String(error) }
    }
  },

  // Sign out
  async signOut(): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error signing out:', error)
      return { success: false, error: String(error) }
    }
  },

  // Reset password
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error resetting password:', error)
      return { success: false, error: String(error) }
    }
  },

  // Get current user
  async getCurrentUser() {
    if (!supabase) return null
    
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Subscribe to auth state changes
  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    if (!supabase) return null
    
    return supabase.auth.onAuthStateChange(callback)
  }
}

