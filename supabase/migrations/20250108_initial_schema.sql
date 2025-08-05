-- Initial schema for 3D Mind Map application
-- This migration creates all necessary tables with proper relationships

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS mindmaps CASCADE;

-- Create mindmaps table
CREATE TABLE mindmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete support
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create entries table
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mindmap_id UUID NOT NULL REFERENCES mindmaps(id) ON DELETE CASCADE,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  position_z FLOAT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT DEFAULT '',
  color TEXT DEFAULT '#4CAF50',
  is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete support
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create connections table
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mindmap_id UUID NOT NULL REFERENCES mindmaps(id) ON DELETE CASCADE,
  from_entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  to_entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete support
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Ensure unique connections (no duplicates)
  CONSTRAINT unique_connection UNIQUE(mindmap_id, from_entry_id, to_entry_id)
);

-- Create indexes for better performance
CREATE INDEX idx_mindmaps_user_id ON mindmaps(user_id);
CREATE INDEX idx_mindmaps_is_deleted ON mindmaps(is_deleted);
CREATE INDEX idx_entries_mindmap_id ON entries(mindmap_id);
CREATE INDEX idx_entries_is_deleted ON entries(is_deleted);
CREATE INDEX idx_connections_mindmap_id ON connections(mindmap_id);
CREATE INDEX idx_connections_from_entry ON connections(from_entry_id);
CREATE INDEX idx_connections_to_entry ON connections(to_entry_id);
CREATE INDEX idx_connections_is_deleted ON connections(is_deleted);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at automatically
CREATE TRIGGER update_mindmaps_updated_at BEFORE UPDATE ON mindmaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entries_updated_at BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mindmaps table
-- Allow users to see and manage their own mindmaps
CREATE POLICY "Users can view their own mindmaps"
  ON mindmaps FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own mindmaps"
  ON mindmaps FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own mindmaps"
  ON mindmaps FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own mindmaps"
  ON mindmaps FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policies for entries table
-- Allow users to manage entries in their mindmaps
CREATE POLICY "Users can view entries in their mindmaps"
  ON entries FOR SELECT
  USING (
    mindmap_id IN (
      SELECT id FROM mindmaps 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Users can insert entries in their mindmaps"
  ON entries FOR INSERT
  WITH CHECK (
    mindmap_id IN (
      SELECT id FROM mindmaps 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Users can update entries in their mindmaps"
  ON entries FOR UPDATE
  USING (
    mindmap_id IN (
      SELECT id FROM mindmaps 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  )
  WITH CHECK (
    mindmap_id IN (
      SELECT id FROM mindmaps 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Users can delete entries in their mindmaps"
  ON entries FOR DELETE
  USING (
    mindmap_id IN (
      SELECT id FROM mindmaps 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

-- RLS Policies for connections table
-- Allow users to manage connections in their mindmaps
CREATE POLICY "Users can view connections in their mindmaps"
  ON connections FOR SELECT
  USING (
    mindmap_id IN (
      SELECT id FROM mindmaps 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Users can insert connections in their mindmaps"
  ON connections FOR INSERT
  WITH CHECK (
    mindmap_id IN (
      SELECT id FROM mindmaps 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Users can update connections in their mindmaps"
  ON connections FOR UPDATE
  USING (
    mindmap_id IN (
      SELECT id FROM mindmaps 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  )
  WITH CHECK (
    mindmap_id IN (
      SELECT id FROM mindmaps 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Users can delete connections in their mindmaps"
  ON connections FOR DELETE
  USING (
    mindmap_id IN (
      SELECT id FROM mindmaps 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

-- Create function to get mind map with all related data
CREATE OR REPLACE FUNCTION get_mindmap_with_data(mindmap_id UUID)
RETURNS TABLE (
  mindmap JSON,
  entries JSON,
  connections JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    row_to_json(m.*) as mindmap,
    COALESCE(json_agg(DISTINCT e.*) FILTER (WHERE e.id IS NOT NULL), '[]'::json) as entries,
    COALESCE(json_agg(DISTINCT c.*) FILTER (WHERE c.id IS NOT NULL), '[]'::json) as connections
  FROM mindmaps m
  LEFT JOIN entries e ON m.id = e.mindmap_id AND e.is_deleted = FALSE
  LEFT JOIN connections c ON m.id = c.mindmap_id AND c.is_deleted = FALSE
  WHERE m.id = mindmap_id AND m.is_deleted = FALSE
  GROUP BY m.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;