import '@testing-library/jest-dom'
import { useMindMapStore } from '@/lib/store'
import { Entry, Connection } from '@/types/mindmap'
import { performance } from 'perf_hooks'

// Performance metrics collector
class PerformanceMetrics {
  private metrics: Map<string, number[]> = new Map()
  private startTimes: Map<string, number> = new Map()

  start(label: string) {
    this.startTimes.set(label, performance.now())
  }

  end(label: string) {
    const startTime = this.startTimes.get(label)
    if (startTime) {
      const duration = performance.now() - startTime
      const existing = this.metrics.get(label) || []
      this.metrics.set(label, [...existing, duration])
      this.startTimes.delete(label)
    }
  }

  getMetrics(label: string) {
    const values = this.metrics.get(label) || []
    if (values.length === 0) return null

    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)]

    return { avg, min, max, median, count: values.length }
  }

  getAllMetrics() {
    const results: Record<string, ReturnType<typeof this.getMetrics>> = {}
    for (const [label] of this.metrics) {
      results[label] = this.getMetrics(label)
    }
    return results
  }

  clear() {
    this.metrics.clear()
    this.startTimes.clear()
  }
}

// Helper to measure memory usage
interface PerformanceMemory {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory
}

const measureMemoryUsage = () => {
  const perf = performance as PerformanceWithMemory
  if (perf.memory) {
    return {
      usedJSHeapSize: perf.memory.usedJSHeapSize,
      totalJSHeapSize: perf.memory.totalJSHeapSize,
      jsHeapSizeLimit: perf.memory.jsHeapSizeLimit
    }
  }
  return null
}

