import { createClient } from '@supabase/supabase-js'
import type { MindMap } from '@/types/mindmap'

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create client only if credentials are provided
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Database types
export interface DbMindMap {
  id: string
  user_id?: string
  name: string
  created_at: string
  updated_at: string
}

export interface DbEntry {
  id: string
  mindmap_id: string
  position: [number, number, number]
  summary: string
  content: string
  color?: string
  created_at: string
  updated_at: string
}

export interface DbConnection {
  id: string
  mindmap_id: string
  source_id: string
  target_id: string
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
      // Save or update mind map
      const { error: mapError } = await supabase
        .from('mindmaps')
        .upsert({
          id: mindMap.id,
          name: mindMap.name,
          updated_at: new Date().toISOString()
        })

      if (mapError) throw mapError

      // Delete existing entries and connections for this mindmap
      await supabase.from('entries').delete().eq('mindmap_id', mindMap.id)
      await supabase.from('connections').delete().eq('mindmap_id', mindMap.id)

      // Insert entries
      if (mindMap.entries.length > 0) {
        const dbEntries: DbEntry[] = mindMap.entries.map(entry => ({
          id: entry.id,
          mindmap_id: mindMap.id,
          position: entry.position,
          summary: entry.summary,
          content: entry.content,
          color: entry.color,
          created_at: entry.createdAt.toISOString(),
          updated_at: entry.updatedAt.toISOString()
        }))

        const { error: entriesError } = await supabase
          .from('entries')
          .insert(dbEntries)

        if (entriesError) throw entriesError
      }

      // Insert connections
      if (mindMap.connections.length > 0) {
        const dbConnections: DbConnection[] = mindMap.connections.map(conn => ({
          id: conn.id,
          mindmap_id: mindMap.id,
          source_id: conn.sourceId,
          target_id: conn.targetId,
          created_at: conn.createdAt.toISOString()
        }))

        const { error: connectionsError } = await supabase
          .from('connections')
          .insert(dbConnections)

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
        .single()

      if (mapError) throw mapError
      if (!mapData) return null

      // Load entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('*')
        .eq('mindmap_id', id)

      if (entriesError) throw entriesError

      // Load connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('*')
        .eq('mindmap_id', id)

      if (connectionsError) throw connectionsError

      // Convert to MindMap type
      const mindMap: MindMap = {
        id: mapData.id,
        name: mapData.name,
        entries: (entriesData || []).map(e => ({
          id: e.id,
          position: e.position,
          summary: e.summary,
          content: e.content,
          color: e.color,
          createdAt: new Date(e.created_at),
          updatedAt: new Date(e.updated_at)
        })),
        connections: (connectionsData || []).map(c => ({
          id: c.id,
          sourceId: c.source_id,
          targetId: c.target_id,
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
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error listing mind maps:', error)
      return []
    }
  },

  // Delete a mind map
  async deleteMindMap(id: string): Promise<boolean> {
    if (!supabase) {
      console.log('Supabase not configured')
      return false
    }

    try {
      // Cascade delete will handle entries and connections
      const { error } = await supabase
        .from('mindmaps')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting mind map:', error)
      return false
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

// SQL schema for Supabase (run these in Supabase SQL editor)
export const SUPABASE_SCHEMA = `
-- Create mindmaps table
CREATE TABLE IF NOT EXISTS mindmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create entries table
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mindmap_id UUID REFERENCES mindmaps(id) ON DELETE CASCADE,
  position FLOAT[] NOT NULL,
  summary TEXT NOT NULL,
  content TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mindmap_id UUID REFERENCES mindmaps(id) ON DELETE CASCADE,
  source_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  target_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mindmap_id, source_id, target_id)
);

-- Add RLS policies (adjust based on your auth strategy)
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Example policies (modify based on your needs)
CREATE POLICY "Users can CRUD their own mindmaps" ON mindmaps
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can CRUD entries in their mindmaps" ON entries
  FOR ALL USING (
    mindmap_id IN (
      SELECT id FROM mindmaps WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Users can CRUD connections in their mindmaps" ON connections
  FOR ALL USING (
    mindmap_id IN (
      SELECT id FROM mindmaps WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );
`