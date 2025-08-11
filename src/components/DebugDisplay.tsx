'use client'

import { useEffect, useState } from 'react'
import { useMindMapStore } from '@/lib/store'

interface DebugDisplayProps {
  show?: boolean
}

export function DebugDisplay({ show = false }: DebugDisplayProps) {
  const entries = useMindMapStore((state) => state.entries)
  const connections = useMindMapStore((state) => state.connections)
  const [fps, setFps] = useState(60)
  
  useEffect(() => {
    if (!show) return
    
    // Poll for FPS updates from the global value
    const interval = setInterval(() => {
      const currentFps = (window as unknown as { __currentFPS?: number }).__currentFPS || 60
      setFps(currentFps)
    }, 100)
    
    return () => clearInterval(interval)
  }, [show])
  
  if (!show) return null
  
  const fpsColor = fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'
  
  return (
    <div className="absolute top-4 left-4 bg-black/80 text-white p-3 rounded-lg text-sm font-mono shadow-lg">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Entries:</span>
          <span className="font-bold">{entries.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Connections:</span>
          <span className="font-bold">{connections.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">FPS:</span>
          <span className={`font-bold ${fpsColor}`}>{fps}</span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
        Press Ctrl+Shift+D to toggle
      </div>
    </div>
  )
}