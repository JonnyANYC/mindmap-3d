# Supabase Setup Guide

## Overview
This application supports optional Supabase integration for data persistence. If Supabase is not configured, the app will work with local state only (data will be lost on page refresh).

## Setup Instructions

### 1. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key from the project settings

### 2. Configure Environment Variables
1. Copy `.env.local.example` to `.env.local`
2. Add your Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Create Database Schema
Run the following SQL in your Supabase SQL editor:

```sql
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

-- Add RLS policies
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own mindmaps
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
```

### 4. Restart Development Server
After adding environment variables, restart your development server:
```bash
npm run dev
```

## Features When Supabase is Configured
- Data persistence across sessions
- Real-time collaboration (future feature)
- Multi-device sync
- User authentication support

## Features Without Supabase
- Full functionality with local state
- Data stored in browser memory
- No persistence (data lost on refresh)
- Perfect for testing and development