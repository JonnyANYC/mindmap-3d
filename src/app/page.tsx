'use client'

import Scene3D from '@/components/Scene3D'
import { UserMenu } from '@/components/Auth/UserMenu'
import { MindMapSelector } from '@/components/MindMapSelector'
import { SaveIndicator } from '@/components/SaveIndicator'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useMindMapStore } from '@/lib/store'

export default function Home() {
  const mindMapId = useMindMapStore(state => state.mindMapId)
  const entries = useMindMapStore(state => state.entries)
  
  // Enable real-time sync when a mind map is loaded
  useRealtimeSync(mindMapId)
  
  return (
    <div className="relative w-full h-screen">
      {/* Top bar with controls */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              3D Mind Map
            </h1>
            <MindMapSelector />
          </div>
          
          <div className="flex items-center gap-4">
            <SaveIndicator />
            <UserMenu />
          </div>
        </div>
      </div>
      
      {/* 3D Scene */}
      <Scene3D />
      
      {/* Welcome message when no mind map is loaded */}
      {!mindMapId && entries.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center p-8 bg-white/90 dark:bg-neutral-900/90 rounded-lg shadow-lg pointer-events-auto">
            <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-neutral-100">
              Welcome to 3D Mind Map
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md">
              You&apos;re in offline mode. Click &ldquo;Add Entry&rdquo; below to start creating your mind map.
            </p>
            <div className="text-sm text-neutral-500 dark:text-neutral-500">
              Your work will be stored locally in your browser session.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}