// Helper to create many entries
const createManyEntries = (count: number): Entry[] => {
  const entries: Entry[] = []
  for (let i = 0; i < count; i++) {
    entries.push({
      id: `entry-${i}`,
      position: [
        Math.random() * 20 - 10,
        Math.random() * 20 - 10,
        Math.random() * 20 - 10
      ],
      summary: `Entry ${i}`,
      content: `<p>Content for entry ${i} with some text to make it realistic</p>`,
      color: '#4CAF50',
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }
  return entries
}

// Helper to create connections between entries
const createConnections = (entries: Entry[], connectionRatio: number = 0.3): Connection[] => {
  const connections: Connection[] = []
  const maxConnections = Math.floor(entries.length * connectionRatio)
  
  for (let i = 0; i < maxConnections; i++) {
    const sourceIdx = Math.floor(Math.random() * entries.length)
    const targetIdx = Math.floor(Math.random() * entries.length)
    
    if (sourceIdx !== targetIdx) {
      connections.push({
        id: `conn-${i}`,
        sourceId: entries[sourceIdx].id,
        targetId: entries[targetIdx].id,
        createdAt: new Date()
      })
    }
  }
  
  return connections
}

describe('Performance Tests', () => {
  const metrics = new PerformanceMetrics()

  beforeEach(() => {
    useMindMapStore.getState()
    useMindMapStore.setState(useMindMapStore.getInitialState(), true) // Explicitly reset store
    metrics.clear()
  })

  describe('Entry Operations Performance', () => {
    it('should handle 10 entries efficiently', () => {
      const store = useMindMapStore.getState()
      const entryCount = 10

      metrics.start('create-10-entries')
      for (let i = 0; i < entryCount; i++) {
        store.addEntry([i, i, i])
      }
      metrics.end('create-10-entries')
      console.log(`Entries after addEntry calls: ${store.entries.length}`)

      const result = metrics.getMetrics('create-10-entries')
      expect(result?.avg).toBeLessThan(50) // Should complete in under 50ms
      expect(useMindMapStore.getState().entries).toHaveLength(entryCount)
    })

    it('should handle 50 entries efficiently', () => {
      const store = useMindMapStore.getState()
      const entryCount = 50

      metrics.start('create-50-entries')
      for (let i = 0; i < entryCount; i++) {
        store.addEntry([i % 10, Math.floor(i / 10), i % 5])
      }
      metrics.end('create-50-entries')

      const result = metrics.getMetrics('create-50-entries')
      expect(result?.avg).toBeLessThan(200) // Should complete in under 200ms
      expect(useMindMapStore.getState().entries).toHaveLength(entryCount)
    })

    it('should handle 100 entries efficiently', () => {
      const store = useMindMapStore.getState()
      const entryCount = 100

      metrics.start('create-100-entries')
      for (let i = 0; i < entryCount; i++) {
        store.addEntry([
          (i % 10) * 2,
          Math.floor(i / 10) * 2,
          (i % 5) * 2
        ])
      }
      metrics.end('create-100-entries')

      const result = metrics.getMetrics('create-100-entries')
      expect(result?.avg).toBeLessThan(500) // Should complete in under 500ms
      expect(useMindMapStore.getState().entries).toHaveLength(entryCount)
    })

    it('should handle 200 entries', () => {
      const store = useMindMapStore.getState()
      const entryCount = 200

      metrics.start('create-200-entries')
      const entries = createManyEntries(entryCount)
      entries.forEach(entry => store.addEntry(entry))
      metrics.end('create-200-entries')

      const result = metrics.getMetrics('create-200-entries')
      console.log(`Creating ${entryCount} entries took: ${result?.avg}ms`)
      expect(useMindMapStore.getState().entries).toHaveLength(entryCount)
    })
  })

  describe('Connection Operations Performance', () => {
    it('should handle connections between 50 entries efficiently', () => {
      const store = useMindMapStore.getState()
      const entries = createManyEntries(50)
      entries.forEach(entry => store.addEntry(entry))

      const connections = createConnections(entries, 0.5) // 50% connection ratio

      metrics.start('create-connections-50')
      connections.forEach(conn => store.addConnection(conn))
      metrics.end('create-connections-50')

      const result = metrics.getMetrics('create-connections-50')
      expect(result?.avg).toBeLessThan(300)
    })

    it('should handle dense connections efficiently', () => {
      const store = useMindMapStore.getState()
      const entries = createManyEntries(30)
      entries.forEach(entry => store.addEntry(entry))

      // Create many connections (high density)
      metrics.start('create-dense-connections')
      let connectionCount = 0
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < Math.min(i + 5, entries.length); j++) {
          store.addConnection(entries[i].id, entries[j].id)
          connectionCount++
        }
      }
      metrics.end('create-dense-connections')

      const result = metrics.getMetrics('create-dense-connections')
      console.log(`Created ${connectionCount} connections in ${result?.avg}ms`)
    })
  })

  describe('Selection Performance', () => {
    it('should handle rapid selection changes', () => {
      const store = useMindMapStore.getState()
      const entries = createManyEntries(50)
      entries.forEach(entry => store.addEntry(entry))

      metrics.start('rapid-selection')
      for (let i = 0; i < 100; i++) {
        const randomEntry = entries[Math.floor(Math.random() * entries.length)]
        store.selectEntry(randomEntry.id)
      }
      metrics.end('rapid-selection')

      const result = metrics.getMetrics('rapid-selection')
      expect(result?.avg).toBeLessThan(50) // Should handle 100 selections in under 50ms
    })

    it('should handle hover state changes efficiently', () => {
      const store = useMindMapStore.getState()
      const entries = createManyEntries(50)
      entries.forEach(entry => store.addEntry(entry))

      metrics.start('rapid-hover')
      for (let i = 0; i < 200; i++) {
        const randomEntry = entries[Math.floor(Math.random() * entries.length)]
        store.hoverEntry(randomEntry.id)
      }
      store.hoverEntry(null)
      metrics.end('rapid-hover')

      const result = metrics.getMetrics('rapid-hover')
      expect(result?.avg).toBeLessThan(50)
    })
  })

  describe('Update Performance', () => {
    it('should handle bulk updates efficiently', () => {
      const store = useMindMapStore.getState()
      const entries = createManyEntries(50)
      entries.forEach(entry => store.addEntry(entry))

      metrics.start('bulk-updates')
      entries.forEach((entry, index) => {
        store.updateEntry(entry.id, {
          summary: `Updated Entry ${index}`,
          content: `<p>Updated content ${index}</p>`
        })
      })
      metrics.end('bulk-updates')

      const result = metrics.getMetrics('bulk-updates')
      expect(result?.avg).toBeLessThan(200)
    })

    it('should handle position updates efficiently', () => {
      const store = useMindMapStore.getState()
      const entries = createManyEntries(30)
      entries.forEach(entry => store.addEntry(entry))

      metrics.start('position-updates')
      for (let i = 0; i < 100; i++) {
        const entry = entries[i % entries.length]
        store.moveEntry(entry.id, [
          Math.random() * 20 - 10,
          Math.random() * 20 - 10,
          Math.random() * 20 - 10
        ])
      }
      metrics.end('position-updates')

      const result = metrics.getMetrics('position-updates')
      expect(result?.avg).toBeLessThan(150) // Allow up to 150ms for position updates
    })
  })

  describe('Delete Performance', () => {
    it('should handle cascading deletes efficiently', () => {
      const store = useMindMapStore.getState()
      const entries = createManyEntries(50)
      entries.forEach(entry => store.addEntry(entry))
      
      // Create connections
      const connections = createConnections(entries, 0.5)
      connections.forEach(conn => store.addConnection(conn))

      metrics.start('cascading-deletes')
      // Delete entries with connections
      for (let i = 0; i < 10; i++) {
        store.deleteEntry(entries[i].id)
      }
      metrics.end('cascading-deletes')

      const result = metrics.getMetrics('cascading-deletes')
      expect(result?.avg).toBeLessThan(100)
      expect(useMindMapStore.getState().entries).toHaveLength(40)
    })
  })

  describe('Memory Usage', () => {
    it('should not leak memory with many operations', () => {
      const store = useMindMapStore.getState()
      const initialMemory = measureMemoryUsage()

      // Perform many operations
      for (let cycle = 0; cycle < 5; cycle++) {
        // Add entries
        const entries = createManyEntries(20)
        entries.forEach(entry => store.addEntry(entry))

        // Add connections
        const connections = createConnections(entries, 0.3)
        connections.forEach(conn => store.addConnection(conn))

        // Update entries
        entries.forEach(entry => {
          store.updateEntry(entry.id, { summary: `Updated ${entry.id}` })
        })

        // Delete half of them
        entries.slice(0, 10).forEach(entry => {
          store.deleteEntry(entry.id)
        })
      }

      const finalMemory = measureMemoryUsage()
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
        console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`)
        
        // Memory increase should be reasonable (less than 50MB for this test)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
      }
    })
  })

  describe('Stress Tests', () => {
    it('should maintain performance with complex mind map', () => {
      const store = useMindMapStore.getState()
      
      // Create a complex mind map structure
      const centerEntry = store.addEntry([0, 0, 0])
      store.updateEntry(centerEntry.id, { summary: 'Central Topic' })

      // Create clusters around center
      const clusters = 5
      const entriesPerCluster = 10
      
      metrics.start('create-complex-structure')
      
      for (let c = 0; c < clusters; c++) {
        const angle = (c / clusters) * Math.PI * 2
        const clusterX = Math.cos(angle) * 5
        const clusterZ = Math.sin(angle) * 5
        
        const clusterCenter = store.addEntry([clusterX, 0, clusterZ])
        store.updateEntry(clusterCenter.id, { summary: `Cluster ${c}` })
        store.addConnection(centerEntry.id, clusterCenter.id)
        
        // Add entries to cluster
        for (let e = 0; e < entriesPerCluster; e++) {
          const entryAngle = (e / entriesPerCluster) * Math.PI * 2
          const x = clusterX + Math.cos(entryAngle) * 2
          const z = clusterZ + Math.sin(entryAngle) * 2
          
          const entry = store.addEntry([x, Math.random() * 2 - 1, z])
          store.updateEntry(entry.id, { summary: `Item ${c}-${e}` })
          store.addConnection(clusterCenter.id, entry.id)
        }
      }
      
      metrics.end('create-complex-structure')
      
      const result = metrics.getMetrics('create-complex-structure')
      console.log(`Complex structure creation: ${result?.avg}ms`)
      
      // Test operations on complex structure
      metrics.start('navigate-complex-structure')
      
      // Simulate user navigation
      for (let i = 0; i < 50; i++) {
        const entries = useMindMapStore.getState().entries
        if (entries.length === 0) break // Skip if no entries
        const randomEntry = entries[Math.floor(Math.random() * entries.length)]
        store.selectEntry(randomEntry.id)
        
        // Get connected entries
        const connected = store.getConnectedEntries(randomEntry.id)
        if (connected.length > 0) {
          store.hoverEntry(connected[0].id)
        }
      }
      
      metrics.end('navigate-complex-structure')
      
      const navResult = metrics.getMetrics('navigate-complex-structure')
      expect(navResult?.avg).toBeLessThan(100)
    })
  })

  describe('Performance Report', () => {
    it('should generate performance report', () => {
      const store = useMindMapStore.getState()
      
      // Run comprehensive performance tests
      const testCases = [10, 25, 50, 75, 100, 150, 200]
      const results: Array<{
        entryCount: number
        createTime: string
        connectionCount: number
        connectionTime: string
        selectTime: string
        updateTime: string
        totalTime: string
      }> = []
      
      testCases.forEach(count => {
        store.clearMindMap()
        
        // Measure entry creation
        const createStart = performance.now()
        const entries = createManyEntries(count)
        entries.forEach(entry => store.addEntry(entry))
        const createTime = performance.now() - createStart
        
        // Measure connection creation
        const connections = createConnections(entries, 0.3)
        const connStart = performance.now()
        connections.forEach(conn => store.addConnection(conn))
        const connTime = performance.now() - connStart
        
        // Measure selection performance
        const selectStart = performance.now()
        for (let i = 0; i < 50; i++) {
          store.selectEntry(entries[i % entries.length].id)
        }
        const selectTime = performance.now() - selectStart
        
        // Measure update performance
        const updateStart = performance.now()
        entries.slice(0, Math.min(20, entries.length)).forEach(entry => {
          store.updateEntry(entry.id, { summary: `Updated ${entry.id}` })
        })
        const updateTime = performance.now() - updateStart
        
        results.push({
          entryCount: count,
          createTime: createTime.toFixed(2),
          connectionCount: connections.length,
          connectionTime: connTime.toFixed(2),
          selectTime: selectTime.toFixed(2),
          updateTime: updateTime.toFixed(2),
          totalTime: (createTime + connTime + selectTime + updateTime).toFixed(2)
        })
      })
      
      console.table(results)
      
      // Check 60 FPS target (16.67ms per frame)
      const targetEntry = results.find(r => r.entryCount === 50)
      if (targetEntry) {
        const opsPerFrame = 16.67 / (parseFloat(targetEntry.selectTime) / 50)
        console.log(`At 50 entries: Can handle ${opsPerFrame.toFixed(1)} selections per frame`)
        expect(opsPerFrame).toBeGreaterThan(1) // Should handle at least 1 operation per frame
      }
    })
  })
})