'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useMindMapStore } from '@/lib/store'
import type { Position3D } from '@/types/mindmap'

interface PerformanceTestProps {
  show?: boolean
}

export function PerformanceTest({ show = false }: PerformanceTestProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [testResults, setTestResults] = useState<string>('')
  const { entries, clearAll, addEntry, addConnection } = useMindMapStore()
  
  const generateTestData = useCallback(async (count: number) => {
    setIsGenerating(true)
    const startTime = performance.now()
    
    // Clear existing data
    clearAll()
    
    // Generate entries in a grid pattern
    const gridSize = Math.ceil(Math.sqrt(count))
    const spacing = 3
    const createdEntries: string[] = []
    
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / gridSize)
      const col = i % gridSize
      
      const position: Position3D = [
        (col - gridSize / 2) * spacing,
        0,
        (row - gridSize / 2) * spacing
      ]
      
      const entry = addEntry(position)
      useMindMapStore.getState().updateEntry(entry.id, {
        summary: `Test Entry ${i + 1}`,
        content: `This is test entry number ${i + 1} created for performance testing.`
      })
      createdEntries.push(entry.id)
      
      // Add some connections (connect to previous 1-3 entries randomly)
      if (i > 0) {
        const numConnections = Math.floor(Math.random() * 3) + 1
        for (let j = 0; j < numConnections && j < i; j++) {
          const targetIndex = Math.max(0, i - 1 - j)
          try {
            addConnection(entry.id, createdEntries[targetIndex])
          } catch {
            // Ignore duplicate connections
          }
        }
      }
    }
    
    const endTime = performance.now()
    const timeTaken = Math.round(endTime - startTime)
    
    setTestResults(`Generated ${count} entries with connections in ${timeTaken}ms`)
    setIsGenerating(false)
  }, [clearAll, addEntry, addConnection])
  
  const runPerformanceTest = useCallback(async () => {
    setTestResults('Running performance test...')
    
    // Test with different entry counts
    const testCounts = [10, 25, 50, 75, 100]
    const results: string[] = []
    
    for (const count of testCounts) {
      await generateTestData(count)
      
      // Wait a bit for scene to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Record current entry and connection count
      const currentState = useMindMapStore.getState()
      results.push(`${count} entries: ${currentState.connections.length} connections`)
    }
    
    setTestResults(results.join('\\n'))
  }, [generateTestData])
  
  if (!show) return null
  
  return (
    <div className="absolute bottom-24 left-4 bg-black/70 text-white p-4 rounded-md max-w-sm">
      <h3 className="text-sm font-bold mb-2">Performance Test</h3>
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => generateTestData(10)}
            disabled={isGenerating}
          >
            10 Entries
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => generateTestData(25)}
            disabled={isGenerating}
          >
            25 Entries
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => generateTestData(50)}
            disabled={isGenerating}
          >
            50 Entries
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => generateTestData(75)}
            disabled={isGenerating}
          >
            75 Entries
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => generateTestData(100)}
            disabled={isGenerating}
          >
            100 Entries
          </Button>
        </div>
        <Button
          size="sm"
          variant="default"
          onClick={runPerformanceTest}
          disabled={isGenerating}
          className="w-full"
        >
          Run Full Test
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => useMindMapStore.getState().clearAll()}
          disabled={isGenerating}
          className="w-full"
        >
          Clear All
        </Button>
      </div>
      {testResults && (
        <div className="mt-2 text-xs text-gray-300 whitespace-pre-line">
          {testResults}
        </div>
      )}
      <div className="mt-2 text-xs text-gray-400">
        Current: {entries.length} entries, {useMindMapStore.getState().connections.length} connections
      </div>
    </div>
  )
}