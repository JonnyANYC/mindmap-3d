'use client'

import { useFrame } from '@react-three/fiber'
import { useRef, useState, useEffect } from 'react'

interface PerformanceMonitorProps {
  onFPSUpdate?: (fps: number) => void
}

export function PerformanceMonitor({ onFPSUpdate }: PerformanceMonitorProps) {
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  
  useFrame(() => {
    frameCount.current++
    
    const currentTime = performance.now()
    const deltaTime = currentTime - lastTime.current
    
    // Update FPS every 500ms
    if (deltaTime >= 500) {
      const currentFps = Math.round((frameCount.current * 1000) / deltaTime)
      
      if (onFPSUpdate) {
        onFPSUpdate(currentFps)
      }
      
      frameCount.current = 0
      lastTime.current = currentTime
    }
  })
  
  return null
}

interface FPSDisplayProps {
  show?: boolean
}

export function FPSDisplay({ show = false }: FPSDisplayProps) {
  const [fps, setFps] = useState(60)
  const [avgFps, setAvgFps] = useState(60)
  const fpsHistory = useRef<number[]>([])
  
  useEffect(() => {
    if (!show) return
    
    // Poll for FPS updates from the global value
    const interval = setInterval(() => {
      const currentFps = (window as unknown as { __currentFPS?: number }).__currentFPS || 60
      setFps(currentFps)
    }, 100)
    
    return () => clearInterval(interval)
  }, [show])
  
  useEffect(() => {
    if (!show) return
    
    // Calculate average FPS over last 10 readings
    fpsHistory.current.push(fps)
    if (fpsHistory.current.length > 10) {
      fpsHistory.current.shift()
    }
    
    const avg = Math.round(
      fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
    )
    setAvgFps(avg)
  }, [fps, show])
  
  if (!show) return null
  
  const fpsColor = fps >= 55 ? 'text-green-500' : fps >= 30 ? 'text-yellow-500' : 'text-red-500'
  
  return (
    <div className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded-md text-sm font-mono z-10">
      <div className={fpsColor}>FPS: {fps}</div>
      <div className="text-gray-400">Avg: {avgFps}</div>
    </div>
  )
}